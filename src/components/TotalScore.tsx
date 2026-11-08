import React from "react";
import { Text, View } from "react-native";
import { HealthDetailRow } from "./HealthDetailSheet";
import Svg, { Circle } from "react-native-svg";
import { GraphReveal } from "./GraphReveal";
import { Card, Copy, Title, useVitalTheme } from "./UI";
import { useHealth } from "../data/store";
import { number } from "../data/models";

export function TotalScore({ rows, example }: { rows: HealthDetailRow[]; example: boolean }) {
  const theme = useVitalTheme();
  const { preferences } = useHealth();
  const goal = preferences.goal > 0 ? preferences.goal : 10000;
  // Compare the same complete days for all three equally weighted components.
  const complete = rows.filter((row) => row.seconds > 0 && row.steps !== undefined && row.score !== undefined);
  const cap = (value: number) => Math.min(100, Math.max(0, value));
  const mean = (value: (row: HealthDetailRow) => number) => complete.length
    ? complete.reduce((sum, row) => sum + value(row), 0) / complete.length : 0;
  const components = [
    { label: "S\u00f8vn", score: mean((row) => cap(row.seconds / (8 * 3600) * 100)), color: theme.blue, reference: "8 timer" },
    { label: "Skritt", score: mean((row) => cap(row.steps! / goal * 100)), color: theme.mint, reference: `${number(goal)} skritt` },
    { label: "Form", score: mean((row) => cap(row.score! / 10 * 100)), color: theme.orange, reference: "10 av 10" },
  ];
  const score = components.reduce((sum, item) => sum + item.score, 0) / 3;
  return <Card style={{ marginTop: 2 }}>
    <Title text="Totalscore" icon="sparkles-outline" color={theme.blue} />
    <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
      <GraphReveal><View accessible accessibilityLabel={complete.length ? `Totalscore ${Math.round(score)} av 100` : "Ingen totalscore"} style={{ width: 108, height: 108, alignItems: "center", justifyContent: "center" }}>
        <Svg width={108} height={108} style={{ position: "absolute" }}>
          <Circle cx={54} cy={54} r={46} fill="none" stroke={theme.track} strokeWidth={7} />
          <Circle cx={54} cy={54} r={46} fill="none" stroke={theme.mint} strokeWidth={7} strokeLinecap="round" strokeDasharray={2 * Math.PI * 46} strokeDashoffset={2 * Math.PI * 46 * (1 - (complete.length ? score / 100 : 0))} rotation={-90} origin="54,54" />
        </Svg>
        <Text style={{ color: theme.text, fontSize: 26, fontWeight: "600" }}>{complete.length ? Math.round(score) : "\u2013"}</Text>
        <Text style={{ color: theme.secondary, fontSize: 11 }}>av 100</Text>
      </View></GraphReveal>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>Siste {rows.length} dager</Text>
        <Copy small>{complete.length} av {rows.length} dager med alle tre verdier</Copy>
        {example && <Copy small>Inkluderer eksempeldata</Copy>}
      </View>
    </View>
    {complete.length ? components.map((item) => <View key={item.label} style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: theme.text, fontSize: 12 }}>{item.label}</Text>
        <Text style={{ color: theme.secondary, fontSize: 12 }}>{number(item.score, 0)} / 100 \u00b7 vekt 1/3</Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: theme.track, overflow: "hidden" }}>
        <View style={{ height: 5, width: `${item.score}%`, borderRadius: 3, backgroundColor: item.color }} />
      </View>
    </View>) : <Copy>Totalscore vises n\u00e5r en dag har b\u00e5de s\u00f8vn, skritt og form.</Copy>}
    <Copy small>Lik vekting av s\u00f8vn, skritt og form. 100 poeng tilsvarer 8 timers s\u00f8vn, skrittm\u00e5let ditt og form 10/10. Hver del begrenses til 100 poeng. En enkel oversikt, ikke en medisinsk vurdering.</Copy>
  </Card>;
}
