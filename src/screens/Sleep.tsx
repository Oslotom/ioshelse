import React, { useState } from "react";
import { View, Text } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHealth } from "../data/store";
import { nightSleep, sleepHistory, sleepTime } from "../data/sleep";
import { dateLabel, sleepDuration } from "../data/models";
import { Chart, SleepTimeline } from "../components/Charts";
import {
  BigValue,
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
  const segments = nightSleep(data.sleep, date),
    seconds = sleepDuration(segments);
  const asleep = segments.filter((segment) => segment.asleep);
  const history = sleepHistory(data.sleep, date),
    recorded = history.filter((night) => night.seconds > 0);
  const average = recorded.length
    ? recorded.reduce((total, night) => total + night.seconds, 0) /
      recorded.length
    : undefined;
  const prior = history.slice(0, -1).filter((night) => night.seconds > 0);
  const priorAverage = prior.length
    ? prior.reduce((total, night) => total + night.seconds, 0) / prior.length
    : undefined;
  const stages = ["Dyp", "Lett", "REM", "Søvn", "Våken"].filter((stage) =>
    segments.some((segment) => segment.stage === stage),
  );
  const time = (value: string) =>
    new Date(value).toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
            if (value) setDate(value);
          }}
        />
      </View>
      <Card>
        <Title text="Din natt, i oversikt" icon="moon" color={theme.lavender} />
        {seconds > 0 ? (
          <>
            <BigValue value={sleepTime(seconds)} />
            <Copy>Registrert søvntid · natten til {dateLabel(date)}</Copy>
            <SleepTimeline segments={segments} theme={theme} />
            <Row
              label="Første søvnregistrering"
              value={time(asleep[0]!.start)}
            />
            <Row
              label="Siste søvnregistrering"
              value={time(
                asleep.reduce(
                  (latest, segment) =>
                    segment.end > latest ? segment.end : latest,
                  asleep[0]!.end,
                ),
              )}
            />
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
              <Row
                key={stage}
                label={stage === "Søvn" ? "Søvn · uten faseinndeling" : stage}
                value={sleepTime(duration)}
              />
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
          text="Sju netter"
          icon="bar-chart-outline"
          color={theme.lavender}
        />
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
        {average !== undefined && (
          <>
            <Row
              label="Snitt per registrerte natt"
              value={sleepTime(average)}
            />
            <Row
              label="Netter med søvndata"
              value={`${recorded.length} av 7`}
            />
          </>
        )}
        <Copy small>
          Netter uten data er ikke null timer og inngår ikke i snittet. Hver
          natt avgrenses fra kl. 12 dagen før til kl. 12 på valgt dato.
        </Copy>
        {history
          .slice()
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
