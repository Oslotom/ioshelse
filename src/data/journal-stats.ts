import { FormEntry, GlucoseEntry, JournalEntry } from "./journal";
import { addDays, startOfDay } from "./models";

export function journalStats(entries: JournalEntry[], now = new Date()) {
  const today = startOfDay(now),
    start = addDays(today, -6);
  const available = entries.filter((entry) => +new Date(entry.date) <= +now);
  const forms = available.filter(
    (entry): entry is FormEntry =>
      entry.kind === "form" && new Date(entry.date) >= start,
  );
  let workoutSeconds = 0,
    workoutCount = 0;
  for (const entry of available) {
    if (entry.kind !== "workout" || new Date(entry.endedAt) > now) continue;
    const seconds = Math.max(
      0,
      Math.floor(
        (Math.min(+now, +new Date(entry.endedAt)) -
          Math.max(+start, +new Date(entry.startedAt))) /
          1000,
      ),
    );
    if (seconds > 0) {
      workoutSeconds += seconds;
      workoutCount++;
    }
  }
  const glucose = available
    .filter((entry): entry is GlucoseEntry => entry.kind === "glucose")
    .reduce<GlucoseEntry | undefined>(
      (latest, entry) => (!latest || entry.date > latest.date ? entry : latest),
      undefined,
    );
  return {
    todayCount: available.filter((entry) => new Date(entry.date) >= today)
      .length,
    formAverage: forms.length
      ? forms.reduce((sum, entry) => sum + entry.rating, 0) / forms.length
      : undefined,
    formCount: forms.length,
    workoutSeconds,
    workoutCount,
    latestGlucose: glucose,
  };
}
