import { dailyEntries, dailyScore, dayKey } from "./daily-form";
import { FormEntry, JournalEntry } from "./journal";
import { addDays, startOfDay } from "./models";

export function journalStats(entries: JournalEntry[], now = new Date()) {
  const today = startOfDay(now),
    start = addDays(today, -6);
  const available = entries.filter((entry) => entry.kind !== "glucose" && +new Date(entry.date) <= +now);
  const newForms = dailyEntries(available).filter(
    (entry) => entry.day >= dayKey(start) && entry.day <= dayKey(now),
  );
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
  return {
    todayCount: available.filter((entry) => new Date(entry.date) >= today)
      .length,
    formAverage: forms.length
      ? forms.reduce((sum, entry) => sum + entry.rating, 0) / forms.length
      : undefined,
    formCount: forms.length,
    dailyFormAverage: newForms.length
      ? newForms.reduce((sum, entry) => sum + dailyScore(entry), 0) /
        newForms.length
      : undefined,
    dailyFormCount: newForms.length,
    workoutSeconds,
    workoutCount,
  };
}
