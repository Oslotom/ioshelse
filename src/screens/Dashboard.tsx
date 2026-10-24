import React, { useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useJournal } from "../data/journal-store";
import { DailyFormOverview } from "../components/DailyFormOverview";
import { JournalKPIs } from "../components/JournalKPIs";
import {
  GraphFilter,
  graphSelectionLabel,
  useGraphSelection,
} from "../components/GraphFilter";
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
import { compareGraphSteps } from "../data/graph-range";
import { nightSleep, sleepHistory, sleepTime } from "../data/sleep";
import { Chart, Ring, SleepTimeline } from "../components/Charts";
import {
  BigValue,
  Button,
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
  const stepSelection = useGraphSelection(phoneOnly),
    pulseSelection = useGraphSelection(phoneOnly),
    motionSelection = useGraphSelection(phoneOnly),
    trendSelection = useGraphSelection(phoneOnly, "Uke");
  const { date, period, range } = stepSelection;
  const today = startOfDay(new Date()),
    tomorrow = addDays(today, 1);
  const rows = inRange(data.steps, range.start, range.end),
    steps = sum(rows),
    distance = inRange(data.distance, range.start, range.end);
  const hours = inRange(data.hourly, range.start, range.end),
    chartSteps = period === "Dag" && hours.length ? hours : rows;
  const pulse = inRange(
      data.pulse,
      pulseSelection.range.start,
      pulseSelection.range.end,
    ),
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
  const comparison = compareGraphSteps(data.steps, trendSelection.range);
  const trendRows = inRange(
    data.steps,
    trendSelection.range.start,
    trendSelection.range.end,
  );
  const motionDistance = inRange(
    data.distance,
    motionSelection.range.start,
    motionSelection.range.end,
  );
  const energy = inRange(
      data.energy,
      motionSelection.range.start,
      motionSelection.range.end,
    ),
    exercise = inRange(
      data.exercise,
      motionSelection.range.start,
      motionSelection.range.end,
    );
  const motionSeries = energy.length
    ? energy
    : exercise.length
      ? exercise
      : motionDistance.map((reading) => ({
          ...reading,
          value: reading.value * (preferences.miles ? 0.621371 : 1),
        }));
  const motionUnit = energy.length
    ? "kcal"
    : exercise.length
      ? "min"
      : preferences.miles
        ? "mi"
        : "km";
  const hour = new Date().getHours(),
    greeting =
      hour >= 5 && hour < 10
        ? "God morgen"
        : hour >= 10 && hour < 18
          ? "God dag"
          : "God kveld";
  const chosenDay = startOfDay(date),
    isToday = +chosenDay === +today;
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
      <DailyFormOverview />
      <Status />
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
        summary={`${rows.length ? `${number(steps)} skritt` : "Ingen data"} · ${graphSelectionLabel(stepSelection)}`}
        filter={<GraphFilter selection={stepSelection} label="skritt" />}
        sparkline={chartSteps}
        maxGap={period === "Dag" && hours.length ? 90 * 60000 : 36 * 3600000}
        sparklineLabel="Skritt i valgt periode"
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
        summary={`${latest ? `${number(latest.value)} slag/min` : "Ingen pulsmålinger"} · ${graphSelectionLabel(pulseSelection)}`}
        filter={<GraphFilter selection={pulseSelection} label="puls" />}
        sparkline={pulse}
        maxGap={15 * 60000}
        sparklineLabel="Registrerte pulsmålinger"
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
        summary={`Energi, trening og distanse · ${graphSelectionLabel(motionSelection)}`}
        filter={<GraphFilter selection={motionSelection} label="aktivitet" />}
        sparkline={motionSeries}
        sparklineLabel={`Registrert aktivitet i ${motionUnit}`}
      >
        {(phoneOnly || importedOnly) && (
          <Copy small>
            Denne datakilden leverer bare skritt. Vi beregner ikke kalorier,
            treningsminutter eller distanse fra skrittene.
          </Copy>
        )}
        {(["energy", "exercise"] as const).map((key) => {
          const values = inRange(
            data[key],
            motionSelection.range.start,
            motionSelection.range.end,
          );
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
            motionDistance.length
              ? `${number(sum(motionDistance) * (preferences.miles ? 0.621371 : 1), 1)} ${preferences.miles ? "mi" : "km"}`
              : "Ingen data"
          }
        />
        {motionSeries.length > 0 && (
          <Chart
            data={motionSeries}
            color={theme.orange}
            theme={theme}
            unit={motionUnit}
          />
        )}
      </CollapsibleCard>
      <SleepCard />
      <CollapsibleCard
        title="Skritt over tid"
        icon="bar-chart"
        color={theme.mint}
        summary={`${trendRows.length ? `${number(mean(trendRows)!)} skritt per registrerte dag` : "Ingen data"} · ${graphSelectionLabel(trendSelection)}`}
        filter={
          <GraphFilter selection={trendSelection} label="skritt over tid" />
        }
        sparkline={trendRows}
        sparklineLabel="Daglige skrittsummer"
      >
        <Chart data={trendRows} color={theme.mint} theme={theme} />
        {trendRows.length > 0 && (
          <Row
            label="Snitt per registrerte dag"
            value={`${number(mean(trendRows)!)} skritt`}
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
export function SleepCard() {
  const { data, phoneOnly, importedOnly } = useHealth(),
    theme = useVitalTheme();
  const selection = useGraphSelection(phoneOnly),
    { date, period } = selection;
  const segments = nightSleep(data.sleep, date),
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
  const sparkline =
    period === "Dag"
      ? segments
          .filter((segment) => segment.asleep)
          .map((segment) => ({
            date: segment.start,
            value:
              (+new Date(segment.end) - +new Date(segment.start)) / 3600000,
          }))
      : recorded.map((night) => ({
          date: night.date,
          value: night.seconds / 3600,
        }));
  return (
    <CollapsibleCard
      title={period === "Dag" ? "Søvn denne natten" : "Søvn i perioden"}
      icon="moon"
      color={theme.lavender}
      summary={`${period === "Dag" ? (seconds > 0 ? sleepTime(seconds) : "Ingen søvndata") : average !== undefined ? `${sleepTime(average)} per registrerte natt` : "Ingen søvndata"} · ${graphSelectionLabel(selection)}`}
      filter={<GraphFilter selection={selection} label="søvn" />}
      sparkline={sparkline}
      maxGap={period === "Dag" ? 3 * 3600000 : 36 * 3600000}
      sparklineLabel={
        period === "Dag"
          ? "Varighet på registrerte søvnintervaller i timer"
          : "Registrert søvntid per natt"
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
