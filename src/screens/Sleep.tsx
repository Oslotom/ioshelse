import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHealth } from "../data/store";
import { nightSleep, sleepHistory, sleepTime } from "../data/sleep";
import { dateLabel, sleepDuration } from "../data/models";
import { SleepNight } from "../components/SleepNight";
import { dayKey } from "../data/daily-form";
import { Chart, SleepTimeline } from "../components/Charts";
import {
  Button,
  Card,
  Copy,
  Page,
  Row,
  Status,
  Title,
  useVitalTheme,
} from "../components/UI";

export function SleepScreen() {
  const { data, preferences, phoneOnly, importedOnly, setDemo } = useHealth(),
    theme = useVitalTheme();
  const [date, setDate] = useState(new Date());
  const [weekEnd, setWeekEnd] = useState(new Date());
  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const [trend, setTrend] = useState(false);
  const segments = nightSleep(data.sleep, date),
    seconds = sleepDuration(segments);
  const asleep = segments.filter((segment) => segment.asleep);
  const history = sleepHistory(data.sleep, date, period),
    recorded = history.filter((night) => night.seconds > 0);
  const average = recorded.length
    ? recorded.reduce((total, night) => total + night.seconds, 0) /
      recorded.length
    : undefined;
  const prior = history.slice(-7, -1).filter((night) => night.seconds > 0);
  const priorAverage = prior.length
    ? prior.reduce((total, night) => total + night.seconds, 0) / prior.length
    : undefined;
  const stages = ["Dyp", "Lett", "REM", "Søvn", "Våken"].filter((stage) =>
    segments.some((segment) => segment.stage === stage),
  );
  const missing = phoneOnly
    ? "iPhonens skritteller kan ikke registrere søvn. Vi beregner ikke søvn fra skrittene dine."
    : importedOnly
      ? "Den valgte importen inneholder bare skritt. Søvndata fra eksportfilen er ikke importert."
      : "Ingen søvnregistreringer for denne natten. Søvn kan leses fra Apple Helse i et native iOS-bygg når data og lesetilgang finnes.";
  return (
    <Page>
      <Status />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Copy>Natten til</Copy>
        <DateTimePicker
          value={date}
          maximumDate={new Date()}
          mode="date"
          locale="nb-NO"
          themeVariant={theme.dark ? "dark" : "light"}
          onChange={(_, value) => {
            if (value) { setDate(value); setWeekEnd(value); }
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 5 }}>
        {sleepHistory(data.sleep, weekEnd, 7).map((night) => {
          const value = new Date(night.date), selected = dayKey(value) === dayKey(date);
          return <Pressable key={night.date} accessibilityRole="button"
            accessibilityLabel={`${dateLabel(value)}. ${night.seconds > 0 ? sleepTime(night.seconds) : "Ingen data"}`}
            accessibilityState={{ selected }} onPress={() => setDate(value)}
            style={{ flex: 1, minHeight: 64, borderRadius: 17, alignItems: "center", justifyContent: "center", gap: 6,
              backgroundColor: selected ? theme.lavender : theme.card }}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, color: selected ? "#FFFFFF" : theme.secondary }}>{value.toLocaleDateString("nb-NO", { weekday: "narrow" })}</Text>
            <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 15, fontWeight: "600", color: selected ? "#FFFFFF" : theme.text }}>{value.getDate()}</Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: night.seconds > 0 ? selected ? "#FFFFFF" : theme.lavender : theme.track }} />
          </Pressable>;
        })}
      </View>
      <Card>
        <Title text="Din natt, i oversikt" icon="moon" color={theme.lavender} />
        {seconds > 0 ? (
          <>
            <SleepNight segments={segments} />
            <SleepTimeline segments={segments} theme={theme} />
            {priorAverage !== undefined && (
              <Copy>
                {sleepTime(Math.abs(seconds - priorAverage))}{" "}
                {seconds >= priorAverage ? "mer" : "mindre"} enn snittet for{" "}
                {prior.length} tidligere registrerte netter i perioden.
              </Copy>
            )}
            <Copy small>
              Tidene viser registreringer, ikke nødvendigvis når du la deg eller
              sto opp. Overlappende søvnintervaller telles bare én gang.
            </Copy>
          </>
        ) : (
          <>
            <View style={{ paddingVertical: 16, gap: 8 }}>
              <Text
                style={{ color: theme.text, fontSize: 24, fontWeight: "600" }}
              >
                Ingen søvndata denne natten
              </Text>
              <Copy>{missing}</Copy>
            </View>
            {!preferences.demo && (
              <>
                <Button
                  label="Utforsk søvn med demodata"
                  secondary
                  onPress={() => void setDemo(true)}
                />
                <Copy small>
                  Dette bytter hele appen til tydelig merkede demodata. Dine
                  lagrede data blir beholdt.
                </Copy>
              </>
            )}
          </>
        )}
      </Card>
      {segments.length > 0 && (
        <Card>
          <Title
            text="Registrerte søvnfaser"
            icon="layers-outline"
            color={theme.lavender}
          />
          {stages.map((stage) => {
            const matching = segments.filter(
              (segment) => segment.stage === stage,
            );
            const duration = sleepDuration(
              matching.map((segment) => ({ ...segment, asleep: true })),
            );
            return (
              <View key={stage} style={{ gap: 7 }}>
                <Row label={stage === "Søvn" ? "Søvn · uten faseinndeling" : stage} value={sleepTime(duration)} />
                <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.track, overflow: "hidden" }}>
                  <View style={{ height: 5, borderRadius: 3, width: `${Math.min(100, duration / Math.max(1, seconds) * 100)}%`,
                    backgroundColor: stage === "Våken" ? theme.orange : stage === "Dyp" ? theme.lavender : theme.mint }} />
                </View>
              </View>
            );
          })}
          <Copy small>
            Kun registrerte faser vises. Fasetider kan overlappe i kildedata og
            skal ikke summeres til total søvntid. Våken tid regnes ikke som
            søvn.
          </Copy>
        </Card>
      )}
      <Card>
        <Title
          text="Søvn over tid"
          icon="bar-chart-outline"
          color={theme.lavender}
        />
        <View style={{ flexDirection: "row", backgroundColor: theme.track, borderRadius: 12, padding: 4 }}>
          {([7, 30, 90] as const).map((days) => <Pressable key={days} accessibilityRole="tab"
            accessibilityState={{ selected: period === days }} onPress={() => setPeriod(days)}
            style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: period === days ? theme.card : "transparent" }}>
            <Text style={{ color: period === days ? theme.lavender : theme.secondary, fontSize: 13, fontWeight: "600" }}>{days} netter</Text>
          </Pressable>)}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "700", fontSize: 24 }}>{average === undefined ? "–" : sleepTime(average)}</Text>
            <Copy small>Gjennomsnitt · {recorded.length} registrerte netter</Copy>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={trend ? "Vis søvn som søyler" : "Vis søvn som linje"}
            onPress={() => setTrend((current) => !current)} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, backgroundColor: theme.lavender + "15", borderRadius: 12 }}>
            <Text style={{ color: theme.lavender, fontSize: 12 }}>{trend ? "Vis søyler" : "Vis linje"}</Text>
          </Pressable>
        </View>
        <Chart
          line={trend}
          maxGap={36 * 3600000}
          data={recorded.map((night) => ({
            date: night.date,
            value: night.seconds / 3600,
          }))}
          color={theme.lavender}
          theme={theme}
          unit="timer"
          digits={2}
        />
        <Copy small>
          Netter uten data er ikke null timer og inngår ikke i snittet. Hver
          natt avgrenses fra kl. 12 dagen før til kl. 12 på valgt dato.
        </Copy>
        {history
          .slice(-7)
          .reverse()
          .map((night) => (
            <Row
              key={night.date}
              label={dateLabel(night.date)}
              value={
                night.seconds > 0 ? sleepTime(night.seconds) : "Ingen data"
              }
            />
          ))}
      </Card>
      <Card>
        <Title
          text="Forstå søvnoversikten"
          icon="information-circle-outline"
          color={theme.lavender}
        />
        <Copy>
          Se etter mønstre over flere registrerte netter. En natt med manglende
          data forteller ikke hvor mye du har sovet.
        </Copy>
        <Copy>
          Søvnfaser krever en kilde som registrerer dem. Uten faseinndeling
          viser VITAL tilgjengelig søvntid, uten å finne på dyp søvn eller REM.
        </Copy>
        <Copy small>
          VITAL gir ingen medisinske vurderinger eller søvnscore. Målingene kan
          være ufullstendige og bør leses sammen med hvordan du selv opplever
          natten.
        </Copy>
      </Card>
    </Page>
  );
}
