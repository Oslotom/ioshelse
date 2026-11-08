import { percentTrend } from "../data/kpi-trends";
import { AIAnalysis } from "./AIAnalysis";
import { TotalScore } from "./TotalScore";
import { HealthDetailSheet } from "./HealthDetailSheet";
import { DrawingPath, GrowingBar, GraphReveal } from "./GraphReveal";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "./DatePicker";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useJournal } from "../data/journal-store";
import { useHealth } from "../data/store";
import {
  addDays,
  inRange,
  number,
  sum,
  dateLabel,
  startOfDay,
  sleepDuration,
} from "../data/models";
import { dailyEntries, dailyScore, dayKey } from "../data/daily-form";
import { sleepHistory, sleepTime } from "../data/sleep";
import { Entrance, useVitalTheme } from "./UI";

export function HealthHistory() {
  const journal = useJournal();
  const { data } = useHealth(),
    theme = useVitalTheme();
  const [detail, setDetail] = useState<"sleep" | "steps" | "form">();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [ending, setEnding] = useState(new Date());
  const [width, setWidth] = useState(280),
    [selected, setSelected] = useState<string>();
  const history = useMemo(() => sleepHistory(data.sleep, ending, days), [data.sleep, ending, days]);
  const example = !history.some((night) => night.seconds > 0);
  const forms = dailyEntries(journal.data.entries);
  const stepRows = inRange(data.steps, startOfDay(new Date(history[0]!.date)), addDays(startOfDay(ending), 1));
  const formRows = forms.filter((entry) => entry.day >= dayKey(new Date(history[0]!.date)) && entry.day <= dayKey(ending));
  const stepsExample = !stepRows.length;
  const formExample = !formRows.length;
  const rows = history.map((night, index) => {
    const date = startOfDay(new Date(night.date));
    const day = dayKey(date);
    const steps = inRange(stepRows, date, addDays(date, 1));
    const form = formRows.find((entry) => entry.day === day);
    const seconds = example ? Math.round([3.8, 9.6, 5.1, 7.4, 4.2, 10.3, 6.0, 8.8, 4.7, 6.4, 9.9, 5.5, 7.9, 3.6, 8.2, 10.1, 4.9, 6.8, 9.1, 5.8, 7.2, 4.0, 8.6, 6.1, 10.5, 5.3, 7.7, 4.5, 9.4, 6.6][index]! * 60) * 60 : night.seconds;
    const deep = example ? Math.round(seconds * [0.1, 0.29, 0.14, 0.25, 0.08, 0.32, 0.19, 0.27, 0.12, 0.22][index % 10]! / 60) * 60 : sleepDuration(night.segments.filter((segment) => segment.stage === "Dyp"));
    const rem = example ? Math.round(seconds * [0.16, 0.3, 0.23, 0.14, 0.28, 0.2, 0.33, 0.18, 0.26, 0.21][index % 10]! / 60) * 60 : sleepDuration(night.segments.filter((segment) => segment.stage === "REM"));
    const light = example ? seconds - deep - rem : sleepDuration(night.segments.filter((segment) => segment.stage === "Lett"));
    const stageScale = deep + rem + light > seconds ? seconds / (deep + rem + light) : 1;
    return {
      ...night, day, seconds,
      deep: deep * stageScale, rem: rem * stageScale, light: light * stageScale,
      unknown: Math.max(0, seconds - (deep + rem + light) * stageScale),
      sleepScore: example ? [78, 84, 63, 88, 72, 90, 93][index % 7]! : undefined,
      steps: stepsExample ? [1450, 19480, 3820, 12650, 620, 24180, 7340, 2150, 16320, 5890, 10840, 910, 22370, 8470, 4560, 17890, 1320, 11860, 26740, 6380, 2940, 15420, 9720, 780, 20160, 5230, 13780, 1860, 23450, 8020][index]! : steps.length ? sum(steps) : undefined,
      score: formExample ? [6.2, 7.4, 4.5, 8.1, 6.5, 9.2, 8.5][index % 7]! : form ? dailyScore(form) : undefined,
    };
  });
  const sleepRows = rows.filter((row) => row.seconds > 0);
  const scores = rows.flatMap((row) => row.score === undefined ? [] : [row.score]);
  const periodStart = startOfDay(new Date(history[0]!.date));
  const previousEnding = addDays(startOfDay(ending), -days);
  const priorNights = sleepHistory(data.sleep, previousEnding, days).filter((night) => night.seconds > 0);
  const priorForms = forms.filter((entry) => entry.day >= dayKey(addDays(periodStart, -days)) && entry.day <= dayKey(previousEnding));
  const meanOf = (values: number[]) => values.length ? values.reduce((total, value) => total + value, 0) / values.length : undefined;
  const completeEnd = new Date(Math.min(+addDays(startOfDay(ending), 1), +startOfDay(new Date())));
  const completeDays = Math.max(0, history.filter((night) => +new Date(night.date) < +completeEnd).length);
  const completeTotal = (start: Date, end: Date) => {
    const readings = inRange(data.steps, start, end);
    return completeDays > 0 && new Set(readings.map((row) => dayKey(new Date(row.date)))).size === completeDays ? sum(readings) : undefined;
  };
  const trends = [
    example ? undefined : percentTrend(meanOf(sleepRows.map((row) => row.seconds)), meanOf(priorNights.map((night) => night.seconds))),
    stepsExample ? undefined : percentTrend(completeTotal(periodStart, completeEnd), completeTotal(addDays(periodStart, -days), addDays(completeEnd, -days))),
    formExample ? undefined : percentTrend(meanOf(scores), meanOf(priorForms.map(dailyScore))),
  ];
  const stats = [
    { label: "S\u00f8vn", value: sleepRows.length ? sleepTime(sleepRows.reduce((total, row) => total + row.seconds, 0) / sleepRows.length) : "Ingen data", detail: "Snitt per natt", example, color: theme.lavender },
    { label: "Skritt", value: number(rows.reduce((total, row) => total + (row.steps ?? 0), 0)), detail: `Totalt siste ${days} dager`, example: stepsExample, color: theme.mint },
    { label: "Form", value: scores.length ? `${number(scores.reduce((total, score) => total + score, 0) / scores.length, 1)} / 10` : "Ingen data", detail: "Gjennomsnitt", example: formExample, color: theme.orange },
  ];
  const formColor = (score: number) => score < 5 ? theme.coral : score < 7 ? theme.orange : theme.mint;
  const accent = theme.blue;
  const plotWidth = Math.max(1, width - 32),
    x = (i: number) => 16 + (plotWidth * i) / (days - 1);
  const maxHours = Math.max(10, ...rows.map((row) => row.seconds / 3600));
  const maxSteps = Math.max(12500, ...rows.map((row) => row.steps ?? 0));
  const bottom = 182,
    height = 154,
    ySleep = (seconds: number) => bottom - (seconds / 3600 / maxHours) * height;
  const ySteps = (steps: number) => bottom - (steps / maxSteps) * height;
  const groups: number[][] = [];
  rows.forEach((row, index) => {
    if (row.steps === undefined) return;
    const last = groups.at(-1);
    if (last && last.at(-1) === index - 1) last.push(index);
    else groups.push([index]);
  });
  const sleepStages = [
    { key: "deep", label: "Dyp", color: theme.blue },
    { key: "rem", label: "REM", color: "#B0CCE7" },
    { key: "light", label: "Lett", color: theme.lightBlue },
    { key: "unknown", label: "Uspesifisert", color: theme.track },
  ] as const;
  const chosen = rows.find((row) => row.day === selected) ?? rows.at(-1)!;
  const choose = (position: number) =>
    setSelected(
      rows[
        Math.max(
          0,
          Math.min(days - 1, Math.round(((position - 16) / plotWidth) * (days - 1))),
        )
      ]!.day,
    );
  return (
    <View style={{ paddingVertical: 8, gap: 18 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {stats.map((stat, index) => (
          <Entrance delay={100 + index * 85} key={stat.label} style={{ flexGrow: 1, flexBasis: 90, paddingHorizontal: 12, paddingVertical: 16, gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Vis detaljer for ${stat.label}`} onPress={() => setDetail((["sleep", "steps", "form"] as const)[index])} style={{ gap: 8, minHeight: 60 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 5, height: 14, borderRadius: 3, backgroundColor: stat.color }} />
              <Text style={{ color: theme.secondary, fontSize: 12, fontWeight: "500" }}>{stat.label}</Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 21, letterSpacing: -0.6, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{stat.value}</Text>
            <Text style={{ color: trends[index] === undefined ? theme.secondary : stat.color, fontSize: 12, fontWeight: "600" }}>{trends[index] === undefined ? "Ingen sammenligning" : `${trends[index]! > 0 ? "↑ +" : trends[index]! < 0 ? "↓ −" : "→ "}${number(Math.abs(trends[index]!), 1)} %`}</Text>
            <Text style={{ color: theme.secondary, fontSize: 10 }}>{index === 1 ? `${completeDays} hele dager mot forrige periode` : `Snitt mot forrige ${days} dager`}</Text>
            </Pressable>
          </Entrance>
        ))}
      </View>
      {periodOpen && (
        <View
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.track,
            borderRadius: 16,
            padding: 10,
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", gap: 8 }}>
            {([7, 14, 30] as const).map((period) => (
              <Pressable key={period} accessibilityRole="radio" accessibilityState={{ checked: days === period }}
                onPress={() => { setDays(period); setSelected(undefined); setPeriodOpen(false); }}
                style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: days === period ? accent + "22" : theme.track }}>
                <Text style={{ color: days === period ? accent : theme.text, fontWeight: "600" }}>{period} dager</Text>
              </Pressable>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: theme.secondary, fontSize: 13 }}>
              Til og med
            </Text>
            <DateTimePicker
              value={ending}
              maximumDate={new Date()}
              mode="date"
              locale="nb-NO"
              themeVariant={theme.dark ? "dark" : "light"}
              onChange={(_, value) => {
                if (value) {
                  setEnding(startOfDay(value));
                  setSelected(undefined);
                  setPeriodOpen(false);
                }
              }}
            />
          </View>
        </View>
      )}
      <GraphReveal>
      <View
        style={{ marginTop: 8 }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Daglig søvn, skritt og form. Dra eller bruk neste og forrige dato."
        accessibilityValue={{
          text: `${example ? "Eksempeldata. " : ""}${dateLabel(chosen.date)}. ${chosen.seconds ? sleepTime(chosen.seconds) : "Ingen sove-data"}. Skritt: ${chosen.steps ?? "Ingen data"}${stepsExample ? " (eksempeldata)" : ""}. Form: ${chosen.score ?? "Ingen data"}${formExample ? " (eksempeldata)" : ""}`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Neste dato" },
          { name: "decrement", label: "Forrige dato" },
        ]}
        onAccessibilityAction={(event) => {
          const index = rows.indexOf(chosen);
          setSelected(
            rows[
              Math.max(
                0,
                Math.min(
                  days - 1,
                  index +
                    (event.nativeEvent.actionName === "increment" ? 1 : -1),
                ),
              )
            ]!.day,
          );
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => choose(event.nativeEvent.locationX)}
        onResponderMove={(event) => choose(event.nativeEvent.locationX)}
      >
        <Svg width={width} height={220}>
          <Defs>
            <LinearGradient id="stepsHistoryFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.mint} stopOpacity={0.3} />
              <Stop offset="0.6" stopColor={theme.mint} stopOpacity={0.12} />
              <Stop offset="1" stopColor={theme.mint} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          {rows.map((row, index) => {
            let accumulated = 0;
            return sleepStages.map((stage) => {
              const seconds = row[stage.key];
              const base = accumulated;
              accumulated += seconds;
              if (seconds <= 0) return null;
              return <GrowingBar key={`${row.day}-${stage.key}`} x={x(index) - Math.min(24, plotWidth / days * 0.48) / 2}
                y={ySleep(accumulated)} width={Math.min(24, plotWidth / days * 0.48)}
                height={Math.max(0, ySleep(base) - ySleep(accumulated))} rx={0} fill={stage.color} opacity={selected === row.day ? 1 : 0.85} />;
            });
          })}
          {
            groups.map((group, index) => {
              const path = group
                .map(
                  (i, j) =>
                    `${j ? "L" : "M"}${x(i)},${ySteps(rows[i]!.steps!)}`,
                )
                .join(" ");
              return (
                <React.Fragment key={index}>
                  {group.length > 1 && (
                    <DrawingPath
                      d={`${path} L${x(group.at(-1)!)},${bottom} L${x(group[0]!)},${bottom} Z`}
                      fill="url(#stepsHistoryFade)"
                    />
                  )}
                  <DrawingPath
                    d={path}
                    stroke={theme.mint}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {group.map((i) => (
                    <Circle
                      key={i}
                      cx={x(i)}
                      cy={ySteps(rows[i]!.steps!)}
                      r={rows[i]!.day === selected ? 4.5 : days === 30 ? 2.5 : 3.5}
                      fill={theme.mint}
                      stroke={theme.background}
                      strokeWidth={1.5}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          {selected && <Line
            x1={x(rows.indexOf(chosen))}
            x2={x(rows.indexOf(chosen))}
            y1={24}
            y2={bottom}
            stroke={theme.secondary}
            strokeDasharray="2 4"
            opacity={0.35}
          />}
          {rows.map((row, index) => (index === 0 || index === days - 1 || (index % Math.ceil((days - 1) / 5) === 0 && index < days - 3)) && (
            <React.Fragment key={row.day}>
              <SvgText
                x={x(index)}
                y={203}
                textAnchor={index === 0 ? "start" : index === days - 1 ? "end" : "middle"}
                fontSize={10}
                fill={theme.secondary}
              >
                {`${new Date(row.date).getDate()}.${String(new Date(row.date).getMonth() + 1).padStart(2, "0")}`}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 182 }}>
          {rows.map((row, index) => row.score !== undefined && (
            <View key={`form-${row.day}`} style={{ position: "absolute", left: x(index) - (days === 30 ? 8 : 12), top: bottom - ((row.score - 1) / 9) * height - 12,
              width: days === 30 ? 16 : 24, height: days === 30 ? 16 : 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
              <Ionicons name={row.score < 5 ? "sad-outline" : "happy-outline"}
                size={days === 30 ? 16 : days === 14 ? 20 : 24} color={formColor(row.score)} />
            </View>
          ))}
        </View>
      </View>
      </GraphReveal>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: theme.secondary, fontSize: 12 }}>{dateLabel(rows[0]!.date)} - {dateLabel(ending)}{example || stepsExample || formExample ? " \u00b7 Eksempeldata" : ""}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Velg periode og sluttdato" accessibilityState={{ expanded: periodOpen }}
          onPress={() => setPeriodOpen((open) => !open)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
          <Text style={{ color: theme.secondary, fontSize: 12 }}>{days} dager ⌄</Text>
        </Pressable>
      </View>
      <TotalScore rows={rows} example={example || stepsExample || formExample} />
      <AIAnalysis />
      {detail && <HealthDetailSheet metric={detail} rows={rows} example={detail === "sleep" ? example : detail === "steps" ? stepsExample : formExample} onClose={() => setDetail(undefined)} />}
    </View>
  );
}
