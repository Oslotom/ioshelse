import { JournalEntry } from "./journal";
import { dailyEntries, dailyScore, dayKey } from "./daily-form";
import { Snapshot, addDays, inRange, sleepDuration, startOfDay, sum } from "./models";
import { nightSleep } from "./sleep";
import { monthlyWorkoutCount } from "./journal-stats";
export function percentTrend(current?: number, previous?: number) {
  return current !== undefined && previous !== undefined && previous > 0 ? (current - previous) / previous * 100 : undefined;
}
export function kpiTrends(data: Snapshot, entries: JournalEntry[], now = new Date()) {
  const today = startOfDay(now), yesterday = addDays(today, -1), before = addDays(today, -2);
  const steps = (start: Date, end: Date) => { const rows = inRange(data.steps, start, end); return rows.length ? sum(rows) : undefined; };
  const forms = dailyEntries(entries), current = forms.find((entry) => entry.day === dayKey(today)), previous = forms.find((entry) => entry.day === dayKey(yesterday));
  const sleep = sleepDuration(nightSleep(data.sleep, today)), priorSleep = sleepDuration(nightSleep(data.sleep, yesterday));
  const previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, 1, now.getHours(), now.getMinutes(), now.getSeconds());
  previousEnd.setDate(Math.min(now.getDate(), new Date(now.getFullYear(), now.getMonth(), 0).getDate()));
  return {
    steps: percentTrend(steps(yesterday, today), steps(before, yesterday)),
    form: percentTrend(current ? dailyScore(current) : undefined, previous ? dailyScore(previous) : undefined),
    sleep: percentTrend(sleep > 0 ? sleep : undefined, priorSleep > 0 ? priorSleep : undefined),
    workouts: percentTrend(monthlyWorkoutCount(entries, now), monthlyWorkoutCount(entries, previousEnd)),
  };
}
