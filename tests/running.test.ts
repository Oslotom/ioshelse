import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addRunPoint,
  analyseRun,
  emptyRun,
  finalRun,
  paceLabel,
  runDistance,
  runSeconds,
  toggleRunPause,
  validateRun,
} from "../src/data/running";
import {
  beginWorkout,
  decodeJournal,
  emptyJournal,
  finishWorkout,
} from "../src/data/journal";
const start = new Date("2026-10-25T10:00:00Z");
const point = (seconds: number, latitude = 59.9, accuracy = 5) => ({
  latitude,
  longitude: 10.7,
  timestamp: +start + seconds * 1000,
  accuracy,
});
test("GPS rejects inaccurate, duplicate and implausible points without inventing distance", () => {
  let run = addRunPoint(emptyRun(true), point(0), false);
  assert.equal(addRunPoint(run, point(1, 59.9001, 90), false), run);
  assert.equal(addRunPoint(run, point(0, 59.9001), false), run);
  assert.equal(addRunPoint(run, point(1, 60.9), false), run);
  run = addRunPoint(run, point(10, 59.9001), false);
  assert.ok(runDistance(run) > 10 && runDistance(run) < 12);
  assert.equal(addRunPoint(emptyRun(false), point(0), false).points.length, 0);
});
test("GPS gaps and resumed segments never add a straight-line shortcut", () => {
  let run = addRunPoint(emptyRun(true), point(0), false);
  run = addRunPoint(run, point(10, 59.9001), false);
  const distance = runDistance(run);
  run = addRunPoint(run, point(80, 60), false);
  run = addRunPoint(run, point(90, 61), true);
  assert.equal(runDistance(run), distance);
  assert.deepEqual(
    run.points.map((p) => p.segment),
    [0, 0, 1, 2],
  );
});
test("pauses freeze active time, survive restore and are deducted after finishing", () => {
  let run = toggleRunPause(emptyRun(true), new Date(+start + 60000));
  assert.equal(
    runSeconds(start.toISOString(), run, new Date(+start + 120000)),
    60,
  );
  assert.equal(addRunPoint(run, point(90), false), run);
  run = toggleRunPause(run, new Date(+start + 120000));
  assert.equal(run.pausedMs, 60000);
  assert.equal(
    runSeconds(start.toISOString(), run, new Date(+start + 180000)),
    120,
  );
  run = toggleRunPause(run, new Date(+start + 180000));
  const state = beginWorkout(emptyJournal(), {
    id: "run",
    activity: "Løping",
    startedAt: start.toISOString(),
    note: "Rolig tur",
    run,
  });
  assert.deepEqual(decodeJournal(JSON.stringify(state)), state);
  const finished = finishWorkout(state, new Date(+start + 240000));
  const entry = finished.entries[0]!;
  assert.equal(entry.kind, "workout");
  if (entry.kind !== "workout") return;
  assert.equal(entry.seconds, 240);
  assert.equal(entry.run!.pausedMs, 120000);
  assert.equal(entry.run!.pausedAt, undefined);
  assert.equal(
    runSeconds(entry.startedAt, entry.run!, new Date(entry.endedAt)),
    120,
  );
  assert.deepEqual(decodeJournal(JSON.stringify(finished)), finished);
  assert.equal(finalRun(run, new Date(+start + 240000)).pausedMs, 120000);
});
test("pace needs measured distance and valid route coordinates", () => {
  assert.equal(paceLabel(360, 1000), "6:00");
  assert.equal(paceLabel(60, 0), "–:––");
  assert.throws(() =>
    validateRun({
      ...emptyRun(true),
      points: [{ ...point(0, 100), segment: 0 }],
    }),
  );
});

test("run analysis apportions kilometre boundaries and excludes GPS gaps", () => {
  const latitude = (metres: number) =>
    59.9 + ((metres / 6371000) * 180) / Math.PI;
  const run = emptyRun(true);
  run.points = Array.from({ length: 5 }, (_, i) => ({
    ...point(i * 30, latitude(i * 300)),
    segment: 0,
  }));
  run.points.push(
    { ...point(500, 60), segment: 1 },
    { ...point(520, 60 + ((200 / 6371000) * 180) / Math.PI), segment: 1 },
  );
  const result = analyseRun(run);
  assert.ok(Math.abs(result.distance - 1400) < 0.01);
  assert.equal(result.gpsSeconds, 140);
  assert.equal(result.segments, 2);
  assert.equal(result.pace.length, 5);
  assert.equal(result.splits.length, 2);
  assert.ok(Math.abs(result.splits[0]!.seconds - 100) < 0.01);
  assert.ok(Math.abs(result.splits[1]!.distance - 400) < 0.01);
  assert.ok(
    Math.abs(
      result.splits.reduce((sum, split) => sum + split.seconds, 0) - 140,
    ) < 0.01,
  );
  assert.deepEqual(analyseRun(emptyRun(false)).splits, []);
});
