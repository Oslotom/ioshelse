import { addDays, startOfDay } from "./models";
export const dailyMetrics = [
  {
    key: "energy",
    label: "Energi",
    icon: "flash-outline",
    low: "Helt utslitt",
    high: "Full av energi",
  },
  {
    key: "sleepQuality",
    label: "Søvnkvalitet",
    icon: "moon-outline",
    low: "Svært dårlig",
    high: "Svært god",
  },
  {
    key: "mood",
    label: "Humør",
    icon: "happy-outline",
    low: "Svært dårlig",
    high: "Svært godt",
  },
  {
    key: "stress",
    label: "Stress",
    icon: "leaf-outline",
    low: "Helt avslappet",
    high: "Ekstremt stresset",
  },
  {
    key: "physical",
    label: "Kroppslig form",
    icon: "body-outline",
    low: "Tung, stiv og sliten",
    high: "Lett, sterk og uthvilt",
  },
  {
    key: "digestion",
    label: "Mage og fordøyelse",
    icon: "nutrition-outline",
    low: "Store plager",
    high: "Ingen plager",
  },
] as const;
export type MetricKey = (typeof dailyMetrics)[number]["key"];
export type DailyValues = Record<MetricKey, number>;
export const symptomOptions = [
  "Hodepine",
  "Utmattelse",
  "Hjernetåke",
  "Stivhet eller smerter",
  "Oppblåst mage",
  "Utslett eller kløe",
  "Lysfølsomhet",
  "Allergisymptomer",
] as const;
export type Symptom = (typeof symptomOptions)[number];
export type DailyFormEntry = {
  id: string;
  kind: "dailyForm";
  date: string;
  day: string;
  note: string;
  metrics: DailyValues;
  symptoms: Symptom[];
  createdAt: string;
  updatedAt: string;
};
export const defaultDailyValues = (): DailyValues => ({
  energy: 5,
  sleepQuality: 5,
  mood: 5,
  stress: 5,
  physical: 5,
  digestion: 5,
});
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dayDate(day: string) {
  return new Date(`${day}T12:00:00`);
}
export function validDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(+dayDate(value)) &&
    dayKey(dayDate(value)) === value
  );
}
export function validateDaily(entry: DailyFormEntry) {
  if (
    !validDay(entry.day) ||
    !entry.metrics ||
    dailyMetrics.some(
      ({ key }) =>
        !Number.isInteger(entry.metrics[key]) ||
        entry.metrics[key] < 1 ||
        entry.metrics[key] > 10,
    ) ||
    !Array.isArray(entry.symptoms) ||
    entry.symptoms.length > 8 ||
    new Set(entry.symptoms).size !== entry.symptoms.length ||
    entry.symptoms.some((s) => !symptomOptions.includes(s)) ||
    !Number.isFinite(Date.parse(entry.createdAt)) ||
    !Number.isFinite(Date.parse(entry.updatedAt))
  )
    throw new Error(
      "Dagsformen må ha en gyldig dato, seks verdier fra 1 til 10 og gyldige symptomer.",
    );
}
export function dailyScore(entry: DailyFormEntry) {
  return (
    dailyMetrics.reduce(
      (total, { key }) =>
        total +
        (key === "stress" ? 11 - entry.metrics[key] : entry.metrics[key]),
      0,
    ) / 6
  );
}
export function dailyEntries(
  entries: readonly { kind: string }[],
): DailyFormEntry[] {
  return (
    entries.filter((e) => e.kind === "dailyForm") as DailyFormEntry[]
  ).sort((a, b) => a.day.localeCompare(b.day));
}
export function metricMean(entries: DailyFormEntry[], key: MetricKey) {
  return entries.length
    ? entries.reduce((sum, entry) => sum + entry.metrics[key], 0) /
        entries.length
    : undefined;
}
export function scoreMean(entries: DailyFormEntry[]) {
  return entries.length
    ? entries.reduce((sum, entry) => sum + dailyScore(entry), 0) /
        entries.length
    : undefined;
}
export function previousSeven(entries: DailyFormEntry[], day: string) {
  const start = dayKey(addDays(dayDate(day), -7));
  return entries.filter((e) => e.day >= start && e.day < day);
}
export type DailyPeriod = "7 dager" | "30 dager" | "90 dager" | "Hele perioden";
export const dailyPeriods: DailyPeriod[] = [
  "7 dager",
  "30 dager",
  "90 dager",
  "Hele perioden",
];
export function dailyWindow(
  entries: DailyFormEntry[],
  period: DailyPeriod,
  now = new Date(),
) {
  const end = dayKey(now),
    start =
      period === "Hele perioden"
        ? "0000-00-00"
        : dayKey(addDays(startOfDay(now), 1 - parseInt(period)));
  return entries.filter((e) => e.day >= start && e.day <= end);
}
export function compareDaily(
  entries: DailyFormEntry[],
  days: number,
  now = new Date(),
) {
  const end = dayKey(now),
    start = dayKey(addDays(startOfDay(now), -days)),
    prior = dayKey(addDays(startOfDay(now), -days * 2));
  const current = entries.filter((e) => e.day >= start && e.day < end),
    previous = entries.filter((e) => e.day >= prior && e.day < start);
  if (current.length < 3 || previous.length < 3) return;
  return {
    delta: scoreMean(current)! - scoreMean(previous)!,
    current: current.length,
    previous: previous.length,
  };
}
export function dailyCorrelation(
  entries: DailyFormEntry[],
  a: MetricKey,
  b: MetricKey,
) {
  if (a === b || entries.length < 7) return;
  const x = metricMean(entries, a)!,
    y = metricMean(entries, b)!;
  let numerator = 0,
    dx = 0,
    dy = 0;
  entries.forEach((e) => {
    const xx = e.metrics[a] - x,
      yy = e.metrics[b] - y;
    numerator += xx * yy;
    dx += xx * xx;
    dy += yy * yy;
  });
  if (!dx || !dy) return;
  return Math.max(-1, Math.min(1, numerator / Math.sqrt(dx * dy)));
}
export function metricTone(key: MetricKey, value: number) {
  const direction = key === "stress" ? 11 - value : value;
  return direction <= 3 ? "#DE6475" : direction <= 6 ? "#C58A37" : "#299C88";
}
export function strongestDailyCorrelation(entries: DailyFormEntry[]) {
  let best:
    { a: MetricKey; b: MetricKey; r: number; count: number } | undefined;
  dailyMetrics.forEach((a, index) =>
    dailyMetrics.slice(index + 1).forEach((b) => {
      const r = dailyCorrelation(entries, a.key, b.key);
      if (r !== undefined && (!best || Math.abs(r) > Math.abs(best.r)))
        best = { a: a.key, b: b.key, r, count: entries.length };
    }),
  );
  return best;
}
