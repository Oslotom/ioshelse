import { dayKey, DailyFormEntry } from "./daily-form";
import { addDays, startOfDay } from "./models";
import { Journal, JournalEntry } from "./journal";

/** Fictional examples, loaded exclusively through the separate demo journal. */
export function makeDemoJournal(now = new Date()): Journal {
  const entries: JournalEntry[] = [];
  for (let offset = -13; offset <= 0; offset++) {
    const date = addDays(startOfDay(now), offset);
    // Midnight also works when the demo is opened early in the morning.
    const stamp = date.toISOString(), day = dayKey(date), i = offset + 13;
    const daily: DailyFormEntry = {
      id: `demo-form-${day}`, kind: "dailyForm", day, date: stamp,
      createdAt: stamp, updatedAt: stamp,
      metrics: {
        energy: [5, 6, 8, 7, 4, 6, 8][i % 7]!,
        sleepQuality: [6, 5, 8, 7, 4, 7, 9][i % 7]!,
        mood: [6, 7, 8, 7, 5, 8, 9][i % 7]!,
        stress: [6, 5, 3, 4, 7, 4, 2][i % 7]!,
        physical: [5, 7, 8, 6, 5, 7, 8][i % 7]!,
        digestion: [7, 6, 8, 7, 5, 8, 9][i % 7]!,
      },
      symptoms: i % 7 === 4 ? ["Hodepine", "Utmattelse"]
        : i % 4 === 0 ? ["Oppblåst mage"] : i % 5 === 0 ? ["Stivhet eller smerter"] : [],
      note: ["Eksempel: rolig dag og litt lite overskudd.", "Eksempel: god søvn og en fin tur.", "Eksempel: mer energi i dag."][i % 3]!,
    };
    entries.push(daily, {
      id: `demo-glucose-${day}`, kind: "glucose", date: stamp,
      value: [5.1, 5.4, 4.9, 5.6, 5.2, 5.0, 5.3][i % 7]!,
      context: "Fastende", note: "Fiktiv eksempelverdi, ikke en måling.",
    });
    if (i % 2 === 0) {
      const seconds = (25 + (i % 4) * 10) * 60;
      entries.push({ id: `demo-workout-${day}`, kind: "workout", date: stamp,
        startedAt: new Date(+date - seconds * 1000).toISOString(),
        endedAt: stamp,
        seconds, activity: i % 4 === 0 ? "Gåtur" : "Styrke",
        note: "Fiktiv eksempeløkt.",
      });
    }
  }
  return { version: 1, entries };
}
