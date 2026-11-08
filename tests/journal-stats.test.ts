import { test } from "node:test";
import assert from "node:assert/strict";
import { journalStats, monthlyWorkoutCount } from "../src/data/journal-stats";
import { JournalEntry } from "../src/data/journal";
import { addDays, startOfDay } from "../src/data/models";
const now = new Date(2026, 9, 24, 12),
  today = startOfDay(now),
  start = addDays(today, -6);
const form = (id: string, date: Date, rating: number): JournalEntry => ({
  id,
  date: date.toISOString(),
  kind: "form",
  rating,
  note: "",
});
test("empty journal has zero known registrations but no invented form or glucose", () => {
  const result = journalStats([], now);
  assert.equal(result.todayCount, 0);
  assert.equal(result.formAverage, undefined);
  assert.equal(result.workoutCount, 0);
});
test("form average uses observed entries in seven calendar days, excluding future and older entries", () => {
  const result = journalStats(
    [
      form("old", addDays(start, -1), 1),
      form("a", start, 3),
      form("b", now, 5),
      form("future", addDays(now, 1), 1),
    ],
    now,
  );
  assert.equal(result.formAverage, 4);
  assert.equal(result.formCount, 2);
  assert.equal(result.todayCount, 1);
});
test("legacy removed measurements are excluded from visible statistics", () => {
  const glucose = (id: string, date: Date, value: number): JournalEntry => ({
    id,
    date: date.toISOString(),
    kind: "glucose",
    value,
    context: "Ikke angitt",
    note: "",
  });
  const result = journalStats(
    [
      glucose("latest", now, 5.2),
      glucose("old", addDays(now, -30), 9.1),
      glucose("future", addDays(now, 1), 6),
    ],
    now,
  );
  assert.equal(result.todayCount, 0);
});
test("completed workout time is clipped at the seven-day boundary", () => {
  const from = new Date(+start - 30 * 60000),
    to = new Date(+start + 30 * 60000);
  const row: JournalEntry = {
    id: "workout",
    kind: "workout",
    date: from.toISOString(),
    startedAt: from.toISOString(),
    endedAt: to.toISOString(),
    seconds: 3600,
    activity: "Gåtur",
    note: "",
  };
  const result = journalStats([row], now);
  assert.equal(result.workoutSeconds, 1800);
  assert.equal(result.workoutCount, 1);
});

test("monthly workout count uses completion date and excludes future and other logs", () => {
  const now = new Date(2026, 10, 8, 12);
  const workout = (id: string, end: Date): JournalEntry => ({ id, kind: "workout", activity: "Løping", date: new Date(+end - 60000).toISOString(), startedAt: new Date(+end - 60000).toISOString(), endedAt: end.toISOString(), seconds: 60, note: "" });
  assert.equal(monthlyWorkoutCount([
    workout("boundary", new Date(2026, 10, 1)),
    workout("previous", new Date(2026, 9, 31, 23, 59)),
    workout("today", now),
    workout("future", new Date(+now + 60000)),
    form("form", now, 4),
  ], now), 2);
  assert.equal(monthlyWorkoutCount([], now), 0);
});
