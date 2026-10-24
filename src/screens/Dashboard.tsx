import React, { useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
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
import { Chart, Ring, SleepTimeline } from "../components/Charts";
import {
  BigValue,
  Card,
  Copy,
  Heading,
  Page,
  Row,
  Status,
  Title,
  useVitalTheme,
  WeekSummary,
} from "../components/UI";

export type DashboardProps = {
  onSteps: () => void;
  onHeart: () => void;
  onSettings: () => void;
};
export function Dashboard({ onSteps, onHeart, onSettings }: DashboardProps) {
  const { data, preferences, phoneOnly } = useHealth(),
    theme = useVitalTheme(),
    today = startOfDay(new Date()),
    tomorrow = addDays(today, 1);
  const todayRows = inRange(data.steps, today, tomorrow),
    steps = sum(todayRows),
    distance = inRange(data.distance, today, tomorrow),
    latest = data.pulse.at(-1);
  const wasReached = useRef(steps >= preferences.goal),
    reached = steps >= preferences.goal;
  useEffect(() => {
    if (reached && !wasReached.current)
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    wasReached.current = reached;
  }, [reached]);
  const week = inRange(data.steps, addDays(today, -6), tomorrow),
    yesterday = inRange(data.steps, addDays(today, -1), today);
  const hour = new Date().getHours(),
    greeting =
      hour >= 5 && hour < 10
        ? "God morgen"
        : hour >= 10 && hour < 18
          ? "God dag"
          : "God kveld";
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
      <Status />
      <Card onPress={onSteps} label="Se skritt og aktivitetsdetaljer">
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Title text="Skritt i dag" icon="footsteps" color={theme.mint} />
          <Ionicons
            name="arrow-up-outline"
            size={17}
            color={theme.secondary}
            style={{ transform: [{ rotate: "45deg" }] }}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <BigValue value={todayRows.length ? number(steps) : "–"} />
            <Copy>av {number(preferences.goal)} skritt</Copy>
          </View>
          <Ring
            progress={steps / preferences.goal}
            goal={preferences.goal}
            theme={theme}
          />
        </View>
        <Chart
          data={inRange(data.hourly, today, tomorrow)}
          color={theme.mint}
          theme={theme}
          compact
        />
        <Row
          label={
            distance.length
              ? `${number(sum(distance) * (preferences.miles ? 0.621371 : 1), 1)} ${preferences.miles ? "mi" : "km"}`
              : "Ingen distansemålinger"
          }
          value={reached ? "Dagens mål er nådd!" : "Ett skritt om gangen"}
        />
        {todayRows.length > 0 && yesterday.length > 0 && (
          <Copy small>
            {number(Math.abs(steps - sum(yesterday)))}{" "}
            {steps >= sum(yesterday) ? "flere" : "færre"} skritt enn hele
            gårsdagen. Dagens tall er foreløpige.
          </Copy>
        )}
      </Card>
      <Card onPress={onHeart} label="Se pulsmålinger og historikk">
        <Title text="Puls" icon="heart" color={theme.coral} />
        {latest ? (
          <>
            <BigValue value={number(latest.value)} unit="slag/min" />
            <Chart
              data={inRange(
                data.pulse,
                startOfDay(new Date(latest.date)),
                addDays(startOfDay(new Date(latest.date)), 1),
              )}
              color={theme.coral}
              theme={theme}
              line
              compact
            />
            <Copy small>
              Siste måling {dateLabel(latest.date, true)} · {latest.source}
            </Copy>
          </>
        ) : (
          <Copy>
            {phoneOnly
              ? "Puls er ikke tilgjengelig fra iPhonens skritteller. Den gir bare skritt, ikke pulsmålinger."
              : "Ingen pulsmålinger. En Apple Watch eller kompatibel pulsmåler kan registrere puls i Helse."}
          </Copy>
        )}
      </Card>
      <Card>
        <Title text="I bevegelse" icon="flame" color={theme.orange} />
        {phoneOnly && (
          <Copy small>
            Skrittelleren leverer ikke distanse, kalorier eller
            treningsminutter. Vi lager ingen estimater fra skrittene.
          </Copy>
        )}
        {(["energy", "exercise"] as const).map((key) => {
          const rows = inRange(data[key], today, tomorrow);
          return (
            <Row
              key={key}
              label={key === "energy" ? "Aktiv energi" : "Trening"}
              value={
                rows.length
                  ? `${number(sum(rows))} ${key === "energy" ? "kcal" : "min"}`
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
      </Card>
      <SleepCard />
      <Card>
        <Title text="Uken din" icon="bar-chart" color={theme.mint} />
        <Chart data={week} color={theme.mint} theme={theme} />
        {week.length > 0 && (
          <Row
            label="Snitt per registrerte dag"
            value={`${number(mean(week)!)} skritt`}
          />
        )}
        <WeekSummary />
      </Card>
    </Page>
  );
}
export function SleepCard() {
  const { data, phoneOnly } = useHealth(),
    theme = useVitalTheme(),
    today = startOfDay(new Date()),
    from = new Date(+today - 12 * 3600000);
  const segments = data.sleep.filter((s) => new Date(s.start) >= from),
    seconds = sleepDuration(segments);
  const previous = Array.from({ length: 7 }, (_, i) => {
    const start = addDays(from, -i - 1),
      end = addDays(start, 1);
    return sleepDuration(
      data.sleep.filter(
        (s) => new Date(s.start) >= start && new Date(s.start) < end,
      ),
    );
  }).filter((v) => v > 0);
  return (
    <Card>
      <Title text="Søvn i natt" icon="moon" color={theme.lavender} />
      {seconds > 0 ? (
        <>
          <BigValue
            value={`${Math.floor(seconds / 3600)} t ${Math.floor((seconds % 3600) / 60)} min`}
          />
          <SleepTimeline segments={segments} theme={theme} />
          <View style={{ gap: 9 }}>
            {["Dyp", "Lett", "REM", "Søvn", "Våken"].map((stage) => {
              const stages = segments.filter((s) => s.stage === stage);
              if (!stages.length) return null;
              const total = stages.reduce(
                (a, s) => a + (+new Date(s.end) - +new Date(s.start)) / 60000,
                0,
              );
              return (
                <View
                  key={stage}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Text
                    style={{ width: 44, fontSize: 12, color: theme.secondary }}
                  >
                    {stage}
                  </Text>
                  <View
                    style={{
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: theme.lavender,
                      opacity: stage === "Dyp" ? 1 : 0.55,
                      flex: Math.max(0.05, total / (seconds / 60)),
                    }}
                  />
                  <Text style={{ fontSize: 12, color: theme.secondary }}>
                    {number(total)} min
                  </Text>
                </View>
              );
            })}
          </View>
          <Copy small>
            {dateLabel(segments[0]!.start, true)}–
            {new Date(segments.at(-1)!.end).toLocaleTimeString("nb-NO", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · registrert søvn
          </Copy>
          {previous.length > 0 && (
            <Copy small>
              Snitt for {previous.length} tidligere registrerte netter:{" "}
              {number(
                previous.reduce((a, b) => a + b, 0) / previous.length / 3600,
                1,
              )}{" "}
              t
            </Copy>
          )}
        </>
      ) : (
        <Copy>
          {phoneOnly
            ? "Søvn er ikke tilgjengelig fra iPhonens skritteller. Ingen søvntid eller søvnfaser blir beregnet fra skrittene dine."
            : "Ingen søvndata i natt. Registrer søvn med en kompatibel enhet eller i Helse. Søvnfaser vises bare når de finnes."}
        </Copy>
      )}
    </Card>
  );
}
