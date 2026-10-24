import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addEntry,
  beginWorkout,
  createJournalRepository,
  decodeJournal,
  elapsedSeconds,
  emptyJournal,
  finishWorkout,
  JournalEntry,
} from "../src/data/journal";
const form = (id: string, date = "2026-10-24T12:00:00.000Z"): JournalEntry => ({
  id,
  date,
  kind: "form",
  rating: 4,
  note: "God energi",
});
test("form and glucose entries validate and sort chronologically without demo data", () => {
  const state = addEntry(addEntry(emptyJournal(), form("first")), {
    id: "second",
    date: "2026-10-24T13:00:00.000Z",
    kind: "glucose",
    value: 5.6,
    context: "Etter måltid",
    note: "",
  });
  assert.deepEqual(
    state.entries.map((e) => e.id),
    ["second", "first"],
  );
  assert.equal(addEntry(state, form("first")).entries.length, 2);
  assert.throws(() =>
    addEntry(state, { ...form("bad"), kind: "form", rating: 6 }),
  );
});
test("active workouts survive serialization and finish with elapsed wall time", () => {
  const start = beginWorkout(emptyJournal(), {
    id: "training",
    startedAt: "2026-10-24T12:00:00.000Z",
    activity: "Gåtur",
    note: "Tur i parken",
  });
  const restored = decodeJournal(JSON.stringify(start));
  const finished = finishWorkout(
    restored,
    new Date("2026-10-24T12:37:12.500Z"),
  );
  assert.equal(finished.active, undefined);
  assert.equal(finished.entries[0]!.kind, "workout");
  const entry = finished.entries[0]!;
  if (entry.kind === "workout") {
    assert.equal(entry.seconds, 2232);
    assert.equal(entry.note, "Tur i parken");
  }
});
test("cannot start two timers or finish before one second has elapsed", () => {
  const active = beginWorkout(emptyJournal(), {
    id: "one",
    startedAt: "2026-10-24T12:00:00Z",
    activity: "Styrke",
    note: "",
  });
  assert.throws(() =>
    beginWorkout(active, {
      id: "two",
      startedAt: "2026-10-24T12:01:00Z",
      activity: "Løping",
      note: "",
    }),
  );
  assert.throws(() =>
    finishWorkout(active, new Date("2026-10-24T12:00:00.500Z")),
  );
  assert.equal(
    elapsedSeconds(active.active!.startedAt, new Date("2026-10-24T11:00:00Z")),
    0,
  );
});
test("serialized concurrent writes preserve both independent records", async () => {
  let raw: string | null = null;
  const repository = createJournalRepository({
    getItem: async () => raw,
    setItem: async (_, value) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      raw = value;
    },
  });
  await Promise.all([
    repository.mutate((state) => addEntry(state, form("a"))),
    repository.mutate((state) => addEntry(state, form("b"))),
  ]);
  assert.deepEqual(
    new Set((await repository.load()).entries.map((e) => e.id)),
    new Set(["a", "b"]),
  );
});
test("failed persistence leaves existing log intact and later retries can succeed", async () => {
  let raw = JSON.stringify(addEntry(emptyJournal(), form("old"))),
    fail = true;
  const repository = createJournalRepository({
    getItem: async () => raw,
    setItem: async (_, value) => {
      if (fail) throw new Error("storage full");
      raw = value;
    },
  });
  await assert.rejects(
    () => repository.mutate((state) => addEntry(state, form("new"))),
    /storage full/,
  );
  assert.deepEqual(
    (await repository.load()).entries.map((e) => e.id),
    ["old"],
  );
  fail = false;
  await repository.mutate((state) => addEntry(state, form("new")));
  assert.equal((await repository.load()).entries.length, 2);
});
test("corrupt storage is not silently replaced with an empty journal", async () => {
  let raw = "{corrupted",
    writes = 0;
  const repository = createJournalRepository({
    getItem: async () => raw,
    setItem: async (_, value) => {
      writes++;
      raw = value;
    },
  });
  await assert.rejects(
    () => repository.mutate((state) => addEntry(state, form("lost"))),
    /beholdt/,
  );
  assert.equal(writes, 0);
  assert.equal(raw, "{corrupted");
});
test("deleting one entry preserves unrelated entries and the active workout", () => {
  const original = beginWorkout(
    addEntry(addEntry(emptyJournal(), form("a")), form("b")),
    {
      id: "active",
      startedAt: "2026-10-24T12:00:00Z",
      activity: "Sykling",
      note: "",
    },
  );
  const changed = {
    ...original,
    entries: original.entries.filter((e) => e.id !== "a"),
  };
  assert.equal(changed.entries[0]!.id, "b");
  assert.equal(changed.active?.id, "active");
  assert.equal(original.entries.length, 2);
});
