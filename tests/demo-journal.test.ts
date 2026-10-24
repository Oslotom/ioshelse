import { test } from "node:test";
import assert from "node:assert/strict";
import { makeDemoJournal } from "../src/data/demo-journal";
import { decodeJournal, validateEntry } from "../src/data/journal";
import { dailyEntries, dayKey } from "../src/data/daily-form";
import { addDays } from "../src/data/models";

test("demo journal covers fourteen unique local dates with valid fictional records", () => {
  // Covers the Oslo daylight-saving transition and early-morning startup.
  const now = new Date("2026-10-25T00:01:00+02:00");
  const journal = makeDemoJournal(now);
  journal.entries.forEach((entry) => {
    validateEntry(entry);
    assert.ok(+new Date(entry.date) <= +now);
    assert.match(entry.note, /Eksempel|Fiktiv/);
  });
  const daily = dailyEntries(journal.entries);
  assert.equal(daily.length, 14);
  assert.equal(new Set(daily.map((entry) => entry.day)).size, 14);
  assert.equal(daily[0]!.day, dayKey(addDays(now, -13)));
  assert.equal(daily.at(-1)!.day, dayKey(now));
  assert.equal(journal.entries.filter((entry) => entry.kind === "glucose").length, 14);
  assert.equal(journal.entries.filter((entry) => entry.kind === "workout").length, 7);
  assert.deepEqual(decodeJournal(JSON.stringify(journal)), journal);
  assert.deepEqual(makeDemoJournal(now), journal);
});
