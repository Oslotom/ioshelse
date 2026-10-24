import { test } from "node:test";
import assert from "node:assert/strict";
import { nightSleep, sleepHistory } from "../src/data/sleep";
import { sleepDuration, pulseSeries } from "../src/data/models";
const date = new Date(2026, 9, 24),
  iso = (day: number, hour: number) =>
    new Date(2026, 9, day, hour).toISOString();
test("a night clips crossing intervals at local noon and excludes adjacent nights", () => {
  const segments = [
    { start: iso(23, 11), end: iso(23, 13), stage: "Lett", asleep: true },
    { start: iso(24, 11), end: iso(24, 13), stage: "Dyp", asleep: true },
    { start: iso(24, 22), end: iso(25, 6), stage: "Lett", asleep: true },
  ];
  const night = nightSleep(segments, date);
  assert.equal(night.length, 2);
  assert.equal(sleepDuration(night), 7200);
});
test("overlapping sources and awake samples do not inflate nightly total", () => {
  const segments = [
    { start: iso(23, 22), end: iso(24, 6), stage: "Søvn", asleep: true },
    { start: iso(23, 23), end: iso(24, 5), stage: "Lett", asleep: true },
    { start: iso(24, 6), end: iso(24, 7), stage: "Våken", asleep: false },
  ];
  assert.equal(sleepDuration(nightSleep(segments, date)), 8 * 3600);
});
test("seven-night history preserves missing nights without creating sleep", () => {
  const history = sleepHistory(
    [{ start: iso(23, 22), end: iso(24, 6), stage: "Søvn", asleep: true }],
    date,
  );
  assert.equal(history.length, 7);
  assert.equal(history.filter((n) => n.seconds > 0).length, 1);
  assert.equal(history.at(-1)!.seconds, 8 * 3600);
});

// A 25-hour calendar day is continuous; an unrecorded night remains a gap.
test("nightly trend connects adjacent DST dates but preserves missing nights", () => {
  const readings = [
    { date: "2026-10-24T22:00:00Z", value: 7 },
    { date: "2026-10-25T23:00:00Z", value: 8 },
    { date: "2026-10-27T23:00:00Z", value: 6 },
  ];
  assert.deepEqual(pulseSeries(readings, 36 * 3600000).map((group) => group.length), [2, 1]);
  assert.equal(pulseSeries(readings).length, 3);
});
