import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type {
  QuantityTypeIdentifier,
  UnitForIdentifier,
} from "@kingstinct/react-native-healthkit/types";
import {
  addDays,
  dailyMean,
  emptySnapshot,
  Reading,
  startOfDay,
} from "./models";

type HealthKit = typeof import("@kingstinct/react-native-healthkit");
let kit: HealthKit | undefined;
export function getHealthKit(): HealthKit | undefined {
  if (
    Platform.OS !== "ios" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  )
    return;
  if (!kit) {
    try {
      kit = require("@kingstinct/react-native-healthkit") as HealthKit;
    } catch {
      return;
    }
  }
  try {
    return kit.isHealthDataAvailable() ? kit : undefined;
  } catch {
    return;
  }
}
export const readTypes = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierDistanceWalkingRunning",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierAppleExerciseTime",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKWorkoutTypeIdentifier",
] as const;
export async function authorizeHealth() {
  const health = getHealthKit();
  if (!health)
    throw new Error(
      "Apple Helse krever en iOS-utviklingsbygg eller produksjonsbygg. Bruk demodata i Expo Go.",
    );
  const success = await health.requestAuthorization({
    toRead: readTypes,
    toShare: [],
  });
  if (!success)
    throw new Error("Forespørselen til Apple Helse ble ikke fullført.");
  // Completion does NOT prove read permission. Apple deliberately keeps denial private.
}
export function observeHealth(onChange: () => void) {
  const health = getHealthKit();
  if (!health) return () => {};
  const subscriptions = readTypes.map((type) =>
    health.subscribeToChanges(type, (event) => {
      if (!event.errorMessage) onChange();
    }),
  );
  return () => subscriptions.forEach((s) => s.remove());
}
export async function loadHealth(now = new Date()) {
  const health = getHealthKit();
  if (!health)
    throw new Error(
      "Apple Helse er ikke tilgjengelig her. Du kan velge tydelig merkede demodata i innstillingene.",
    );
  const data = emptySnapshot(),
    today = startOfDay(now),
    start = addDays(today, -740),
    recent = addDays(today, -60);
  const filter = (from: Date) => ({ date: { startDate: from, endDate: now } });
  async function statistics<T extends QuantityTypeIdentifier>(
    type: T,
    unit: UnitForIdentifier<T>,
    hourly = false,
  ): Promise<Reading[]> {
    const from = hourly ? today : start;
    const result = await health!.queryStatisticsCollectionForQuantity(
      type,
      ["cumulativeSum"],
      today,
      hourly ? { hour: 1 } : { day: 1 },
      { unit, filter: filter(from) },
    );
    return result.flatMap((r) =>
      r.startDate && r.sumQuantity && r.startDate >= from && r.startDate < now
        ? [{ date: r.startDate.toISOString(), value: r.sumQuantity.quantity }]
        : [],
    );
  }
  async function samples<T extends QuantityTypeIdentifier>(
    type: T,
    unit: UnitForIdentifier<T>,
    from = recent,
  ): Promise<Reading[]> {
    const result = await health!.queryQuantitySamples(type, {
      unit,
      filter: filter(from),
      limit: 0,
      ascending: true,
    });
    return result.map((r) => ({
      date: r.startDate.toISOString(),
      value: r.quantity,
      source: r.sourceRevision.source.name,
    }));
  }
  // HealthKit merges cumulative totals across device sources; raw samples are never summed.
  [
    data.steps,
    data.hourly,
    data.distance,
    data.energy,
    data.exercise,
    data.pulse,
    data.resting,
    data.hrv,
  ] = await Promise.all([
    statistics("HKQuantityTypeIdentifierStepCount", "count"),
    statistics("HKQuantityTypeIdentifierStepCount", "count", true),
    statistics("HKQuantityTypeIdentifierDistanceWalkingRunning", "km"),
    statistics("HKQuantityTypeIdentifierActiveEnergyBurned", "kcal"),
    statistics("HKQuantityTypeIdentifierAppleExerciseTime", "min"),
    samples("HKQuantityTypeIdentifierHeartRate", "count/min"),
    samples("HKQuantityTypeIdentifierRestingHeartRate", "count/min", start),
    samples("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", "ms"),
  ]);
  data.resting = dailyMean(data.resting);
  const sleep = await health.queryCategorySamples(
    "HKCategoryTypeIdentifierSleepAnalysis",
    { filter: filter(addDays(today, -8)), limit: 0, ascending: true },
  );
  // Pick a single source for stage timelines; union asleep intervals when computing duration.
  const groups = new Map<string, (typeof sleep)[number][]>();
  sleep.forEach((s) => {
    const source = s.sourceRevision.source.bundleIdentifier;
    groups.set(source, [...(groups.get(source) ?? []), s]);
  });
  const preferred =
    [...groups.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  const stages: Record<number, string> = {
    1: "Søvn",
    2: "Våken",
    3: "Lett",
    4: "Dyp",
    5: "REM",
  };
  data.sleep = preferred.flatMap((s) =>
    stages[s.value]
      ? [
          {
            start: s.startDate.toISOString(),
            end: s.endDate.toISOString(),
            stage: stages[s.value]!,
            asleep: s.value !== 2,
          },
        ]
      : [],
  );
  const workouts = await health.queryWorkoutSamples({
    filter: filter(recent),
    limit: 0,
    ascending: true,
  });
  data.workouts = workouts.map((w) => ({
    id: w.uuid,
    date: w.startDate.toISOString(),
    minutes: w.duration.quantity / 60,
    name:
      w.workoutActivityType === health.WorkoutActivityType.walking
        ? "Gåtur"
        : w.workoutActivityType === health.WorkoutActivityType.running
          ? "Løping"
          : w.workoutActivityType === health.WorkoutActivityType.cycling
            ? "Sykling"
            : "Treningsøkt",
  }));
  return data;
}
