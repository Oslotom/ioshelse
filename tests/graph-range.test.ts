import { test } from "node:test";
import assert from "node:assert/strict";
import { graphRange, compareGraphSteps } from "../src/data/graph-range";
import { addDays, inRange, Reading, startOfDay } from "../src/data/models";
const date = new Date(2026, 9, 27, 14);
const reading = (day: Date, value: number): Reading => ({
  date: day.toISOString(),
  value,
});
test("day, week and month are half-open calendar intervals ending on chosen date", () => {
  for (const [period, days] of [
    ["Dag", 1],
    ["Uke", 7],
    ["Måned", 30],
  ] as const) {
    const range = graphRange(date, period);
    assert.equal(range.days, days);
    assert.equal(+range.end, +addDays(startOfDay(date), 1));
    assert.equal(+range.start, +addDays(startOfDay(date), 1 - days));
    assert.equal(
      inRange(
        [reading(range.start, 1), reading(range.end, 2)],
        range.start,
        range.end,
      ).length,
      1,
    );
  }
});
test("calendar week stays on local midnight across Oslo DST", () => {
  const range = graphRange(date, "Uke");
  assert.equal(range.start.getDate(), 21);
  assert.equal(range.start.getHours(), 0);
  assert.equal(range.end.getDate(), 28);
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Oslo")
    assert.equal((+range.end - +range.start) / 3600000, 169);
});
test("comparison drops incomplete today and requires all historical days", () => {
  const now = new Date(2026, 9, 27, 12),
    range = graphRange(now, "Uke");
  const rows = Array.from({ length: 12 }, (_, i) =>
    reading(addDays(range.start, i - 6), i < 6 ? 100 : 112),
  );
  rows.push(reading(startOfDay(now), 999999));
  assert.deepEqual(compareGraphSteps(rows, range, now), {
    percent: 12,
    days: 6,
  });
  assert.equal(compareGraphSteps(rows.slice(1), range, now), undefined);
});
test("today-only and zero baselines never invent a comparison", () => {
  assert.equal(compareGraphSteps([], graphRange(date, "Dag"), date), undefined);
  const range = graphRange(addDays(date, -2), "Dag"),
    rows = [reading(range.start, 12), reading(addDays(range.start, -1), 0)];
  assert.equal(compareGraphSteps(rows, range, date), undefined);
});
