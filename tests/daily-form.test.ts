import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DailyFormEntry,
  dailyScore,
  defaultDailyValues,
  dayKey,
  dayDate,
  validateDaily,
  dailyEntries,
  dailyWindow,
  previousSeven,
  metricMean,
  dailyCorrelation,
  compareDaily,
  metricTone,
} from "../src/data/daily-form";
import {
  addEntry,
  createJournalRepository,
  decodeJournal,
  emptyJournal,
  upsertDailyForm,
} from "../src/data/journal";
import {
  exportDailyJSON,
  parseDailyJSON,
  mergeDailyBackup,
} from "../src/data/daily-backup";
import { addDays } from "../src/data/models";
const now = new Date("2026-10-24T14:00:00Z");
const entry = (day = "2026-10-24", value = 5): DailyFormEntry => ({
  id: `day-${day}`,
  kind: "dailyForm",
  date: day === "2026-10-24" ? now.toISOString() : dayDate(day).toISOString(),
  day,
  note: "Min dag",
  metrics: {
    energy: value,
    sleepQuality: value,
    mood: value,
    stress: value,
    physical: value,
    digestion: value,
  },
  symptoms: ["Hodepine"],
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
});
test("score weights all six metrics equally and reverses stress exactly", () => {
  const e = entry();
  e.metrics = {
    energy: 10,
    sleepQuality: 10,
    mood: 10,
    stress: 1,
    physical: 10,
    digestion: 10,
  };
  assert.equal(dailyScore(e), 10);
  e.metrics = {
    energy: 1,
    sleepQuality: 1,
    mood: 1,
    stress: 10,
    physical: 1,
    digestion: 1,
  };
  assert.equal(dailyScore(e), 1);
  e.metrics = defaultDailyValues();
  assert.equal(dailyScore(e), 31 / 6);
  assert.equal(metricTone("stress", 10), metricTone("energy", 1));
  assert.equal(metricTone("stress", 1), metricTone("energy", 10));
});
test("all six scores, valid symptoms and real ISO calendar dates are required", () => {
  for (const value of [0, 11, 5.5, NaN]) {
    const e = entry();
    e.metrics.energy = value;
    assert.throws(() => validateDaily(e));
  }
  const missing = entry();
  delete (missing.metrics as Partial<typeof missing.metrics>).mood;
  assert.throws(() => validateDaily(missing));
  const invalid = entry();
  invalid.day = "2026-02-30";
  assert.throws(() => validateDaily(invalid));
  const duplicate = entry();
  duplicate.symptoms = ["Hodepine", "Hodepine"];
  assert.throws(() => validateDaily(duplicate));
});
test("same-date save replaces only the daily entry and preserves its identity", () => {
  let state = addEntry(emptyJournal(), {
    id: "legacy",
    kind: "form",
    date: now.toISOString(),
    rating: 4,
    note: "Behold historikk",
  });
  state = addEntry(state, {
    id: "glucose",
    kind: "glucose",
    date: now.toISOString(),
    value: 5.6,
    context: "Fastende",
    note: "",
  });
  state = upsertDailyForm(state, entry());
  const changed = {
    ...entry(),
    id: "new-id",
    note: "Redigert",
    metrics: { ...entry().metrics, energy: 9 },
    updatedAt: new Date(+now + 60000).toISOString(),
  };
  state = upsertDailyForm(state, changed);
  assert.equal(state.entries.length, 3);
  const daily = dailyEntries(state.entries)[0]!;
  assert.equal(daily.id, entry().id);
  assert.equal(daily.metrics.energy, 9);
  assert.equal(daily.note, "Redigert");
  assert.equal(state.entries.find((e) => e.id === "legacy")!.kind, "form");
  assert.equal(decodeJournal(JSON.stringify(state)).entries.length, 3);
});
test("concurrent same-day submissions are serialized into one complete record", async () => {
  let raw: string | null = null;
  const repo = createJournalRepository({
    getItem: async () => raw,
    setItem: async (_, value) => {
      raw = value;
    },
  });
  await Promise.all([
    repo.mutate((state) => upsertDailyForm(state, entry())),
    repo.mutate((state) =>
      upsertDailyForm(state, { ...entry(), id: "retry", note: "Oppdatert" }),
    ),
  ]);
  assert.equal(dailyEntries((await repo.load()).entries).length, 1);
  assert.equal(dailyEntries((await repo.load()).entries)[0]!.note, "Oppdatert");
});
test("missing days and legacy ratings are excluded from new daily averages", () => {
  const rows = [
    entry("2026-10-17", 3),
    entry("2026-10-23", 7),
    entry("2026-10-24", 10),
  ];
  assert.equal(metricMean(previousSeven(rows, "2026-10-24"), "energy"), 5);
  assert.equal(dailyWindow(rows, "7 dager", now).length, 2);
  assert.equal(metricMean([], "mood"), undefined);
  assert.equal(dailyEntries([{ kind: "form" }]).length, 0);
});
test("week comparison uses matched calendar periods and discloses counts", () => {
  const rows = Array.from({ length: 14 }, (_, i) =>
    entry(dayKey(addDays(new Date(2026, 9, 10, 12), i)), i < 7 ? 3 : 9),
  );
  const comparison = compareDaily(rows, 7, now)!;
  assert.equal(comparison.current, 7);
  assert.equal(comparison.previous, 7);
  assert.ok(comparison.delta > 0);
  assert.equal(compareDaily(rows.slice(-2), 7, now), undefined);
});
test("correlation requires paired variation and never implies causation", () => {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const e = entry(`2026-10-${String(i + 10).padStart(2, "0")}`);
    e.metrics.energy = i + 1;
    e.metrics.mood = 10 - i;
    return e;
  });
  assert.ok(Math.abs(dailyCorrelation(rows, "energy", "mood")! + 1) < 1e-12);
  assert.equal(dailyCorrelation(rows.slice(1), "energy", "mood"), undefined);
  assert.equal(dailyCorrelation(rows, "energy", "stress"), undefined);
});
test("JSON round trip preserves all six metrics, symptoms and notes", () => {
  const e = entry();
  e.symptoms = ["Hodepine", "Hjernetåke", "Lysfølsomhet"];
  e.note = "Ærlig notat: æøå";
  assert.deepEqual(parseDailyJSON(exportDailyJSON([e], now), now), [e]);
});
test("JSON import preserves existing dates and unrelated logs", () => {
  const local = upsertDailyForm(
    addEntry(emptyJournal(), {
      id: "legacy",
      kind: "form",
      date: now.toISOString(),
      rating: 4,
      note: "",
    }),
    entry(),
  );
  const merged = mergeDailyBackup(local, [
    { ...entry(), note: "Skal ikke overskrive" },
    entry("2026-10-23"),
  ]);
  assert.equal(merged.entries.length, 3);
  assert.equal(
    dailyEntries(merged.entries).find((e) => e.day === "2026-10-24")!.note,
    "Min dag",
  );
  assert.equal(local.entries.length, 2);
});
test("invalid JSON, duplicate dates, invalid scores and future dates are rejected atomically", () => {
  assert.throws(() => parseDailyJSON("{bad", now));
  assert.throws(() => parseDailyJSON(exportDailyJSON([entry(), entry()]), now));
  const bad = entry();
  bad.metrics.stress = 99;
  assert.throws(() => parseDailyJSON(exportDailyJSON([bad]), now));
  assert.throws(() =>
    parseDailyJSON(exportDailyJSON([entry("2026-10-25")]), now),
  );
});
test("a rejected JSON merge leaves the stored journal and unrelated logs intact", async () => {
  let raw = JSON.stringify(
    addEntry(emptyJournal(), {
      id: "protected",
      kind: "glucose",
      date: now.toISOString(),
      value: 5.6,
      context: "Fastende",
      note: "Behold",
    }),
  );
  const initial = raw,
    repo = createJournalRepository({
      getItem: async () => raw,
      setItem: async (_, value) => {
        raw = value;
      },
    });
  const incoming = [
    entry("2026-10-22"),
    { ...entry("2026-10-23"), id: "protected" },
  ];
  await assert.rejects(
    () => repo.mutate((state) => mergeDailyBackup(state, incoming)),
    /kolliderer/,
  );
  assert.equal(raw, initial);
});
test("dashboard stats keep new six-metric scores separate from legacy five-point ratings", async () => {
  const { journalStats } = await import("../src/data/journal-stats");
  const daily = entry();
  daily.metrics = {
    energy: 10,
    sleepQuality: 10,
    mood: 10,
    stress: 1,
    physical: 10,
    digestion: 10,
  };
  const stats = journalStats(
    [
      daily,
      {
        id: "legacy",
        kind: "form",
        date: now.toISOString(),
        rating: 1,
        note: "",
      },
    ],
    now,
  );
  assert.equal(stats.dailyFormAverage, 10);
  assert.equal(stats.dailyFormCount, 1);
  assert.equal(stats.formAverage, 1);
  assert.equal(stats.todayCount, 2);
});
