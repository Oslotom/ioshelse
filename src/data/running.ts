export type RunPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  segment: number;
};
export type RunData = {
  points: RunPoint[];
  gpsEnabled: boolean;
  pausedMs: number;
  pausedAt?: string;
};
export const emptyRun = (gpsEnabled: boolean): RunData => ({
  points: [],
  gpsEnabled,
  pausedMs: 0,
});
export function validateRun(run: RunData) {
  if (
    !run ||
    typeof run.gpsEnabled !== "boolean" ||
    !Number.isFinite(run.pausedMs) ||
    run.pausedMs < 0 ||
    (run.pausedAt !== undefined &&
      !Number.isFinite(Date.parse(run.pausedAt))) ||
    !Array.isArray(run.points) ||
    run.points.length > 10000
  )
    throw new Error("Dårlige løpedata.");
  let previous = -Infinity;
  for (const point of run.points) {
    if (
      !Number.isFinite(point.latitude) ||
      Math.abs(point.latitude) > 90 ||
      !Number.isFinite(point.longitude) ||
      Math.abs(point.longitude) > 180 ||
      !Number.isFinite(point.timestamp) ||
      point.timestamp <= previous ||
      !Number.isFinite(point.accuracy) ||
      point.accuracy < 0 ||
      !Number.isInteger(point.segment) ||
      point.segment < 0
    )
      throw new Error("Ugyldig GPS-punkt.");
    previous = point.timestamp;
  }
}
export function metres(
  a: Pick<RunPoint, "latitude" | "longitude">,
  b: Pick<RunPoint, "latitude" | "longitude">,
) {
  const rad = Math.PI / 180,
    lat = (b.latitude - a.latitude) * rad,
    lon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(lon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function addRunPoint(
  run: RunData,
  point: Omit<RunPoint, "segment">,
  newSegment: boolean,
): RunData {
  if (
    !run.gpsEnabled ||
    run.pausedAt ||
    run.points.length >= 10000 ||
    point.accuracy < 0 ||
    point.accuracy > 35
  )
    return run;
  const last = run.points.at(-1);
  if (last && point.timestamp <= last.timestamp) return run;
  const gap = last && point.timestamp - last.timestamp > 30000;
  const distance = last ? metres(last, point) : 0;
  if (
    last &&
    !newSegment &&
    !gap &&
    (distance < 3 ||
      distance / ((point.timestamp - last.timestamp) / 1000) > 12)
  )
    return run;
  const next = {
    ...point,
    segment: last ? last.segment + (newSegment || gap ? 1 : 0) : 0,
  };
  const candidate = { ...run, points: [...run.points, next] };
  validateRun(candidate);
  return candidate;
}
export function runDistance(run: RunData) {
  return run.points.reduce((total, point, index, points) => {
    const last = points[index - 1];
    return (
      total + (last && last.segment === point.segment ? metres(last, point) : 0)
    );
  }, 0);
}
export function runSeconds(startedAt: string, run: RunData, now = new Date()) {
  return Math.max(
    0,
    Math.floor(
      (+(run.pausedAt ? new Date(run.pausedAt) : now) -
        +new Date(startedAt) -
        run.pausedMs) /
        1000,
    ),
  );
}
export function toggleRunPause(run: RunData, now = new Date()): RunData {
  if (run.pausedAt) {
    const { pausedAt, ...rest } = run;
    return {
      ...rest,
      pausedMs: run.pausedMs + Math.max(0, +now - +new Date(pausedAt)),
    };
  }
  return { ...run, pausedAt: now.toISOString() };
}
export function finalRun(run: RunData, now: Date): RunData {
  return run.pausedAt ? toggleRunPause(run, now) : run;
}
export function paceLabel(seconds: number, distance: number) {
  if (distance < 20 || seconds <= 0) return "–:––";
  const pace = Math.round(seconds / (distance / 1000));
  return `${Math.floor(pace / 60)}:${String(pace % 60).padStart(2, "0")}`;
}
