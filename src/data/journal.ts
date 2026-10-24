import { DailyFormEntry, validateDaily } from "./daily-form";
export const formLabels = [
  "Svært dårlig",
  "Dårlig",
  "Middels",
  "God",
  "Svært god",
] as const;
export const workoutTypes = [
  "Gåtur",
  "Løping",
  "Sykling",
  "Styrke",
  "Annet",
] as const;
// Legacy decoding only: retained so old local journals remain readable.
const glucoseContexts = [
  "Ikke angitt",
  "Fastende",
  "Før måltid",
  "Etter måltid",
  "Annet",
] as const;
export type WorkoutType = (typeof workoutTypes)[number];
type BaseEntry = { id: string; date: string; note: string };
export type FormEntry = BaseEntry & { kind: "form"; rating: number };
export type GlucoseEntry = BaseEntry & {
  kind: "glucose";
  value: number;
  context: (typeof glucoseContexts)[number];
};
export type WorkoutEntry = BaseEntry & {
  kind: "workout";
  activity: WorkoutType;
  startedAt: string;
  endedAt: string;
  seconds: number;
};
export type JournalEntry =
  FormEntry | DailyFormEntry | GlucoseEntry | WorkoutEntry;
export type ActiveWorkout = {
  id: string;
  startedAt: string;
  activity: WorkoutType;
  note: string;
};
export type Journal = {
  version: 1;
  entries: JournalEntry[];
  active?: ActiveWorkout;
};
export const emptyJournal = (): Journal => ({ version: 1, entries: [] });
export const makeLogId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
function validNote(value: unknown): value is string {
  return typeof value === "string" && value.length <= 500;
}
export function validateEntry(entry: JournalEntry) {
  if (
    typeof entry.id !== "string" ||
    !entry.id ||
    entry.id.length > 100 ||
    !validDate(entry.date) ||
    !validNote(entry.note)
  )
    throw new Error("Registreringen har ugyldig dato eller notat.");
  if (entry.kind === "dailyForm") {
    validateDaily(entry);
    return;
  }
  if (
    entry.kind === "form" &&
    Number.isInteger(entry.rating) &&
    entry.rating >= 1 &&
    entry.rating <= 5
  )
    return;
  if (
    entry.kind === "glucose" &&
    Number.isFinite(entry.value) &&
    entry.value > 0 &&
    entry.value <= 1000 &&
    glucoseContexts.includes(entry.context)
  )
    return;
  if (
    entry.kind === "workout" &&
    workoutTypes.includes(entry.activity) &&
    validDate(entry.startedAt) &&
    validDate(entry.endedAt) &&
    entry.seconds >= 1 &&
    Number.isFinite(entry.seconds) &&
    +new Date(entry.endedAt) >= +new Date(entry.startedAt) &&
    Math.abs(
      entry.seconds -
        (+new Date(entry.endedAt) - +new Date(entry.startedAt)) / 1000,
    ) < 1
  )
    return;
  throw new Error("Registreringen inneholder ugyldige verdier.");
}
export function decodeJournal(raw: string | null): Journal {
  if (!raw) return emptyJournal();
  try {
    const value = JSON.parse(raw) as Journal;
    if (
      value.version !== 1 ||
      !Array.isArray(value.entries) ||
      value.entries.length > 10000
    )
      throw new Error();
    const ids = new Set<string>();
    const days = new Set<string>();
    value.entries.forEach((entry) => {
      validateEntry(entry);
      if (entry.kind === "dailyForm") {
        if (days.has(entry.day)) throw new Error();
        days.add(entry.day);
      }
      if (ids.has(entry.id)) throw new Error();
      ids.add(entry.id);
    });
    if (
      value.active &&
      (!value.active.id ||
        !validDate(value.active.startedAt) ||
        !validNote(value.active.note) ||
        !workoutTypes.includes(value.active.activity))
    )
      throw new Error();
    return value;
  } catch {
    throw new Error(
      "Loggen kunne ikke leses. Lagrede registreringer er beholdt; prøv å laste på nytt.",
    );
  }
}
export function elapsedSeconds(start: string, now = new Date()) {
  return Math.max(0, Math.floor((+now - +new Date(start)) / 1000));
}
export function timerLabel(seconds: number) {
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    rest = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}
export function addEntry(state: Journal, entry: JournalEntry): Journal {
  validateEntry(entry);
  if (entry.kind === "dailyForm") return upsertDailyForm(state, entry);
  if (state.entries.some((row) => row.id === entry.id)) return state;
  if (state.entries.length >= 10000)
    throw new Error(
      "Loggen er full. Slett noen eldre registreringer før du legger til flere.",
    );
  return {
    ...state,
    entries: [entry, ...state.entries].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
  };
}
export function upsertDailyForm(
  state: Journal,
  entry: DailyFormEntry,
): Journal {
  validateEntry(entry);
  const existing = state.entries.find(
    (row): row is DailyFormEntry =>
      row.kind === "dailyForm" && row.day === entry.day,
  );
  const next = existing
    ? {
        ...entry,
        id: existing.id,
        date: existing.date,
        createdAt: existing.createdAt,
      }
    : entry;
  if (
    state.entries.some(
      (row) =>
        row.id === next.id &&
        !(row.kind === "dailyForm" && row.day === entry.day),
    )
  )
    throw new Error("Registrerings-ID er allerede brukt av en annen logg.");
  if (!existing && state.entries.length >= 10000)
    throw new Error("Loggen er full. Slett eldre registreringer først.");
  return {
    ...state,
    entries: [
      next,
      ...state.entries.filter(
        (row) => !(row.kind === "dailyForm" && row.day === entry.day),
      ),
    ].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
export function beginWorkout(state: Journal, active: ActiveWorkout): Journal {
  if (state.active)
    throw new Error(
      "Du har allerede en pågående treningsøkt. Avslutt den i Form først.",
    );
  if (
    !active.id ||
    !validDate(active.startedAt) ||
    !validNote(active.note) ||
    !workoutTypes.includes(active.activity)
  )
    throw new Error("Treningsøkten inneholder ugyldige verdier.");
  return { ...state, active };
}
export function finishWorkout(state: Journal, now = new Date()): Journal {
  const active = state.active;
  if (!active) throw new Error("Ingen treningsøkt er startet.");
  const seconds = elapsedSeconds(active.startedAt, now);
  if (seconds < 1)
    throw new Error("Økten må vare minst ett sekund før den lagres.");
  const next = addEntry(state, {
    id: active.id,
    kind: "workout",
    date: active.startedAt,
    note: active.note,
    activity: active.activity,
    startedAt: active.startedAt,
    endedAt: now.toISOString(),
    seconds,
  });
  const { active: _, ...finished } = next;
  return finished;
}
export function createJournalRepository(storage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
}) {
  const key = "vital.journal.v1";
  let queue: Promise<unknown> = Promise.resolve();
  const load = async () => decodeJournal(await storage.getItem(key));
  return {
    load,
    mutate(change: (state: Journal) => Journal) {
      const task = queue.then(async () => {
        const current = await load(),
          next = change(current);
        await storage.setItem(key, JSON.stringify(next));
        return next;
      });
      queue = task.then(
        () => undefined,
        () => undefined,
      );
      return task;
    },
  };
}
