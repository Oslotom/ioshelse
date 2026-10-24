import { addDays, Sleep, sleepDuration, startOfDay } from "./models";

/** A night ends at local noon; clip boundary-crossing samples before aggregation. */
export function nightSleep(segments: Sleep[], date: Date): Sleep[] {
  const end = startOfDay(date);
  end.setHours(12);
  const start = addDays(end, -1);
  return segments
    .flatMap((segment) => {
      const from = Math.max(+start, +new Date(segment.start)),
        to = Math.min(+end, +new Date(segment.end));
      return Number.isFinite(from) && Number.isFinite(to) && to > from
        ? [
            {
              ...segment,
              start: new Date(from).toISOString(),
              end: new Date(to).toISOString(),
            },
          ]
        : [];
    })
    .sort((a, b) => a.start.localeCompare(b.start));
}
export function sleepHistory(segments: Sleep[], ending: Date, days = 7) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startOfDay(ending), index - days + 1),
      night = nightSleep(segments, date);
    return {
      date: date.toISOString(),
      seconds: sleepDuration(night),
      segments: night,
    };
  });
}
export function sleepTime(seconds: number) {
  return `${Math.floor(seconds / 3600)} t ${Math.floor((seconds % 3600) / 60)} min`;
}
