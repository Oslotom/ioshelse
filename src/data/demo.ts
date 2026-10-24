import { addDays, emptySnapshot, Reading, startOfDay } from "./models";
export function makeDemo(now = new Date()) {
  const data = emptySnapshot(),
    today = startOfDay(now);
  const reading = (date: Date, value: number): Reading => ({
    date: date.toISOString(),
    value,
    source: "Demodata",
  });
  for (let i = -399; i <= 0; i++) {
    const date = addDays(today, i),
      steps = i === 0 ? 8432 : 4800 + (((i + 400) * 791) % 8600);
    data.steps.push(reading(date, steps));
    data.distance.push(reading(date, steps * 0.00072));
    data.energy.push(reading(date, steps * 0.043));
    data.exercise.push(reading(date, 18 + (((i + 400) * 7) % 48)));
    data.resting.push(reading(date, 57 + Math.sin(i / 8) * 4));
    data.hrv.push(reading(date, 44 + Math.sin(i / 6) * 9));
    if (i % 3 === 0)
      data.workouts.push({
        id: date.toISOString(),
        date: date.toISOString(),
        minutes: 35,
        name: "Gåtur",
      });
  }
  const hours = Array.from({ length: now.getHours() + 1 }, (_, i) => ({
    hour: i,
    weight: ((i * 7 + 3) % 13) + 1,
  }));
  const weight = hours.reduce((a, b) => a + b.weight, 0);
  hours.forEach((h) => {
    const date = new Date(today);
    date.setHours(h.hour);
    data.hourly.push(reading(date, (8432 * h.weight) / weight));
  });
  for (let day = -59; day <= 0; day++) {
    const date = addDays(today, day);
    for (let minute = 0; minute <= 90; minute += 5) {
      const time = new Date(date);
      time.setHours(7, minute);
      if (time <= now)
        data.pulse.push({
          ...reading(time, 67 + ((minute * 7 + day + 60) % 24)),
          source: "Demoklokke",
        });
    }
    const bedtime = new Date(date);
    bedtime.setHours(-2);
    ["Lett", "Dyp", "Lett", "REM", "Lett", "REM", "Lett", "Lett"].forEach(
      (stage, index) => {
        const start = new Date(+bedtime + index * 3600000),
          end = new Date(Math.min(+now, +start + 3600000));
        if (end > start)
          data.sleep.push({
            start: start.toISOString(),
            end: end.toISOString(),
            stage,
            asleep: true,
          });
      },
    );
  }
  return data;
}
