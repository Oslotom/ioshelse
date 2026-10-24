import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  change,
  inRange,
  monthly,
  movingAverage,
  pulseSeries,
  Reading,
  sleepDuration,
  startOfDay,
  sum,
  weeklyChange,
} from "../src/data/models";
import { makeDemo } from "../src/data/demo";
const base = new Date("2026-10-24T12:00:00Z");
const r = (date: Date, value: number): Reading => ({
  date: date.toISOString(),
  value,
});
test("hourly demo totals agree with today and no future samples exist", () => {
  for (const now of [base, new Date("2026-10-24T00:00:01Z")]) {
    const data = makeDemo(now);
    assert.equal(data.steps.length, 400);
    assert.ok(Math.abs(sum(data.hourly) - data.steps.at(-1)!.value) < 0.00001);
    assert.ok(data.pulse.every((r) => new Date(r.date) <= now));
    assert.ok(data.sleep.every((s) => new Date(s.end) <= now));
  }
});
test("sleep union excludes awake intervals and deduplicates overlaps", () => {
  const iso = (hours: number) =>
    new Date(+base + hours * 3600000).toISOString();
  assert.equal(
    sleepDuration([
      { start: iso(0), end: iso(2), stage: "Lett", asleep: true },
      { start: iso(1), end: iso(3), stage: "Dyp", asleep: true },
      { start: iso(0), end: iso(5), stage: "Våken", asleep: false },
    ]),
    3 * 3600,
  );
});
test("pulse line splits across a sensor gap and sorts timestamps", () => {
  const samples = [
    r(base, 70),
    r(new Date(+base + 3600000), 80),
    r(new Date(+base + 300000), 72),
  ];
  assert.deepEqual(
    pulseSeries(samples).map((g) => g.length),
    [2, 1],
  );
});
test("half-open intervals exclude next midnight", () => {
  const today = startOfDay(base),
    tomorrow = addDays(today, 1);
  assert.equal(
    sum(inRange([r(today, 100), r(tomorrow, 200)], today, tomorrow)),
    100,
  );
});
test("moving average needs seven observed calendar days", () => {
  const rows = Array.from({ length: 7 }, (_, i) =>
    r(addDays(startOfDay(base), i), i + 1),
  );
  assert.deepEqual(
    movingAverage(rows).map((r) => r.value),
    [4],
  );
  assert.equal(movingAverage(rows.slice(1)).length, 0);
});
test("weekly comparison excludes incomplete today and needs complete prior week", () => {
  const today = startOfDay(base),
    rows = Array.from({ length: 14 }, (_, i) =>
      r(addDays(today, i - 14), i < 7 ? 100 : 112),
    );
  assert.equal(weeklyChange([...rows, r(today, 999999)], base), 12);
  assert.equal(weeklyChange(rows.slice(1), base), undefined);
});
test("zero baseline has no invented percentage", () => {
  assert.equal(change(100, 0), undefined);
  assert.equal(change(112, 100), 12);
});
test("monthly sum preserves period total", () => {
  const data = makeDemo(base),
    months = monthly(data.steps);
  assert.equal(sum(months), sum(data.steps));
});
test("calendar dates remain at midnight across Oslo daylight-saving change", () => {
  const before = new Date(2026, 9, 24),
    after = addDays(before, 3);
  assert.equal(after.getDate(), 27);
  assert.equal(after.getHours(), 0);
});
test("dense pulse plots retain original samples, endpoints and local extremes", async () => {
  const { plotSamples } = await import("../src/data/models");
  const readings = Array.from({ length: 10000 }, (_, i) =>
    r(new Date(+base + i * 1000), i === 4321 ? 199 : 60 + (i % 30)),
  );
  const plot = plotSamples(readings);
  assert.ok(plot.length <= 960);
  assert.equal(plot[0], readings[0]);
  assert.equal(plot.at(-1), readings.at(-1));
  assert.ok(plot.includes(readings[4321]!));
  assert.ok(plot.every((r) => readings.includes(r)));
});
