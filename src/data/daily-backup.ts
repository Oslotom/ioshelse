import { DailyFormEntry, dayKey, validateDaily } from "./daily-form";
import { Journal, validateEntry } from "./journal";
export function exportDailyJSON(entries: DailyFormEntry[], now = new Date()) {
  return JSON.stringify(
    {
      format: "vital.daily-form",
      version: 1,
      exportedAt: now.toISOString(),
      entries,
    },
    null,
    2,
  );
}
export function parseDailyJSON(
  raw: string,
  now = new Date(),
): DailyFormEntry[] {
  try {
    if (raw.length > 10 * 1024 * 1024) throw new Error();
    const parsed = JSON.parse(raw);
    if (
      parsed.format !== "vital.daily-form" ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.entries) ||
      parsed.entries.length > 10000
    )
      throw new Error();
    const days = new Set<string>(),
      ids = new Set<string>();
    return parsed.entries.map((entry: DailyFormEntry) => {
      if (entry.kind !== "dailyForm") throw new Error();
      validateEntry(entry);
      validateDaily(entry);
      if (entry.day > dayKey(now) || days.has(entry.day) || ids.has(entry.id))
        throw new Error();
      days.add(entry.day);
      ids.add(entry.id);
      return {
        id: entry.id,
        kind: "dailyForm",
        date: entry.date,
        day: entry.day,
        note: entry.note,
        metrics: {
          energy: entry.metrics.energy,
          sleepQuality: entry.metrics.sleepQuality,
          mood: entry.metrics.mood,
          stress: entry.metrics.stress,
          physical: entry.metrics.physical,
          digestion: entry.metrics.digestion,
        },
        symptoms: [...entry.symptoms],
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      };
    });
  } catch {
    throw new Error(
      "JSON-filen er ikke en gyldig VITAL-eksport av dagsform. Ingenting er importert.",
    );
  }
}
export function mergeDailyBackup(
  state: Journal,
  entries: DailyFormEntry[],
): Journal {
  const days = new Set(
    state.entries
      .filter((row) => row.kind === "dailyForm")
      .map((row) => row.day),
  );
  const ids = new Set(state.entries.map((row) => row.id));
  const added: DailyFormEntry[] = [];
  for (const entry of entries) {
    validateEntry(entry);
    if (days.has(entry.day)) continue;
    if (ids.has(entry.id))
      throw new Error(
        "En registrerings-ID kolliderer med en eksisterende logg. Importen ble avbrutt.",
      );
    days.add(entry.day);
    ids.add(entry.id);
    added.push(entry);
  }
  if (state.entries.length + added.length > 10000)
    throw new Error(
      "Importen vil overstige grensen på 10 000 registreringer. Ingenting er importert.",
    );
  return {
    ...state,
    entries: [...added, ...state.entries].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  };
}
