import React from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { journalStats } from "../data/journal-stats";
import { JournalEntry } from "../data/journal";
import { number } from "../data/models";
import { Card, Copy, useVitalTheme } from "./UI";

export function JournalKPIs({
  entries,
  ready,
  loading,
}: {
  entries: JournalEntry[];
  ready: boolean;
  loading: boolean;
}) {
  const theme = useVitalTheme(),
    { width, fontScale } = useWindowDimensions(),
    stats = journalStats(entries);
  const known = ready && !loading;
  const missing = loading ? "Laster …" : !ready ? "Ikke lastet" : "Ingen data";
  const latest = stats.latestGlucose;
  const items = [
    {
      title: "Logger i dag",
      icon: "create-outline" as const,
      color: theme.mint,
      value: known ? number(stats.todayCount) : "–",
      unit: "registreringer",
      detail: known ? "Alle typer · i dag" : missing,
    },
    {
      title: "Snittform",
      icon: "happy-outline" as const,
      color: theme.lavender,
      value:
        known && stats.formAverage !== undefined
          ? number(stats.formAverage, 1)
          : "–",
      unit: "av 5",
      detail:
        known && stats.formCount
          ? `${stats.formCount} vurderinger · 7 dager`
          : known
            ? "Ingen vurderinger · 7 dager"
            : missing,
    },
    {
      title: "Treningstid",
      icon: "fitness-outline" as const,
      color: theme.orange,
      value:
        known && stats.workoutCount
          ? number(stats.workoutSeconds / 60, 1)
          : "–",
      unit: "min",
      detail: known
        ? `${stats.workoutCount} avsluttede økter · 7 dager`
        : missing,
    },
    {
      title: "Siste blodsukker",
      icon: "water-outline" as const,
      color: theme.coral,
      value: known && latest ? number(latest.value, 2) : "–",
      unit: "mmol/L",
      detail:
        known && latest
          ? new Date(latest.date).toLocaleString("nb-NO", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : missing,
    },
  ];
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {items.map((item) => (
          <View
            key={item.title}
            style={{
              flexBasis: width < 350 || fontScale > 1.3 ? "100%" : "47%",
              flexGrow: 1,
            }}
          >
            <Card style={{ padding: 14, gap: 7, borderRadius: 20 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name={item.icon} size={15} color={item.color} />
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "600",
                    color: item.color,
                    flexShrink: 1,
                  }}
                >
                  {item.title}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  columnGap: 6,
                  rowGap: 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    lineHeight: 34,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                    color: theme.text,
                  }}
                >
                  {item.value}
                </Text>
                <Text style={{ color: theme.secondary, fontSize: 11 }}>
                  {item.unit}
                </Text>
              </View>
              <Text
                style={{ fontSize: 11, lineHeight: 15, color: theme.secondary }}
              >
                {item.detail}
              </Text>
            </Card>
          </View>
        ))}
      </View>
      <Copy small>
        Basert på dine egne logger. Pågående treningsøkter er ikke medregnet.
        Blodsukkerverdien er manuelt registrert og vises med sitt opprinnelige
        tidspunkt.
      </Copy>
    </View>
  );
}
