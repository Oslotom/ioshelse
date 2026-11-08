import { kpiTrends } from "../data/kpi-trends";
import Ionicons from "@expo/vector-icons/Ionicons";
import { monthlyWorkoutCount } from "../data/journal-stats";
import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { JournalEntry } from "../data/journal";
import { dailyEntries, dailyScore, dayKey } from "../data/daily-form";
import { addDays, inRange, number, sleepDuration, startOfDay } from "../data/models";
import { nightSleep, sleepTime } from "../data/sleep";
import { useHealth } from "../data/store";
import { Card, Copy, useVitalTheme } from "./UI";

function Donut({ value, progress, color, size, label }: {
  value: string; progress?: number; color: string; size: number; label: string;
}) {
  const theme = useVitalTheme();
  const radius = (size - 12) / 2, circumference = 2 * Math.PI * radius;
  return <View accessible accessibilityLabel={label}
    style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
    <Svg width={size} height={size} style={{ position: "absolute" }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={theme.track} strokeWidth={6} />
      {progress !== undefined && progress > 0 && <Circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${circumference}`}
        strokeDashoffset={circumference * (1 - Math.min(1, Math.max(0, progress)))}
        rotation={-90} origin={`${size / 2},${size / 2}`} />}
    </Svg>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} maxFontSizeMultiplier={1.3} style={{ maxWidth: size - 20, fontSize: 17, fontWeight: "700", color: theme.text, fontVariant: ["tabular-nums"] }}>{value}</Text>
  </View>;
}

export function JournalKPIs({ entries, ready, loading }: {
  entries: JournalEntry[]; ready: boolean; loading: boolean;
}) {
  const theme = useVitalTheme(), { width, fontScale } = useWindowDimensions();
  const { data, preferences, loading: healthLoading } = useHealth();
  const now = new Date(), today = startOfDay(now);
  const steps = inRange(data.steps, today, addDays(today, 1)).filter((item) => +new Date(item.date) <= +now);
  const stepCount = steps.length ? steps.reduce((total, item) => total + item.value, 0) : undefined;
  const form = ready && !loading ? dailyEntries(entries).find((item) => item.day === dayKey(now)) : undefined;
  const score = form ? dailyScore(form) : undefined;
  const seconds = sleepDuration(nightSleep(data.sleep, now));
  const workouts = ready && !loading ? monthlyWorkoutCount(entries, now) : undefined;
  const trends = kpiTrends(data, ready && !loading ? entries : [], now);
  const trendText = (value: number | undefined) => value === undefined ? "Ingen sammenligning" : `${value > 0 ? "↑ +" : value < 0 ? "↓ −" : "→ "}${number(Math.abs(value), 1)} %`;
  const goal = preferences.goal > 0 ? preferences.goal : undefined;
  const items = [
    { trend: trends.steps, comparison: "I går mot dagen før", title: "Skritt", value: stepCount === undefined ? "–" : number(stepCount), color: theme.mint,
      progress: stepCount !== undefined && goal ? stepCount / goal : undefined,
      subtitle: stepCount === undefined ? healthLoading ? "Laster …" : "Ingen data" : "skritt i dag",
      reference: goal ? `Mål ${number(goal)}` : "Ikke satt mål",
      label: stepCount === undefined ? "Skritt i dag: ingen data" : `${number(stepCount)} skritt i dag. Mål ${number(goal ?? 0)} skritt.` },
    { trend: trends.form, comparison: "Mot i går", title: "Dagens form", value: score === undefined ? "–" : number(score, 1), color: theme.orange,
      progress: score === undefined ? undefined : score / 10,
      subtitle: score === undefined ? loading ? "Laster …" : "Ikke registrert" : "av 10",
      reference: "Subjektiv score",
      label: score === undefined ? "Dagens form: ikke registrert" : `Dagens form: ${number(score, 1)} av 10. Subjektiv indikator.` },
    { trend: trends.sleep, comparison: "Mot forrige natt", title: "Søvn", value: seconds > 0 ? number(seconds / 3600, 1) : "–", color: theme.lavender,
      progress: seconds > 0 ? seconds / (8 * 3600) : undefined,
      subtitle: seconds > 0 ? "timer i natt" : healthLoading ? "Laster …" : "Ingen data",
      reference: "Referanse 8 t",
      label: seconds > 0 ? `${sleepTime(seconds)} søvn i natt. Ringen bruker åtte timer som referanse, ikke søvnkvalitet.` : "Søvn i natt: ingen data" },
  ];
  const stacked = width < 340 || fontScale > 1.3;
  return <Card style={{ padding: 14, gap: 12 }}>
    <View style={{ flexDirection: stacked ? "column" : "row", gap: stacked ? 18 : 6 }}>
      {items.map((item) => <View key={item.title} style={{ flex: stacked ? undefined : 1, alignItems: "center", gap: 5 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text, textAlign: "center" }}>{item.title}</Text>
        <Donut value={item.value} progress={item.progress} color={item.color} size={width < 390 ? 76 : 86} label={item.label} />
        <Text style={{ fontSize: 11, color: theme.secondary, textAlign: "center" }}>{item.subtitle}</Text>
        <Text style={{ fontSize: 10, color: theme.secondary, textAlign: "center" }}>{item.reference}</Text>
        <Text style={{ fontSize: 12, fontWeight: "600", color: item.color, textAlign: "center" }}>{trendText(item.trend)}</Text>
        <Text style={{ fontSize: 10, color: theme.secondary, textAlign: "center" }}>{item.comparison}</Text>
      </View>)}
    </View>
    <View accessibilityLabel={`${workouts === undefined ? "Ikke lastet" : workouts} loggede treningsøkter denne måneden`}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: theme.orange + "12" }}>
      <Ionicons name="fitness-outline" size={24} color={theme.orange} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}>Treningsøkter denne måneden</Text>
        <Text style={{ color: theme.secondary, fontSize: 11 }}>Fullførte økter i egen logg · {now.toLocaleDateString("nb-NO", { month: "long" })}</Text>
        <Text style={{ color: theme.orange, fontSize: 12, fontWeight: "600" }}>{trendText(workouts === undefined ? undefined : trends.workouts)}</Text>
        <Text style={{ color: theme.secondary, fontSize: 10 }}>Mot samme del av forrige måned</Text>
      </View>
      <Text style={{ color: theme.orange, fontSize: 28, fontWeight: "700" }}>{workouts === undefined ? "–" : number(workouts)}</Text>
    </View>
    {preferences.demo && <Copy small>Eksempeldata · ikke dine målinger</Copy>}
  </Card>;
}
