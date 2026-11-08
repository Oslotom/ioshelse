import { addDays, Reading, startOfDay } from "./models";
/** Fictional example series only; never a user's measured weight. */
export function exampleWeight(now = new Date()): Reading[] {
  const today = startOfDay(now);
  return Array.from({ length: 90 }, (_, index) => ({
    date: addDays(today, index - 89).toISOString(),
    value: Math.round((78.8 - index * 0.018 + Math.sin(index * 1.7) * 0.25) * 10) / 10,
    source: "Eksempeldata",
  }));
}
