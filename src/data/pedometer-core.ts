import { addDays, emptySnapshot, startOfDay } from "./models";

export type MotionPermission = { granted: boolean; canAskAgain: boolean };
export interface PedometerPort {
  isAvailableAsync(): Promise<boolean>;
  getPermissionsAsync(): Promise<MotionPermission>;
  requestPermissionsAsync(): Promise<MotionPermission>;
  getStepCountAsync(start: Date, end: Date): Promise<{ steps: number }>;
}
const permissionError = (canAskAgain: boolean) =>
  new Error(
    canAskAgain
      ? "Gi tilgang til Bevegelse og trening for å hente ekte skritt fra iPhone."
      : "Tilgang til Bevegelse og trening er avslått. Aktiver tilgangen i iPhone-innstillingene for Expo Go eller VITAL.",
  );

export async function authorizePedometer(port: PedometerPort) {
  if (!(await port.isAvailableAsync()))
    throw new Error(
      "Skrittelleren er ikke tilgjengelig på denne enheten. Prøv på en fysisk iPhone.",
    );
  let permission = await port.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await port.requestPermissionsAsync();
  if (!permission.granted) throw permissionError(permission.canAskAgain);
}

export async function loadPedometer(port: PedometerPort, now = new Date()) {
  // Refresh never opens a permission dialog. Only an explicit connection action does.
  const permission = await port.getPermissionsAsync();
  if (!permission.granted) throw permissionError(permission.canAskAgain);
  if (!(await port.isAvailableAsync()))
    throw new Error("Skrittelleren er ikke tilgjengelig på denne enheten.");
  const data = emptySnapshot(),
    today = startOfDay(now);
  const sample = async (start: Date, end: Date) => {
    const { steps } = await port.getStepCountAsync(start, end);
    if (!Number.isFinite(steps) || steps < 0)
      throw new Error(
        "Skrittelleren returnerte en ugyldig måling. Prøv å oppdatere igjen.",
      );
    return {
      date: start.toISOString(),
      value: steps,
      source: "iPhonens skritteller",
    };
  };
  // Core Motion exposes a rolling seven-day window, not HealthKit history. Six
  // previous local days plus today stay inside that window, including DST changes.
  for (let offset = -6; offset <= 0; offset++) {
    const start = addDays(today, offset),
      end = offset === 0 ? now : addDays(start, 1);
    if (end > start) data.steps.push(await sample(start, end));
  }
  for (let hour = 0; hour <= now.getHours(); hour++) {
    const start = new Date(today);
    start.setHours(hour);
    const next = new Date(start);
    next.setHours(hour + 1);
    const end = new Date(Math.min(+next, +now));
    if (end > start) data.hourly.push(await sample(start, end));
  }
  // Distance, energy, exercise, pulse, sleep and workouts are deliberately empty:
  // steps cannot supply those measurements without making unsupported estimates.
  return data;
}
