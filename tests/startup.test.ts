import { test } from "node:test";
import assert from "node:assert/strict";
import { restoreStartupState, withDeadline } from "../src/data/startup";

test("app becomes ready before a stalled import database is resolved", async () => {
  const events: string[] = [];
  let release!: (value: string) => void;
  const pending = new Promise<string>((resolve) => {
    release = resolve;
  });
  const restore = restoreStartupState({
    readPreferences: async () => "saved preferences",
    onPreferences: () => events.push("preferences"),
    onReady: () => events.push("ready"),
    readImport: () => {
      events.push("import started");
      return pending;
    },
    onImport: () => events.push("import restored"),
    onError: () => events.push("error"),
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, ["preferences", "ready", "import started"]);
  release("saved import");
  await restore;
  assert.equal(events.at(-1), "import restored");
});
test("stalled preferences and import cannot leave the app permanently loading", async () => {
  const events: string[] = [];
  await restoreStartupState({
    readPreferences: () => new Promise<never>(() => {}),
    onPreferences: () => events.push("preferences"),
    onReady: () => events.push("ready"),
    readImport: () => new Promise<never>(() => {}),
    onImport: () => events.push("import"),
    onError: () => events.push("error"),
    preferenceTimeout: 5,
    importTimeout: 5,
  });
  assert.deepEqual(events, ["error", "ready", "error"]);
});
test("corrupt preferences still allow readiness and saved import recovery", async () => {
  const events: string[] = [];
  await restoreStartupState({
    readPreferences: async () => "{bad json",
    onPreferences: (raw) => {
      JSON.parse(raw);
    },
    onReady: () => events.push("ready"),
    readImport: async () => "existing history",
    onImport: (value) => events.push(value),
    onError: () => events.push("error"),
  });
  assert.deepEqual(events, ["error", "ready", "existing history"]);
});
test("timeout rejects but does not cancel, erase or overwrite the underlying stored value", async () => {
  let resolve!: (value: string) => void;
  const original = new Promise<string>((done) => {
    resolve = done;
  });
  await assert.rejects(
    () => withDeadline(original, 5, "lagring svarer ikke"),
    /lagring svarer ikke/,
  );
  resolve("preserved import");
  assert.equal(await original, "preserved import");
});
