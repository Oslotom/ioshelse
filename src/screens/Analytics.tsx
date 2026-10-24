import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHealth } from "../data/store";
import {
  addDays,
  change,
  dailyMean,
  dateLabel,
  inRange,
  mean,
  monthly,
  movingAverage,
  number,
  Reading,
  startOfDay,
  sum,
} from "../data/models";
import {
  BigValue,
  Card,
  Copy,
  Page,
  Row,
  Status,
  Title,
  useVitalTheme,
  WeekSummary,
} from "../components/UI";
import { Chart, Heatmap } from "../components/Charts";

export function Segments<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useVitalTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        backgroundColor: theme.track,
        padding: 4,
        borderRadius: 13,
        gap: 3,
      }}
    >
      {values.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="tab"
          accessibilityState={{ selected: item === value }}
          onPress={() => onChange(item)}
          style={{
            flex: 1,
            paddingVertical: 10,
            alignItems: "center",
            borderRadius: 10,
            backgroundColor: item === value ? theme.card : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: item === value ? theme.text : theme.secondary,
            }}
          >
            {item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const periods = ["Dag", "Uke", "Måned", "6 md.", "År"] as const;
export function StepsDetail() {
  const { data, preferences, phoneOnly, importedOnly, importInfo } =
      useHealth(),
    theme = useVitalTheme();
  const [selectedPeriod, setPeriod] = useState<(typeof periods)[number]>("Uke");
  const period = phoneOnly && selectedPeriod !== "Dag" ? "Uke" : selectedPeriod;
  const [endDate, setEndDate] = useState(new Date());
  useEffect(() => {
    if (importedOnly && importInfo)
      setEndDate(new Date(Math.min(Date.now(), +new Date(importInfo.to))));
  }, [importedOnly, importInfo?.importedAt]);
  const today = startOfDay(importedOnly ? endDate : new Date()),
    end = addDays(today, 1);
  let start = addDays(
    today,
    period === "Dag" ? 0 : period === "Uke" ? -6 : period === "Måned" ? -29 : 0,
  );
  if (period === "6 md." || period === "År") {
    start = new Date(today);
    start.setMonth(start.getMonth() - (period === "År" ? 12 : 6));
  }
  const rows = inRange(data.steps, start, end),
    total = sum(rows),
    months = period === "6 md." || period === "År";
  const chart =
    period === "Dag"
      ? inRange(data.hourly, today, end)
      : months
        ? monthly(rows)
        : rows;
  const best = rows.reduce<Reading | undefined>(
    (a, b) => (!a || b.value > a.value ? b : a),
    undefined,
  );
  const completeEnd = today,
    length = Math.round(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86400000,
    );
  const current = inRange(data.steps, start, completeEnd),
    previous = inRange(data.steps, addDays(start, -length), start);
  const comparison =
    length > 0 && current.length === length && previous.length === length
      ? change(sum(current), sum(previous))
      : undefined;
  const averages = movingAverage(data.steps).filter(
    (r) => new Date(r.date) >= start && new Date(r.date) < end,
  );
  return (
    <Page>
      <Status />
      {importedOnly && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Copy>Historikk til og med</Copy>
          <DateTimePicker
            value={endDate}
            mode="date"
            locale="nb-NO"
            maximumDate={new Date()}
            themeVariant={theme.dark ? "dark" : "light"}
            onChange={(_, date) => {
              if (date) setEndDate(date);
            }}
          />
        </View>
      )}
      <Segments
        values={phoneOnly ? ["Dag", "Uke"] : periods}
        value={period}
        onChange={setPeriod}
      />
      <Card>
        <Copy>
          {dateLabel(start)}–{dateLabel(today)}
        </Copy>
        <BigValue value={rows.length ? number(total) : "–"} unit="skritt" />
        <Chart
          data={chart}
          theme={theme}
          color={theme.mint}
          average={
            preferences.average && !months && period !== "Dag" ? averages : []
          }
        />
        {months && (
          <Copy small>
            Månedlige summer. Første og siste måned kan være ufullstendige.
          </Copy>
        )}
        {preferences.average && !months && period !== "Dag" && (
          <Copy small>Oransje linje: sjudagers glidende snitt.</Copy>
        )}
        {period === "Dag" && (
          <Copy small>
            {importedOnly
              ? "Importerte skritt fordelt etter målingens starttime."
              : "Skritt per time i dag."}
          </Copy>
        )}
      </Card>
      <Card>
        <Title text="Perioden i tall" icon="stats-chart" color={theme.mint} />
        <Row
          label="Snitt per registrerte dag"
          value={rows.length ? `${number(mean(rows)!)} skritt` : "Ingen data"}
        />
        <Row label="Registrerte dager" value={`${rows.length}`} />
        <Row
          label="Distanse"
          value={
            inRange(data.distance, start, end).length
              ? `${number(sum(inRange(data.distance, start, end)) * (preferences.miles ? 0.621371 : 1), 1)} ${preferences.miles ? "mi" : "km"}`
              : "Ingen data"
          }
        />
        <Row
          label="Beste dag"
          value={
            best
              ? `${number(best.value)} · ${dateLabel(best.date)}`
              : "Ingen data"
          }
        />
        <Row
          label="Mål nådd"
          value={`${rows.filter((r) => r.value >= preferences.goal).length} av ${rows.length} dager`}
        />
        <Copy small>
          Dager uten registrerte målinger inngår ikke i snittet. Siste dag kan
          være ufullstendig. Historikken bruker ditt nåværende mål.
        </Copy>
        {comparison !== undefined && (
          <Copy>
            {number(Math.abs(comparison))} %{" "}
            {comparison >= 0 ? "flere" : "færre"} skritt enn forrige like lange
            periode.{" "}
            {importedOnly
              ? "Siste valgte dag er utelatt fra sammenligningen."
              : "Dagens ufullstendige tall er utelatt."}
          </Copy>
        )}
      </Card>
      <Card>
        <Title text="Aktivitetskalender" icon="calendar" color={theme.mint} />
        <Heatmap
          data={data.steps}
          goal={preferences.goal}
          theme={theme}
          days={phoneOnly ? 7 : 91}
          endDate={today}
        />
      </Card>
    </Page>
  );
}
export function HeartDetail() {
  const { data, phoneOnly } = useHealth(),
    theme = useVitalTheme();
  const [period, setPeriod] = useState("Dag"),
    [date, setDate] = useState(new Date());
  const days = period === "Dag" ? 1 : period === "7 dager" ? 7 : 30,
    start = addDays(startOfDay(date), 1 - days),
    end = addDays(startOfDay(date), 1);
  const readings = inRange(data.pulse, start, end),
    latest = readings.at(-1),
    resting = inRange(data.resting, start, end),
    hrv = inRange(data.hrv, start, end);
  return (
    <Page>
      <Status />
      <Segments
        values={["Dag", "7 dager", "30 dager"]}
        value={period}
        onChange={setPeriod}
      />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Copy>Til og med</Copy>
        <DateTimePicker
          value={date}
          onChange={(_, d) => {
            if (d) setDate(d);
          }}
          maximumDate={new Date()}
          mode="date"
          locale="nb-NO"
          themeVariant={theme.dark ? "dark" : "light"}
        />
      </View>
      <Card>
        <Title text="Registrert puls" icon="heart" color={theme.coral} />
        {latest ? (
          <>
            <BigValue value={number(latest.value)} unit="slag/min" />
            <Copy small>
              Siste måling {dateLabel(latest.date, true)} · {latest.source}
            </Copy>
            <Chart
              data={readings}
              color={theme.coral}
              theme={theme}
              line
              unit="slag/min"
            />
            <Row
              label="Laveste / høyeste"
              value={`${number(readings.reduce((v, r) => Math.min(v, r.value), Infinity))} / ${number(readings.reduce((v, r) => Math.max(v, r.value), 0))}`}
            />
            <Copy small>
              Punkter viser registrerte målinger. Opphold over 15 minutter gir
              brudd i linjen.
            </Copy>
          </>
        ) : (
          <Copy>
            {phoneOnly
              ? "Puls, hvilepuls og HRV er ikke tilgjengelig fra iPhonens skritteller. Ekte skrittdata inneholder ingen pulsmålinger."
              : "Ingen pulsmålinger i perioden. En kompatibel klokke eller pulsmåler kan legge målinger i Helse."}
          </Copy>
        )}
      </Card>
      <Card>
        <Title text="Hvilepuls" icon="heart-outline" color={theme.coral} />
        <Chart
          data={resting}
          theme={theme}
          color={theme.coral}
          unit="slag/min"
        />
        {mean(resting) !== undefined && (
          <Row
            label="Gjennomsnitt"
            value={`${number(mean(resting)!)} slag/min`}
          />
        )}
        <Row
          label="HRV · gjennomsnitt"
          value={hrv.length ? `${number(mean(hrv)!, 1)} ms` : "Ingen data"}
        />
      </Card>
      {data.workouts
        .filter((w) => new Date(w.date) >= start && new Date(w.date) < end)
        .slice(-5)
        .map((w) => {
          const samples = inRange(
            readings,
            new Date(w.date),
            new Date(+new Date(w.date) + w.minutes * 60000),
          );
          return (
            <Card key={w.id}>
              <Title text={w.name} icon="fitness" color={theme.coral} />
              <Row
                label="Puls under økten"
                value={
                  samples.length
                    ? `${number(mean(samples)!)} slag/min`
                    : "Ingen pulsmålinger"
                }
              />
              <Copy small>
                {dateLabel(w.date, true)} · gjennomsnitt av registrerte målinger
                i øktens tidsrom.
              </Copy>
            </Card>
          );
        })}
      <Copy small>
        VITAL viser registrerte helseopplysninger og gir ingen medisinske
        vurderinger.
      </Copy>
    </Page>
  );
}
export function Activity({ onSteps }: { onSteps: () => void }) {
  const { data, phoneOnly } = useHealth(),
    theme = useVitalTheme(),
    today = startOfDay(new Date()),
    week = addDays(today, -6);
  return (
    <Page>
      <Status />
      {phoneOnly && (
        <Card>
          <Copy>
            Skrittelleren gir ekte skritt, men ikke energiforbruk,
            treningsminutter eller treningsøkter. Feltene under står tomme.
          </Copy>
        </Card>
      )}
      <Card onPress={onSteps} label="Åpne skrittanalysen">
        <Title text="Skritt og distanse" icon="footsteps" color={theme.mint} />
        <BigValue
          value={
            data.steps.length
              ? number(sum(inRange(data.steps, today, addDays(today, 1))))
              : "–"
          }
          unit="skritt"
        />
        <Copy>Se perioder og detaljer →</Copy>
      </Card>
      <Card>
        <Title
          text="Aktiv energi · siste sju dager"
          icon="flame"
          color={theme.orange}
        />
        <Chart
          data={inRange(data.energy, week, addDays(today, 1))}
          color={theme.orange}
          theme={theme}
          unit="kcal"
        />
      </Card>
      <Card>
        <Title
          text="Trening · siste sju dager"
          icon="fitness"
          color={theme.orange}
        />
        <Chart
          data={inRange(data.exercise, week, addDays(today, 1))}
          color={theme.orange}
          theme={theme}
          unit="min"
        />
      </Card>
      <Card>
        <Title text="Siste treningsøkter" icon="walk" color={theme.orange} />
        {data.workouts.length ? (
          data.workouts
            .slice(-10)
            .reverse()
            .map((w) => (
              <View key={w.id} style={{ gap: 5 }}>
                <Row label={w.name} value={`${number(w.minutes)} min`} />
                <Copy small>{dateLabel(w.date, true)}</Copy>
              </View>
            ))
        ) : (
          <Copy>Ingen registrerte treningsøkter.</Copy>
        )}
      </Card>
    </Page>
  );
}
export function Trends() {
  const { data, preferences, phoneOnly } = useHealth(),
    theme = useVitalTheme(),
    today = startOfDay(new Date()),
    end = addDays(today, 1),
    week = inRange(data.steps, addDays(today, -6), end),
    month = inRange(data.steps, addDays(today, -29), end);
  const best = data.steps.reduce<Reading | undefined>(
    (a, b) => (!a || b.value > a.value ? b : a),
    undefined,
  );
  const groups = new Map<number, Reading[]>();
  data.steps.forEach((r) => {
    const day = new Date(r.date).getDay();
    groups.set(day, [...(groups.get(day) ?? []), r]);
  });
  const weekday = [...groups].sort((a, b) => mean(b[1])! - mean(a[1])!)[0];
  const distance = inRange(data.distance, addDays(today, -6), end).map((r) => ({
    ...r,
    value: r.value * (preferences.miles ? 0.621371 : 1),
  }));
  const resting = inRange(data.resting, addDays(today, -29), end),
    earlier = inRange(data.resting, addDays(today, -59), addDays(today, -29));
  return (
    <Page>
      <Status />
      <Card>
        <Title
          text="Små steg. Store mønstre."
          icon="trending-up"
          color={theme.mint}
        />
        <WeekSummary />
        <Copy>
          Du har nådd skrittmålet på{" "}
          {week.filter((r) => r.value >= preferences.goal).length} av{" "}
          {week.length} registrerte dager den siste uken.
        </Copy>
        {weekday && data.steps.length >= 14 && (
          <Copy>
            Du går i snitt mest på{" "}
            {new Date(2026, 0, 4 + weekday[0]).toLocaleDateString("nb-NO", {
              weekday: "long",
            })}
            . Basert på registrert historikk.
          </Copy>
        )}
        {best && (
          <>
            <Row
              label="Personlig beste i hentet historikk"
              value={number(best.value)}
            />
            <Copy small>{dateLabel(best.date)}</Copy>
          </>
        )}
      </Card>
      <Card>
        <Title
          text={
            phoneOnly ? "Skritt · siste sju dager" : "Skritt · siste 30 dager"
          }
          icon="footsteps"
          color={theme.mint}
        />
        <Chart data={month} theme={theme} color={theme.mint} />
      </Card>
      {phoneOnly && (
        <Copy>
          Skrittelleren gir ikke distanse eller hvilepuls. Vi viser ingen
          beregnede erstatninger for disse målingene.
        </Copy>
      )}
      <Card>
        <Title
          text="Distanse · siste sju dager"
          icon="location"
          color={theme.mint}
        />
        <Chart
          data={distance}
          theme={theme}
          color={theme.mint}
          unit={preferences.miles ? "mi" : "km"}
        />
      </Card>
      <Card>
        <Title
          text="Hvilepuls · siste 30 dager"
          icon="heart"
          color={theme.coral}
        />
        <Chart
          data={resting}
          theme={theme}
          color={theme.coral}
          unit="slag/min"
        />
        {resting.length >= 20 && earlier.length >= 20 && (
          <Copy>
            Gjennomsnittlig hvilepuls er{" "}
            {number(Math.abs(mean(resting)! - mean(earlier)!), 1)} slag/min{" "}
            {mean(resting)! >= mean(earlier)! ? "høyere" : "lavere"} enn i de 30
            foregående dagene. Kun registrerte dager inngår.
          </Copy>
        )}
      </Card>
      <Card>
        <Title text="Din rytme" icon="calendar" color={theme.mint} />
        <Heatmap
          data={data.steps}
          goal={preferences.goal}
          theme={theme}
          days={phoneOnly ? 7 : 91}
        />
      </Card>
    </Page>
  );
}
