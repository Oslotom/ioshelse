import React from "react";
import { Text, View } from "react-native";
import { useJournal } from "../data/journal-store";
import { dayKey } from "../data/daily-form";
import { Card, Copy, Title, useVitalTheme } from "./UI";

export function TrainingCalendar() {
  const journal = useJournal();
  const theme = useVitalTheme();
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const start = new Date(year, month, 1);
  const previousStart = new Date(year, month - 1, 1);
  const previousDay = Math.min(now.getDate(), new Date(year, month, 0).getDate());
  const previousCutoff = new Date(year, month - 1, previousDay, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  const workouts = journal.data.entries.filter((entry) => entry.kind === "workout");
  const current = workouts.filter((entry) => +new Date(entry.date) >= +start && +new Date(entry.date) <= +now);
  const previous = workouts.filter((entry) => +new Date(entry.date) >= +previousStart && +new Date(entry.date) <= +previousCutoff);
  const counts = new Map<string, number>();
  current.forEach((entry) => {
    const day = dayKey(new Date(entry.date));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  });
  const difference = current.length - previous.length;
  const offset = (start.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const ready = journal.available && !journal.loading;
  const stats = [
    { label: "Denne m\u00e5neden", value: current.length, color: theme.mint },
    { label: "Forrige hittil", value: previous.length, color: theme.lavender },
    { label: "Igjen til 15", value: Math.max(0, 15 - current.length), color: theme.orange },
  ];
  return <Card>
    <Title text="Trening" icon="barbell-outline" color={theme.mint} />
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {stats.map((stat) => <View key={stat.label} style={{ flex: 1, minWidth: 75, gap: 5 }}>
        <Text style={{ color: stat.color, fontSize: 27, fontWeight: "600", fontVariant: ["tabular-nums"] }}>{ready ? stat.value : "\u2013"}</Text>
        <Text style={{ color: theme.secondary, fontSize: 11 }}>{stat.label}</Text>
      </View>)}
    </View>
    <Copy small>{!ready ? journal.loading ? "Laster trenings\u00f8kter \u2026" : "Treningsloggen er ikke tilgjengelig."
      : `${difference > 0 ? "+" : ""}${difference} \u00f8kter mot samme periode forrige m\u00e5ned (til ${previousDay}.).`}</Copy>
    <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600", textTransform: "capitalize" }}>
      {now.toLocaleDateString("nb-NO", { month: "long", year: "numeric" })}
    </Text>
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row" }}>
        {["M", "T", "O", "T", "F", "L", "S"].map((day, i) => <Text key={i} style={{ width: "14.2857%", textAlign: "center", color: theme.secondary, fontSize: 11 }}>{day}</Text>)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: cells }, (_, i) => {
          const day = i - offset + 1;
          if (day < 1 || day > days) return <View key={i} style={{ width: "14.2857%", height: 42 }} />;
          const count = ready ? counts.get(dayKey(new Date(year, month, day))) ?? 0 : 0;
          const today = day === now.getDate();
          return <View key={i} accessible accessibilityLabel={`${day}. ${now.toLocaleDateString("nb-NO", { month: "long" })}. ${ready ? `${count} registrerte trenings\u00f8kter` : "Laster"}${today ? ". I dag" : ""}`}
            style={{ width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center",
              backgroundColor: count ? theme.mint + "30" : "transparent", borderWidth: today ? 1 : 0, borderColor: theme.mint }}>
              <Text style={{ color: count ? theme.mint : day > now.getDate() ? theme.secondary : theme.text, fontSize: 13, fontWeight: count || today ? "700" : "400", opacity: day > now.getDate() ? 0.5 : 1 }}>{day}</Text>
            </View>
          </View>;
        })}
      </View>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.mint + "55" }} />
      <Copy small>Registrert trenings\u00f8kt</Copy>
    </View>
  </Card>;
}
