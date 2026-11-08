import { test } from "node:test";
import assert from "node:assert/strict";
import { kpiTrends, percentTrend } from "../src/data/kpi-trends";
import { emptySnapshot } from "../src/data/models";
test("percent trend excludes missing and zero baselines", () => {
  assert.equal(percentTrend(12, 10), 20);
  assert.equal(percentTrend(0, 10), -100);
  assert.equal(percentTrend(10, 0), undefined);
  assert.equal(percentTrend(undefined, 10), undefined);
});
test("step trend compares complete days and excludes today's incomplete total", () => {
  const data = emptySnapshot();
  data.steps = [{ date: new Date(2026, 10, 6).toISOString(), value: 1000 }, { date: new Date(2026, 10, 7).toISOString(), value: 2000 }, { date: new Date(2026, 10, 8).toISOString(), value: 100 }];
  const result = kpiTrends(data, [], new Date(2026, 10, 8, 12));
  assert.equal(result.steps, 100);
  assert.equal(result.sleep, undefined);
  assert.equal(result.form, undefined);
  assert.equal(result.workouts, undefined);
});
