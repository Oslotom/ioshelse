import React, { useState } from "react";
import { Text, View } from "react-native";
import {
  dailyEntries,
  dailyMetrics,
  dailyScore,
  dayKey,
  dayDate,
  scoreMean,
  metricMean,
  metricTone,
  previousSeven,
} from "../data/daily-form";
import { useJournal } from "../data/journal-store";
import { addDays, number } from "../data/models";
import { Button, Card, Copy, Title, useVitalTheme } from "./UI";
import { DailyFormChart } from "./DailyFormChart";
import { DailyFormSheet } from "./DailyFormEditor";
export function DailyFormOverview({
  onEdit,
  chartOnly = false,
}: {
  onEdit?: (day: string) => void;
  chartOnly?: boolean;
}) {
  const journal = useJournal(),
    theme = useVitalTheme(),
    [editing, setEditing] = useState<string>();
  const entries = dailyEntries(journal.data.entries),
    today = dayKey(new Date()),
    entry = entries.find((value) => value.day === today),
    previous = previousSeven(entries, today);
  if (chartOnly) {
    const start = dayKey(addDays(dayDate(today), -13));
    const recent = entries.filter((item) => item.day >= start && item.day <= today);
    const average = scoreMean(recent);
    return <>
      <Card>
        <Title text="Dagens form" icon="sunny-outline" color={theme.mint} />
        <Text style={{ fontSize: 32, fontWeight: "700", color: theme.text }}>
          {entry ? number(dailyScore(entry), 1) : "–"}
          <Text style={{ fontSize: 14, color: theme.secondary }}> / 10 · total formscore i dag</Text>
        </Text>
        <Copy small>Siste to uker · {recent.length} av 14 dager registrert{average === undefined ? "" : ` · snitt ${number(average, 1)} / 10`}</Copy>
        <DailyFormChart entries={recent} primary="score" range={{ start, end: today }}
          onSelect={(item) => setEditing(item.day)} />
        <Copy small>Subjektiv indikator, ingen medisinsk vurdering. De seks målingene vektes likt; stress regnes som 11 − stress.</Copy>
        <Button label={entry ? "Rediger dagens form" : "Registrer dagens form"}
          disabled={journal.loading || !journal.available} onPress={() => setEditing(today)} />
      </Card>
      <DailyFormSheet day={editing} onClose={() => setEditing(undefined)} />
    </>;
  }
  return (
    <>
      <Card>
        <Title text="Dagens form" icon="sunny-outline" color={theme.mint} />
        {entry ? (
          <View style={{ gap: 5 }}>
            <Text
              style={{ fontSize: 34, fontWeight: "700", color: theme.text }}
            >
              {number(dailyScore(entry), 1)}
              <Text style={{ fontSize: 15, color: theme.secondary }}>
                {" "}
                / 10
              </Text>
            </Text>
            <Copy small>
              Subjektiv formindikator. Gjennomsnitt av de seks verdiene, med 11
              − stress. Alle vektes likt. Ingen medisinsk vurdering.
            </Copy>
          </View>
        ) : (
          <Copy>
            {journal.loading
              ? "Laster dagsform …"
              : "Registrer seks raske vurderinger for å følge formen din over tid."}
          </Copy>
        )}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {dailyMetrics.map((metric) => {
            const value = entry?.metrics[metric.key],
              average = metricMean(previous, metric.key),
              delta =
                value !== undefined && average !== undefined
                  ? value - average
                  : undefined;
            return (
              <View
                key={metric.key}
                style={{
                  flexBasis: "46%",
                  flexGrow: 1,
                  backgroundColor: theme.track,
                  borderRadius: 15,
                  padding: 12,
                  gap: 5,
                }}
              >
                <Text style={{ color: theme.secondary, fontSize: 12 }}>
                  {metric.label}
                </Text>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "600",
                    color:
                      value !== undefined
                        ? metricTone(metric.key, value)
                        : theme.secondary,
                  }}
                >
                  {value ?? "–"}
                  <Text style={{ fontSize: 12 }}> / 10</Text>
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    lineHeight: 15,
                    color: theme.secondary,
                  }}
                >
                  {delta === undefined
                    ? "Ingen sammenligning"
                    : `${delta > 0 ? "+" : ""}${number(delta, 1)} mot snittet for ${previous.length} av de sju foregående dagene`}
                </Text>
              </View>
            );
          })}
        </View>
        {entry && (
          <>
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: theme.text }}
            >
              Symptomer i dag
            </Text>
            <Copy>
              {entry.symptoms.length
                ? entry.symptoms.join(" · ")
                : "Ingen symptomer registrert"}
            </Copy>
            {!!entry.note && <Copy>{entry.note}</Copy>}
          </>
        )}
        <Button
          label={
            entry ? "Rediger dagens registrering" : "Registrer dagens form"
          }
          disabled={journal.loading || !journal.available}
          onPress={() => (onEdit ? onEdit(today) : setEditing(today))}
        />
      </Card>
      {!onEdit && (
        <DailyFormSheet day={editing} onClose={() => setEditing(undefined)} />
      )}
    </>
  );
}
