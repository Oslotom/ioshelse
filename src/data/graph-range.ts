import { addDays, inRange, Reading, startOfDay, sum, change } from "./models";
export const graphPeriods = ["Dag", "Uke", "Måned"] as const;
export type GraphPeriod = (typeof graphPeriods)[number];
export function graphRange(date: Date, period: GraphPeriod) {
  const day = startOfDay(date),
    days = period === "Dag" ? 1 : period === "Uke" ? 7 : 30;
  return { start: addDays(day, 1 - days), end: addDays(day, 1), days };
}
export function compareGraphSteps(
  readings: Reading[],
  range: ReturnType<typeof graphRange>,
  now = new Date(),
) {
  const end = new Date(Math.min(+range.end, +startOfDay(now)));
  if (end <= range.start) return;
  const days = Math.round(
    (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
      Date.UTC(
        range.start.getFullYear(),
        range.start.getMonth(),
        range.start.getDate(),
      )) /
      86400000,
  );
  const current = inRange(readings, range.start, end),
    previous = inRange(readings, addDays(range.start, -days), range.start);
  if (current.length !== days || previous.length !== days) return;
  const percent = change(sum(current), sum(previous));
  return percent === undefined ? undefined : { percent, days };
}
