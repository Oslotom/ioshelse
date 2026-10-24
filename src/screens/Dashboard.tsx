import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useJournal } from "../data/journal-store";
import { JournalKPIs } from "../components/JournalKPIs";
import { CollapsibleCard } from "../components/CollapsibleCard";
import { useHealth } from "../data/store";
import {
  addDays,
  dateLabel,
  inRange,
  mean,
  number,
  sleepDuration,
  startOfDay,
  sum,
} from "../data/models";
import {
  compareGraphSteps,
  graphPeriods,
  GraphPeriod,
  graphRange,
} from "../data/graph-range";
import { nightSleep, sleepHistory, sleepTime } from "../data/sleep";
import { Chart, Ring, SleepTimeline } from "../components/Charts";
import {
  BigValue,
  Button,
  Card,
  Copy,
  Heading,
  Page,
  Row,
  Status,
  useVitalTheme,
} from "../components/UI";

export type DashboardProps = {
  onSteps: () => void;
  onHeart: () => void;
  onSettings: () => void;
};
export function Dashboard({ onSteps, onHeart, onSettings }: DashboardProps) {
  const journal = useJournal(),
    { data, preferences, phoneOnly, importedOnly } = useHealth(),
    theme = useVitalTheme();
  const [date, setDate] = useState(new Date()),
    [selectedPeriod, setPeriod] = useState<GraphPeriod>("Dag");
  const period =
    phoneOnly && selectedPeriod === "Måned" ? "Uke" : selectedPeriod;
  useEffect(() => {
    if (phoneOnly && date < addDays(startOfDay(new Date()), -6))
      setDate(addDays(startOfDay(new Date()), -6));
  }, [phoneOnly, date]);
  const range = graphRange(date, period),
    today = startOfDay(new Date()),
    tomorrow = addDays(today, 1);
  const rows = inRange(data.steps, range.start, range.end),
    steps = sum(rows),
    distance = inRange(data.distance, range.start, range.end);
  const hours = inRange(data.hourly, range.start, range.end),
    chartSteps = period === "Dag" && hours.length ? hours : rows;
  const pulse = inRange(data.pulse, range.start, range.end),
    latest = pulse.at(-1);
  const actualTodaySteps = sum(inRange(data.steps, today, tomorrow)),
    reached = actualTodaySteps >= preferences.goal,
    wasReached = useRef(reached);
  useEffect(() => {
    if (reached && !wasReached.current)
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    wasReached.current = reached;
  }, [reached]);
  const comparison = compareGraphSteps(data.steps, range);
  const hour = new Date().getHours(),
    greeting =
      hour >= 5 && hour < 10
        ? "God morgen"
        : hour >= 10 && hour < 18
          ? "God dag"
          : "God kveld";
  const chosenDay = startOfDay(date),
    isToday = +chosenDay === +today;
  function selectDate(next: Date) {
    setDate(phoneOnly && next < addDays(today, -6) ? addDays(today, -6) : next);
  }
  const formatDate = (value: Date) =>
    value.toLocaleDateString("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return (
    <Page>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ gap: 5 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 4,
              color: theme.secondary,
            }}
          >
            VITAL
          </Text>
          <Heading>{greeting}</Heading>
          <Copy>
            {new Date().toLocaleDateString("nb-NO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Copy>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Åpne innstillinger"
          onPress={onSettings}
          hitSlop={15}
        >
          <Ionicons
            name="person-circle-outline"
            size={37}
            color={theme.secondary}
          />
        </Pressable>
      </View>
      <JournalKPIs
        entries={journal.data.entries}
        ready={journal.available}
        loading={journal.loading}
      />
      <Status />
      <Card style={{ padding: 16, gap: 12 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "600" }}>
            Dato for grafene
          </Text>
          <DateTimePicker
            value={date}
            maximumDate={new Date()}
            minimumDate={phoneOnly ? addDays(today, -6) : undefined}
            mode="date"
            locale="nb-NO"
            themeVariant={theme.dark ? "dark" : "light"}
            onChange={(_, value) => {
              if (value) selectDate(value);
            }}
          />
        </View>
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: "row",
            gap: 6,
            backgroundColor: theme.track,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {graphPeriods
            .filter((value) => !phoneOnly || value !== "Måned")
            .map((value) => (
              <Pressable
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: period === value }}
                onPress={() => setPeriod(value)}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderRadius: 9,
                  paddingVertical: 10,
                  backgroundColor:
                    period === value ? theme.card : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: period === value ? theme.text : theme.secondary,
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
        </View>
        <Copy small>
          {formatDate(range.start)}–{formatDate(chosenDay)}
          {period === "Dag" ? "" : ` · ${range.days} kalenderdager`}. Filteret
          gjelder grafene og målingene under. KPI-kortene bruker sine egne
          oppgitte perioder.
        </Copy>
        {phoneOnly && (
          <Copy small>
            Skrittelleren har bare sju dagers historikk. Dager uten data i
            valget står tomme.
          </Copy>
        )}
        {!isToday && (
          <Button
            label="Tilbake til i dag"
            secondary
            onPress={() => setDate(new Date())}
          />
        )}
      </Card>
      <CollapsibleCard
        title={
          period === "Dag"
            ? isToday
              ? "Skritt i dag"
              : "Skritt denne dagen"
            : "Skritt i perioden"
        }
        icon="footsteps"
        color={theme.mint}
        summary={rows.length ? `${number(steps)} skritt` : "Ingen data"}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <BigValue value={rows.length ? number(steps) : "–"} unit="skritt" />
            <Copy>
              {period === "Dag"
                ? `av ${number(preferences.goal)} skritt`
                : `${rows.filter((row) => row.value >= preferences.goal).length} av ${rows.length} registrerte dager med nådd mål`}
            </Copy>
          </View>
          {period === "Dag" && (
            <Ring
              progress={steps / preferences.goal}
              goal={preferences.goal}
              theme={theme}
            />
          )}
        </View>
        <Chart data={chartSteps} color={theme.mint} theme={theme} />
        <Copy small>
          {period === "Dag"
            ? hours.length
              ? "Registrerte skritt per time."
              : "Timefordeling mangler for denne dagen. Tilgjengelig døgnsum vises."
            : "Registrerte døgnsummer. Dager uten data fylles ikke med null."}
        </Copy>
        <Row
          label="Distanse i valget"
          value={
            distance.length
              ? `${number(sum(distance) * (preferences.miles ? 0.621371 : 1), 1)} ${preferences.miles ? "mi" : "km"}`
              : "Ingen data"
          }
        />
        <Copy small>
          Siste dag kan være ufullstendig. Historiske mål beregnes med ditt
          nåværende skrittmål.
        </Copy>
        <Button label="Åpne skrittanalyse" secondary onPress={onSteps} />
      </CollapsibleCard>
      <CollapsibleCard
        title="Puls"
        icon="heart"
        color={theme.coral}
        summary={
          latest ? `${number(latest.value)} slag/min` : "Ingen pulsmålinger"
        }
      >
        {latest ? (
          <>
            <BigValue value={number(latest.value)} unit="slag/min" />
            <Chart
              data={pulse}
              color={theme.coral}
              theme={theme}
              line
              unit="slag/min"
            />
            <Copy small>
              Siste måling i valget {dateLabel(latest.date, true)} ·{" "}
              {latest.source}
            </Copy>
            <Row
              label="Laveste / høyeste i valget"
              value={`${number(pulse.reduce((v, r) => Math.min(v, r.value), Infinity))} / ${number(pulse.reduce((v, r) => Math.max(v, r.value), 0))}`}
            />
          </>
        ) : (
          <Copy>
            {phoneOnly
              ? "Puls er ikke tilgjengelig fra iPhonens skritteller."
              : importedOnly
                ? "Importen inneholder bare skritt, ikke puls."
                : "Ingen registrerte pulsmålinger i valgt periode."}
          </Copy>
        )}
        <Button label="Åpne pulsanalyse" secondary onPress={onHeart} />
      </CollapsibleCard>
      <CollapsibleCard
        title="I bevegelse"
        icon="flame"
        color={theme.orange}
        summary="Energi, trening og distanse"
      >
        {(phoneOnly || importedOnly) && (
          <Copy small>
            Denne datakilden leverer bare skritt. Vi beregner ikke kalorier,
            treningsminutter eller distanse fra skrittene.
          </Copy>
        )}
        {(["energy", "exercise"] as const).map((key) => {
          const values = inRange(data[key], range.start, range.end);
          return (
            <Row
              key={key}
              label={key === "energy" ? "Aktiv energi" : "Trening"}
              value={
                values.length
                  ? `${number(sum(values))} ${key === "energy" ? "kcal" : "min"}`
                  : "Ingen data"
              }
            />
          );
        })}
        <Row
          label="Gå- og løpedistanse"
          value={
            distance.length
              ? `${number(sum(distance) * (preferences.miles ? 0.621371 : 1), 1)} ${preferences.miles ? "mi" : "km"}`
              : "Ingen data"
          }
        />
      </CollapsibleCard>
      <SleepCard date={date} period={period} />
      <CollapsibleCard
        title="Skritt over tid"
        icon="bar-chart"
        color={theme.mint}
        summary={
          rows.length
            ? `${number(mean(rows)!)} skritt per registrerte dag`
            : "Ingen data"
        }
      >
        <Chart data={rows} color={theme.mint} theme={theme} />
        {rows.length > 0 && (
          <Row
            label="Snitt per registrerte dag"
            value={`${number(mean(rows)!)} skritt`}
          />
        )}
        <Copy>
          {comparison
            ? `${number(Math.abs(comparison.percent))} % ${comparison.percent >= 0 ? "flere" : "færre"} skritt i ${comparison.days} hele dager fra valget enn i like mange foregående dager. Dagens ufullstendige tall er utelatt.`
            : "Sammenligning krever hele registrerte dager i både valgt og foregående periode. Dagens ufullstendige tall er utelatt."}
        </Copy>
      </CollapsibleCard>
    </Page>
  );
}
export function SleepCard({
  date = new Date(),
  period = "Dag",
}: {
  date?: Date;
  period?: GraphPeriod;
}) {
  const { data, phoneOnly, importedOnly } = useHealth(),
    theme = useVitalTheme(),
    segments = nightSleep(data.sleep, date),
    seconds = sleepDuration(segments);
  const history = sleepHistory(
      data.sleep,
      date,
      period === "Dag" ? 1 : period === "Uke" ? 7 : 30,
    ),
    recorded = history.filter((night) => night.seconds > 0);
  const average = recorded.length
    ? recorded.reduce((total, night) => total + night.seconds, 0) /
      recorded.length
    : undefined;
  return (
    <CollapsibleCard
      title={period === "Dag" ? "Søvn denne natten" : "Søvn i perioden"}
      icon="moon"
      color={theme.lavender}
      summary={
        period === "Dag"
          ? seconds > 0
            ? sleepTime(seconds)
            : "Ingen søvndata"
          : average !== undefined
            ? `${sleepTime(average)} per registrerte natt`
            : "Ingen søvndata"
      }
    >
      {period === "Dag" && seconds > 0 ? (
        <>
          <BigValue value={sleepTime(seconds)} />
          <SleepTimeline segments={segments} theme={theme} />
          {["Dyp", "Lett", "REM", "Søvn", "Våken"]
            .filter((stage) =>
              segments.some((segment) => segment.stage === stage),
            )
            .map((stage) => (
              <Row
                key={stage}
                label={stage}
                value={sleepTime(
                  sleepDuration(
                    segments
                      .filter((segment) => segment.stage === stage)
                      .map((segment) => ({ ...segment, asleep: true })),
                  ),
                )}
              />
            ))}
          <Copy small>
            Fasetider kan overlappe i registreringene og skal ikke summeres til
            totalen. Våken tid regnes ikke som søvn.
          </Copy>

          <Copy small>
            {dateLabel(segments[0]!.start, true)}–
            {dateLabel(segments.at(-1)!.end, true)} · tilgjengelige
            registreringer. Overlappende søvntid telles én gang.
          </Copy>
        </>
      ) : period !== "Dag" && recorded.length ? (
        <>
          <BigValue value={sleepTime(average!)} />
          <Copy>Snitt per registrerte natt</Copy>
          <Chart
            data={recorded.map((night) => ({
              date: night.date,
              value: night.seconds / 3600,
            }))}
            color={theme.lavender}
            theme={theme}
            unit="timer"
            digits={2}
          />
          <Row
            label="Netter med data"
            value={`${recorded.length} av ${history.length}`}
          />
          <Copy small>
            Netter uten data er ikke null timer og inngår ikke i snittet.
          </Copy>
        </>
      ) : (
        <Copy>
          {phoneOnly
            ? "Søvn er ikke tilgjengelig fra skrittelleren."
            : importedOnly
              ? "Importen inneholder bare skritt, ikke søvn."
              : "Ingen søvnregistreringer er lastet inn for valget."}
        </Copy>
      )}
    </CollapsibleCard>
  );
}
