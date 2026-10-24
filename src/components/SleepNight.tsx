import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Sleep, sleepDuration } from "../data/models";
import { sleepTime } from "../data/sleep";
import { useVitalTheme } from "./UI";

/** Shared night summary. The ring is a duration reference, never a quality score. */
export function SleepNight({ segments }: { segments: Sleep[] }) {
  const theme = useVitalTheme();
  const seconds = sleepDuration(segments);
  const asleep = segments.filter((segment) => segment.asleep);
  if (!asleep.length) return null;
  const start = asleep.reduce((earliest, item) => item.start < earliest ? item.start : earliest, asleep[0]!.start);
  const end = asleep.reduce((latest, item) => item.end > latest ? item.end : latest, asleep[0]!.end);
  const time = (stamp: string) => new Date(stamp).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
  const radius = 44, circumference = 2 * Math.PI * radius;
  return <View style={{ gap: 18 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <View accessible accessibilityLabel={`${sleepTime(seconds)} registrert søvn. Ringen bruker åtte timer som visuell referanse.`}
        style={{ width: 108, height: 108, alignItems: "center", justifyContent: "center" }}>
        <Svg width={108} height={108} style={{ position: "absolute" }}>
          <Circle cx={54} cy={54} r={radius} stroke={theme.lavender + "22"} strokeWidth={8} fill="none" />
          <Circle cx={54} cy={54} r={radius} stroke={theme.lavender} strokeWidth={8} fill="none"
            strokeLinecap="round" strokeDasharray={`${circumference}`}
            strokeDashoffset={circumference * (1 - Math.min(1, seconds / (8 * 3600)))} rotation={-90} origin="54,54" />
        </Svg>
        <Ionicons name="moon" size={25} color={theme.lavender} />
        <Text style={{ fontSize: 11, color: theme.secondary, marginTop: 5 }}>Søvntid</Text>
      </View>
      <View style={{ flex: 1, minWidth: 120, gap: 5 }}>
        <Text style={{ color: theme.text, fontSize: 29, fontWeight: "700", letterSpacing: -0.8 }}>{sleepTime(seconds)}</Text>
        <Text style={{ color: theme.secondary, fontSize: 13 }}>Registrert søvn</Text>
        <Text style={{ color: theme.secondary, fontSize: 11, lineHeight: 16 }}>Ring: 8 t som visuell referanse, ikke søvnkvalitet.</Text>
      </View>
    </View>
    <View style={{ flexDirection: "row", gap: 10 }}>
      {([{ label: "Første søvn", value: time(start), icon: "moon-outline" },
        { label: "Siste søvn", value: time(end), icon: "sunny-outline" }] as const).map((item) =>
        <View key={item.label} style={{ flex: 1, borderRadius: 16, backgroundColor: theme.lavender + "0D", padding: 13, gap: 5 }}>
          <Ionicons name={item.icon} size={18} color={theme.lavender} />
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "600" }}>{item.value}</Text>
          <Text style={{ color: theme.secondary, fontSize: 11 }}>{item.label}</Text>
        </View>)}
    </View>
  </View>;
}
