export type Reading = { date: string; value: number; source?: string };
export type Sleep = {
  start: string;
  end: string;
  stage: string;
  asleep: boolean;
};
export type Workout = {
  id: string;
  date: string;
  minutes: number;
  name: string;
};
export type Snapshot = {
  steps: Reading[];
  hourly: Reading[];
  distance: Reading[];
  energy: Reading[];
  exercise: Reading[];
  pulse: Reading[];
  resting: Reading[];
  hrv: Reading[];
  sleep: Sleep[];
  workouts: Workout[];
};
export const emptySnapshot = (): Snapshot => ({
  steps: [],
  hourly: [],
  distance: [],
  energy: [],
  exercise: [],
  pulse: [],
  resting: [],
  hrv: [],
  sleep: [],
  workouts: [],
});
export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
export const inRange = (readings: Reading[], start: Date, end: Date) =>
  readings.filter((r) => new Date(r.date) >= start && new Date(r.date) < end);
export const sum = (readings: Reading[]) =>
  readings.reduce((a, r) => a + r.value, 0);
export const mean = (readings: Reading[]) =>
  readings.length ? sum(readings) / readings.length : undefined;
export const change = (current: number, previous: number) =>
  previous > 0 ? ((current - previous) / previous) * 100 : undefined;
export const number = (value: number, digits = 0) =>
  value.toLocaleString("nb-NO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export const dateLabel = (date: string | Date, time = false) =>
  new Date(date).toLocaleString(
    "nb-NO",
    time
      ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short" },
  );
export function dailyMean(readings: Reading[]): Reading[] {
  const groups = new Map<string, Reading[]>();
  readings.forEach((r) => {
    const day = startOfDay(new Date(r.date)).toISOString();
    groups.set(day, [...(groups.get(day) ?? []), r]);
  });
  return [...groups]
    .map(([date, rows]) => ({ date, value: mean(rows)! }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function movingAverage(readings: Reading[]): Reading[] {
  const ordered = [...readings].sort((a, b) => a.date.localeCompare(b.date));
  const result: Reading[] = [];
  let left = 0,
    total = 0;
  for (let right = 0; right < ordered.length; right++) {
    const reading = ordered[right]!,
      cutoff = addDays(startOfDay(new Date(reading.date)), -6);
    total += reading.value;
    while (left <= right && new Date(ordered[left]!.date) < cutoff) {
      total -= ordered[left]!.value;
      left++;
    }
    if (right - left + 1 === 7)
      result.push({ date: reading.date, value: total / 7 });
  }
  return result;
}

export function monthly(readings: Reading[]): Reading[] {
  const groups = new Map<string, number>();
  readings.forEach((r) => {
    const d = new Date(r.date);
    const key = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    groups.set(key, (groups.get(key) ?? 0) + r.value);
  });
  return [...groups]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function sleepDuration(segments: Sleep[]) {
  let total = 0,
    start = 0,
    end = 0;
  segments
    .filter((s) => s.asleep)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))
    .forEach((s) => {
      const a = +new Date(s.start),
        b = +new Date(s.end);
      if (end && a <= end) end = Math.max(end, b);
      else {
        if (end) total += end - start;
        start = a;
        end = b;
      }
    });
  return (total + (end ? end - start : 0)) / 1000;
}
export function pulseSeries(readings: Reading[], maxGap = 15 * 60000): Reading[][] {
  const groups: Reading[][] = [];
  [...readings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((r) => {
      const group = groups.at(-1),
        last = group?.at(-1);
      if (last && +new Date(r.date) - +new Date(last.date) <= maxGap)
        group!.push(r);
      else groups.push([r]);
    });
  return groups;
}
export function weeklyChange(readings: Reading[], now = new Date()) {
  const today = startOfDay(now),
    start = addDays(today, -7);
  const current = inRange(readings, start, today),
    previous = inRange(readings, addDays(start, -7), start);
  return current.length === 7 && previous.length === 7
    ? change(sum(current), sum(previous))
    : undefined;
}
// Render a bounded set of original samples, preserving local extrema. Never invent samples.
export function plotSamples(readings: Reading[], buckets = 240): Reading[] {
  if (readings.length <= buckets * 4) return readings;
  const result: Reading[] = [];
  const stride = readings.length / buckets;
  for (let i = 0; i < buckets; i++) {
    const rows = readings.slice(
      Math.floor(i * stride),
      Math.floor((i + 1) * stride),
    );
    if (!rows.length) continue;
    const lowest = rows.reduce((a, b) => (b.value < a.value ? b : a)),
      highest = rows.reduce((a, b) => (b.value > a.value ? b : a));
    const selected = new Set([rows[0]!, lowest, highest, rows.at(-1)!]);
    result.push(...rows.filter((r) => selected.has(r)));
  }
  return result;
}
