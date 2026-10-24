import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useJournal } from "../data/journal-store";
import {
  compareDaily,
  dailyCorrelation,
  dailyEntries,
  dailyMetrics,
  DailyPeriod,
  dailyPeriods,
  dailyScore,
  dailyWindow,
  dayDate,
  dayKey,
  metricMean,
  MetricKey,
  metricTone,
  scoreMean,
  strongestDailyCorrelation,
} from "../data/daily-form";
import { number } from "../data/models";
import { pickDailyJSON, shareDaily } from "../data/daily-files";
import { Button, Card, Copy, Row, Title, useVitalTheme } from "./UI";
import { DailyFormOverview } from "./DailyFormOverview";
import { DailyFormSheet } from "./DailyFormEditor";
import {
  DailyFormChart,
  DailySeries,
  seriesLabel,
  seriesValue,
} from "./DailyFormChart";
import { Sparkline } from "./Sparkline";

function SeriesMenu({
  value,
  onChange,
  comparison = false,
  exclude,
}: {
  value: DailySeries | "none";
  onChange: (value: DailySeries | "none") => void;
  comparison?: boolean;
  exclude?: DailySeries;
}) {
  const [open, setOpen] = useState(false),
    theme = useVitalTheme();
  const options: { key: DailySeries | "none"; label: string }[] = [
    ...(comparison
      ? [{ key: "none" as const, label: "Ingen sammenligning" }]
      : [{ key: "score" as const, label: "Formscore" }]),
    ...dailyMetrics
      .filter((metric) => metric.key !== exclude)
      .map((metric) => ({ key: metric.key, label: metric.label })),
  ];
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={
          comparison ? "Velg måling å sammenligne" : "Velg måling i grafen"
        }
        onPress={() => setOpen((current) => !current)}
        style={{
          padding: 12,
          borderRadius: 12,
          backgroundColor: theme.track,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: theme.text, fontSize: 13, flexShrink: 1 }}>
          {comparison ? "Sammenlign: " : ""}
          {value === "none" ? "Ingen" : seriesLabel(value)}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.secondary}
        />
      </Pressable>
      {open &&
        options.map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: option.key === value }}
            onPress={() => {
              onChange(option.key);
              setOpen(false);
            }}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor:
                option.key === value ? theme.mint + "22" : theme.track,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 13 }}>
              {option.label}
            </Text>
          </Pressable>
        ))}
    </View>
  );
}
export const DailyFormDashboard = React.memo(function DailyFormDashboard() {
  const journal = useJournal(),
    theme = useVitalTheme();
  const [editing, setEditing] = useState<string>(),
    [period, setPeriod] = useState<DailyPeriod>("30 dager"),
    [primary, setPrimary] = useState<DailySeries>("score"),
    [secondary, setSecondary] = useState<MetricKey>(),
    [selected, setSelected] = useState<string>(),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [gridWidth, setGridWidth] = useState(280),
    [fileBusy, setFileBusy] = useState(false),
    [fileError, setFileError] = useState<string>();
  const all = useMemo(
      () => dailyEntries(journal.data.entries),
      [journal.data.entries],
    ),
    entries = useMemo(
      () => dailyWindow(all, period),
      [all, period, dayKey(new Date())],
    );
  const chosen = entries.find((entry) => entry.day === selected),
    highest = entries.reduce<(typeof entries)[number] | undefined>(
      (best, entry) =>
        !best || dailyScore(entry) > dailyScore(best) ? entry : best,
      undefined,
    ),
    lowest = entries.reduce<(typeof entries)[number] | undefined>(
      (best, entry) =>
        !best || dailyScore(entry) < dailyScore(best) ? entry : best,
      undefined,
    );
  const week = compareDaily(all, 7),
    monthComparison = compareDaily(all, 30),
    correlation = useMemo(() => strongestDailyCorrelation(entries), [entries]),
    pair =
      primary !== "score" && secondary
        ? dailyCorrelation(entries, primary, secondary)
        : undefined;
  const frequencies = new Map<string, number>();
  entries.forEach((entry) =>
    entry.symptoms.forEach((symptom) =>
      frequencies.set(symptom, (frequencies.get(symptom) ?? 0) + 1),
    ),
  );
  const symptomCounts = [...frequencies].sort((a, b) => b[1] - a[1]);
  const offset = (month.getDay() + 6) % 7,
    days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    cells = Array.from(
      { length: Math.ceil((offset + days) / 7) * 7 },
      (_, i) => i - offset + 1,
    ),
    today = dayKey(new Date()),
    cell = Math.floor((gridWidth - 24) / 7);
  const fullDay = (day: string) =>
    dayDate(day).toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  async function exportFile() {
    setFileBusy(true);
    setFileError(undefined);
    try {
      await shareDaily(all);
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Kunne ikke eksportere JSON.",
      );
    } finally {
      setFileBusy(false);
    }
  }
  async function importFile() {
    setFileBusy(true);
    setFileError(undefined);
    try {
      const incoming = await pickDailyJSON();
      if (!incoming) return;
      const existing = new Set(all.map((entry) => entry.day)),
        added = incoming.filter((entry) => !existing.has(entry.day)).length;
      Alert.alert(
        "Importer dagsform?",
        `${added} nye datoer legges til. ${incoming.length - added} eksisterende datoer beholdes uendret. Trening, blodsukker og eldre logger påvirkes ikke.`,
        [
          { text: "Avbryt", style: "cancel" },
          {
            text: "Importer",
            onPress: () => {
              setFileBusy(true);
              void journal
                .importDaily(incoming)
                .catch((error) =>
                  setFileError(
                    error instanceof Error
                      ? error.message
                      : "Kunne ikke importere.",
                  ),
                )
                .finally(() => setFileBusy(false));
            },
          },
        ],
      );
    } catch (error) {
      setFileError(
        error instanceof Error ? error.message : "Kunne ikke lese JSON-filen.",
      );
    } finally {
      setFileBusy(false);
    }
  }
  return (
    <View style={{ gap: 20 }}>
      <DailyFormOverview onEdit={setEditing} />
      <Card>
        <Title
          text="Utvikling i dagsform"
          icon="analytics-outline"
          color={theme.mint}
        />
        <View
          accessibilityRole="tablist"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
        >
          {dailyPeriods.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === value }}
              onPress={() => {
                setPeriod(value);
                setSelected(undefined);
              }}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: period === value ? theme.mint : theme.track,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "500",
                  color: period === value ? "#062C26" : theme.text,
                }}
              >
                {value}
              </Text>
            </Pressable>
          ))}
        </View>
        <SeriesMenu
          value={primary}
          onChange={(value) => {
            if (value === "none") return;
            setPrimary(value);
            if (value === secondary) setSecondary(undefined);
          }}
        />
        <SeriesMenu
          value={secondary ?? "none"}
          comparison
          exclude={primary}
          onChange={(value) =>
            setSecondary(
              value === "none" || value === "score" ? undefined : value,
            )
          }
        />
        <View style={{ gap: 5 }}>
          <Text style={{ color: theme.mint, fontSize: 12 }}>
            ● {seriesLabel(primary)}
          </Text>
          {secondary && (
            <Text style={{ color: theme.lavender, fontSize: 12 }}>
              ● {seriesLabel(secondary)}
            </Text>
          )}
        </View>
        <DailyFormChart
          entries={entries}
          primary={primary}
          secondary={secondary}
          onSelect={(entry) => setSelected(entry.day)}
        />
        {chosen && (
          <View
            style={{
              backgroundColor: theme.track,
              padding: 14,
              borderRadius: 15,
              gap: 8,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: "600",
                flex: 1,
                textAlign: "center",
              }}
            >
              {fullDay(chosen.day)}
            </Text>
            <Row
              label={seriesLabel(primary)}
              value={`${number(seriesValue(chosen, primary), 1)} / 10`}
            />
            {secondary && (
              <Row
                label={seriesLabel(secondary)}
                value={`${chosen.metrics[secondary]} / 10`}
              />
            )}
            <Copy small>
              {chosen.symptoms.length
                ? chosen.symptoms.join(" · ")
                : "Ingen symptomer registrert"}
            </Copy>
            {!!chosen.note && <Copy>{chosen.note}</Copy>}
            <Button
              label="Åpne og rediger denne dagen"
              secondary
              onPress={() => setEditing(chosen.day)}
            />
          </View>
        )}
        {pair !== undefined && (
          <Copy small>
            Samvariasjon mellom de to målingene: r = {number(pair, 2)}, basert
            på {entries.length} registrerte dager. Dette viser ikke
            årsakssammenheng.
          </Copy>
        )}
      </Card>
      <Card>
        <Title
          text="De seks målingene"
          icon="pulse-outline"
          color={theme.lavender}
        />
        <Copy small>
          {period} · trykk på en måling for å vise den i hovedgrafen.
        </Copy>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {dailyMetrics.map((metric) => {
            const average = metricMean(entries, metric.key);
            return (
              <Pressable
                key={metric.key}
                accessibilityRole="button"
                accessibilityLabel={`Vis trend for ${metric.label}`}
                onPress={() => {
                  setPrimary(metric.key);
                  if (secondary === metric.key) setSecondary(undefined);
                }}
                style={{
                  flexBasis: "46%",
                  flexGrow: 1,
                  padding: 12,
                  borderRadius: 15,
                  backgroundColor: theme.track,
                  gap: 7,
                }}
              >
                <Text
                  style={{ color: theme.text, fontSize: 12, fontWeight: "500" }}
                >
                  {metric.label}
                </Text>
                <Text
                  style={{
                    color:
                      average === undefined
                        ? theme.secondary
                        : metricTone(metric.key, average),
                    fontSize: 22,
                    fontWeight: "600",
                  }}
                >
                  {average === undefined ? "–" : number(average, 1)}
                  <Text style={{ fontSize: 11 }}> / 10</Text>
                </Text>
                <Sparkline
                  data={entries.map((entry) => ({
                    date: dayDate(entry.day).toISOString(),
                    value: entry.metrics[metric.key],
                  }))}
                  color={theme.mint}
                  label={metric.label}
                />
                <Copy small>{entries.length} registrerte dager</Copy>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card>
        <Title
          text="Dagsformkalender"
          icon="calendar-outline"
          color={theme.mint}
        />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forrige måned"
            onPress={() =>
              setMonth(
                (value) =>
                  new Date(value.getFullYear(), value.getMonth() - 1, 1),
              )
            }
            style={{ padding: 10 }}
          >
            <Ionicons name="chevron-back" color={theme.text} size={22} />
          </Pressable>
          <Text style={{ color: theme.text, fontWeight: "600" }}>
            {month.toLocaleDateString("nb-NO", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Neste måned"
            disabled={
              month.getFullYear() === new Date().getFullYear() &&
              month.getMonth() === new Date().getMonth()
            }
            onPress={() =>
              setMonth(
                (value) =>
                  new Date(value.getFullYear(), value.getMonth() + 1, 1),
              )
            }
            style={{ padding: 10 }}
          >
            <Ionicons
              name="chevron-forward"
              color={theme.secondary}
              size={22}
            />
          </Pressable>
        </View>
        <View
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
          style={{ gap: 4 }}
        >
          <View style={{ flexDirection: "row", gap: 4 }}>
            {["M", "T", "O", "T", "F", "L", "S"].map((day, index) => (
              <Text
                key={index}
                style={{
                  width: cell,
                  textAlign: "center",
                  fontSize: 11,
                  color: theme.secondary,
                }}
              >
                {day}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
            {cells.map((value, index) => {
              if (value < 1 || value > days)
                return (
                  <View
                    key={index}
                    style={{ width: cell, height: Math.max(44, cell) }}
                  />
                );
              const day = dayKey(
                  new Date(month.getFullYear(), month.getMonth(), value),
                ),
                entry = all.find((entry) => entry.day === day),
                color = entry
                  ? metricTone("energy", dailyScore(entry))
                  : theme.secondary;
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`${fullDay(day)}. ${entry ? `Formscore ${number(dailyScore(entry), 1)}. Åpne og rediger.` : "Ingen registrering. Registrer dagsform."}`}
                  disabled={day > today}
                  onPress={() => setEditing(day)}
                  style={{
                    width: cell,
                    minHeight: Math.max(44, cell),
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    backgroundColor: entry ? color + "22" : theme.track,
                    borderWidth: 1,
                    borderColor: day === today ? theme.mint : "transparent",
                    opacity: day > today ? 0.35 : 1,
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 13 }}>
                    {value}
                  </Text>
                  {entry && (
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: color,
                        marginTop: 3,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <Copy small>
          Fargen viser subjektiv formscore. Nøytrale dager mangler registrering.
          Trykk på en dato for å åpne eller registrere dagen.
        </Copy>
      </Card>
      <Card>
        <Title
          text="Statistikk og innsikt"
          icon="bulb-outline"
          color={theme.orange}
        />
        <Row label="Registrerte dager i utvalget" value={`${entries.length}`} />
        <Row
          label="Gjennomsnittlig formscore"
          value={
            scoreMean(entries) === undefined
              ? "Ingen data"
              : `${number(scoreMean(entries)!, 1)} / 10`
          }
        />
        {highest && (
          <Row
            label="Høyest subjektiv score"
            value={`${number(dailyScore(highest), 1)} · ${fullDay(highest.day)}`}
          />
        )}
        {lowest && (
          <Row
            label="Lavest subjektiv score"
            value={`${number(dailyScore(lowest), 1)} · ${fullDay(lowest.day)}`}
          />
        )}
        <Text style={{ color: theme.text, fontWeight: "600" }}>
          Mest registrerte symptomer
        </Text>
        {symptomCounts.length ? (
          symptomCounts.map(([symptom, count]) => (
            <Row
              key={symptom}
              label={symptom}
              value={`${count} av ${entries.length} dager`}
            />
          ))
        ) : (
          <Copy>Ingen symptomer logget i utvalget.</Copy>
        )}
        <Text style={{ color: theme.text, fontWeight: "600" }}>
          Utvikling mellom perioder
        </Text>
        {[
          { value: week, label: "Siste 7 hele dager mot de 7 foregående" },
          {
            value: monthComparison,
            label: "Siste 30 hele dager mot de 30 foregående",
          },
        ].map((item) => (
          <View key={item.label} style={{ gap: 5 }}>
            <Copy small>{item.label}</Copy>
            <Copy>
              {item.value
                ? `${item.value.delta > 0 ? "+" : ""}${number(item.value.delta, 1)} poeng i snittscore. ${item.value.current} og ${item.value.previous} registrerte dager i periodene.`
                : "Krever minst tre registrerte dager i hver periode."}
            </Copy>
          </View>
        ))}
        <Text style={{ color: theme.text, fontWeight: "600" }}>
          Mulige sammenhenger
        </Text>
        {correlation ? (
          <Copy>
            {seriesLabel(correlation.a)} og {seriesLabel(correlation.b)} har r ={" "}
            {number(correlation.r, 2)} i {correlation.count} registrerte dager.
            Dette er den største absolutte samvariasjonen blant de 15 parene i
            utvalget, ikke en årsakssammenheng. Få registreringer kan gi
            ustabile tall. Stress bruker sin råverdi her.
          </Copy>
        ) : (
          <Copy>
            Samvariasjon vises fra sju registrerte dager med variasjon i
            målingene. Utvalget har for få dager eller for liten variasjon nå.
          </Copy>
        )}
      </Card>
      <Card>
        <Title
          text="Ta vare på dagsformen"
          icon="document-outline"
          color={theme.mint}
        />
        <Copy small>
          Eksporter eller importer dagsform som JSON. Eksisterende datoer
          beholdes ved import. Andre typer logger påvirkes ikke.
        </Copy>
        <Button
          label="Eksporter dagsform som JSON"
          secondary
          disabled={fileBusy || !journal.available || !all.length}
          onPress={() => void exportFile()}
        />
        <Button
          label="Importer dagsform fra JSON"
          secondary
          disabled={fileBusy || journal.busy || !journal.available}
          onPress={() => void importFile()}
        />
        {fileBusy && <Copy small>Behandler fil …</Copy>}
        {fileError && (
          <Text accessibilityRole="alert" style={{ color: theme.coral }}>
            {fileError}
          </Text>
        )}
      </Card>
      <DailyFormSheet day={editing} onClose={() => setEditing(undefined)} />
    </View>
  );
});
