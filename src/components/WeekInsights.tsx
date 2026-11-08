import React from "react";
import { View } from "react-native";
import { useHealth } from "../data/store";
import { useJournal } from "../data/journal-store";
import {
  addDays,
  dateLabel,
  inRange,
  number,
  startOfDay,
  sum,
} from "../data/models";
import {
  dailyEntries,
  dailyScore,
  dayKey,
  scoreMean,
} from "../data/daily-form";
import { sleepHistory, sleepTime } from "../data/sleep";
import { Card, Copy, Row, Title, useVitalTheme } from "./UI";

export function WeekInsights() {
  const { data, preferences } = useHealth(),
    journal = useJournal(),
    theme = useVitalTheme();
  const now = new Date(),
    today = startOfDay(now),
    start = addDays(today, -6);
  const steps = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i),
      readings = inRange(data.steps, date, addDays(date, 1)).filter(
        (item) => +new Date(item.date) <= +now,
      );
    return { date, value: readings.length ? sum(readings) : undefined };
  }).filter((day) => day.value !== undefined);
  const bestSteps = steps.reduce<(typeof steps)[number] | undefined>(
    (best, day) => (!best || day.value! > best.value! ? day : best),
    undefined,
  );
  const nights = sleepHistory(data.sleep, now).filter(
    (night) => night.seconds > 0,
  );
  const forms = dailyEntries(journal.data.entries).filter(
    (entry) => entry.day >= dayKey(start) && entry.day <= dayKey(now),
  );
  const averageForm = scoreMean(forms);
  const bestForm = forms.reduce<(typeof forms)[number] | undefined>(
    (best, entry) =>
      !best || dailyScore(entry) > dailyScore(best) ? entry : best,
    undefined,
  );
  const symptoms = new Map<string, number>();
  forms.forEach((entry) =>
    entry.symptoms.forEach((symptom) =>
      symptoms.set(symptom, (symptoms.get(symptom) ?? 0) + 1),
    ),
  );
  const common = [...symptoms].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const runs = journal.data.entries.filter(
    (entry) =>
      entry.kind === "workout" &&
      entry.activity === "Løping" &&
      +new Date(entry.endedAt) >= +start &&
      +new Date(entry.endedAt) <= +now,
  );
  return (
    <Card>
      <Title
        text="Din uke · innsikt"
        icon="sparkles-outline"
        color={theme.orange}
      />
      <Copy small>
        {dateLabel(start)}–{dateLabel(today)} · dagens tall er foreløpige
        {preferences.demo ? " · eksempeldata" : ""}
      </Copy>
      <View style={{ gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Row
            label="Dager med 10 000 skritt"
            value={`${steps.filter((day) => day.value! >= 10000).length} av ${steps.length} registrerte`}
          />
          <Copy small>
            {bestSteps
              ? `Mest aktiv ${dateLabel(bestSteps.date)}: ${number(bestSteps.value!)} skritt.`
              : "Registrerte skritt gir innsikt i dine mest aktive dager."}
          </Copy>
        </View>
        <View style={{ gap: 6 }}>
          <Row
            label="Søvn per registrerte natt"
            value={
              nights.length
                ? sleepTime(
                    nights.reduce((total, night) => total + night.seconds, 0) /
                      nights.length,
                  )
                : "Ingen data"
            }
          />
          <Copy small>
            {nights.length} av 7 netter har søvndata. Manglende netter inngår
            ikke i snittet.
          </Copy>
        </View>
        <View style={{ gap: 6 }}>
          <Row
            label="Gjennomsnittlig dagsform"
            value={
              averageForm === undefined
                ? "Ingen data"
                : `${number(averageForm, 1)} / 10`
            }
          />
          <Copy small>
            {bestForm
              ? `Høyest subjektiv formscore ${dateLabel(bestForm.date)}: ${number(dailyScore(bestForm), 1)} / 10. Basert på ${forms.length} registrerte dager.`
              : "Logg dagens form for å følge utviklingen gjennom uka."}
          </Copy>
        </View>
        <View style={{ gap: 6 }}>
          <Row label="Lagrede løpeturer" value={number(runs.length)} />
          <Copy small>
            {common.length
              ? `Mest registrerte symptomer: ${common.map(([name, count]) => `${name.toLowerCase()} (${count} dager)`).join(", ")}.`
              : forms.length
                ? "Ingen symptomer er valgt i ukas formregistreringer."
                : "Symptominnsikt vises når du har registrert dagsform."}
          </Copy>
        </View>
      </View>
    </Card>
  );
}
