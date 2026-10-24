import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authorizePedometer,
  loadPedometer,
  PedometerPort,
} from "../src/data/pedometer-core";
import { addDays, startOfDay, sum } from "../src/data/models";
const granted = { granted: true, canAskAgain: true };
function fake(overrides: Partial<PedometerPort> = {}) {
  const queries: { start: Date; end: Date }[] = [];
  let requests = 0;
  const port: PedometerPort = {
    isAvailableAsync: async () => true,
    getPermissionsAsync: async () => granted,
    requestPermissionsAsync: async () => {
      requests++;
      return granted;
    },
    getStepCountAsync: async (start, end) => {
      queries.push({ start, end });
      return { steps: Math.floor((+end - +start) / 60000) };
    },
    ...overrides,
  };
  return { port, queries, requests: () => requests };
}
test("permission prompt is explicit and only requested when allowed", async () => {
  const f = fake({
    getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  });
  await authorizePedometer(f.port);
  assert.equal(f.requests(), 1);
  assert.equal(f.queries.length, 0);
});
test("permanently denied permission never opens a new prompt or reads data", async () => {
  const f = fake({
    getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }),
  });
  await assert.rejects(
    () => authorizePedometer(f.port),
    /iPhone-innstillingene/,
  );
  await assert.rejects(() => loadPedometer(f.port), /iPhone-innstillingene/);
  assert.equal(f.requests(), 0);
  assert.equal(f.queries.length, 0);
});
test("refresh never requests permission by itself", async () => {
  const f = fake({
    getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }),
  });
  await assert.rejects(() => loadPedometer(f.port), /Gi tilgang/);
  assert.equal(f.requests(), 0);
});
test("unavailable pedometer fails without fabricated readings", async () => {
  const f = fake({ isAvailableAsync: async () => false });
  await assert.rejects(() => authorizePedometer(f.port), /fysisk iPhone/);
  await assert.rejects(() => loadPedometer(f.port), /ikke tilgjengelig/);
  assert.equal(f.queries.length, 0);
});
test("queries stay within seven local days and never include future time", async () => {
  const now = new Date(2026, 9, 26, 14, 30),
    f = fake(),
    snapshot = await loadPedometer(f.port, now);
  const earliest = addDays(startOfDay(now), -6);
  assert.equal(snapshot.steps.length, 7);
  assert.equal(snapshot.hourly.length, 15);
  assert.ok(
    f.queries.every(
      (q) => q.start >= earliest && q.end <= now && q.end > q.start,
    ),
  );
  assert.ok(+now - +earliest < 7 * 86400000);
  assert.equal(sum(snapshot.hourly), snapshot.steps.at(-1)!.value);
  assert.ok(snapshot.steps.every((r) => r.source === "iPhonens skritteller"));
  for (const key of [
    "distance",
    "energy",
    "exercise",
    "pulse",
    "resting",
    "hrv",
    "sleep",
    "workouts",
  ] as const)
    assert.deepEqual(snapshot[key], []);
});
test("measured zero steps remain zero, not demo values", async () => {
  const f = fake({ getStepCountAsync: async () => ({ steps: 0 }) });
  const snapshot = await loadPedometer(f.port, new Date(2026, 9, 24, 10));
  assert.equal(snapshot.steps.length, 7);
  assert.equal(sum(snapshot.steps), 0);
});
test("fall DST hourly intervals cover the repeated hour without double counting", async () => {
  const now = new Date(2026, 9, 25, 8),
    f = fake(),
    snapshot = await loadPedometer(f.port, now);
  assert.equal(sum(snapshot.hourly), snapshot.steps.at(-1)!.value);
  if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/Oslo")
    assert.equal(snapshot.steps.at(-1)!.value, 9 * 60);
});
test("native query errors and invalid data fail rather than falling back to demo", async () => {
  const f = fake({
    getStepCountAsync: async () => {
      throw new Error("sensor unavailable");
    },
  });
  await assert.rejects(() => loadPedometer(f.port), /sensor unavailable/);
  for (const steps of [-1, NaN, Infinity]) {
    const invalid = fake({ getStepCountAsync: async () => ({ steps }) });
    await assert.rejects(() => loadPedometer(invalid.port), /ugyldig/);
  }
});
