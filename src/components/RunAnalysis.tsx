import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { RunData, analyseRun, paceLabel } from "../data/running";
import { timerLabel } from "../data/journal";
import { number } from "../data/models";
import { useTheme } from "../theme";
import { Chart } from "./Charts";

export function RunAnalysis({ run }: { run?: RunData }) {
  const theme = useTheme("light"),
    analysis = useMemo(() => (run ? analyseRun(run) : undefined), [run]);
  const panel = {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 22,
    gap: 14,
  };
  if (!analysis?.pace.length)
    return (
      <View style={panel}>
        <Text style={{ color: theme.text, fontSize: 19, fontWeight: "700" }}>
          Analyse av løpeturen
        </Text>
        <Text style={{ color: theme.secondary, lineHeight: 21 }}>
          Tiden er lagret. Tempoanalyse og kilometertider vises når løpeturen
          har sammenhengende GPS-punkter.
        </Text>
      </View>
    );
  return (
    <>
      <View style={panel}>
        <Text style={{ color: theme.text, fontSize: 19, fontWeight: "700" }}>
          Tempo i GPS-sporet
        </Text>
        <Chart
          data={analysis.pace}
          line
          maxGap={30000}
          theme={theme}
          color="#F47D35"
          unit="min/km"
          digits={2}
        />
        <Text style={{ color: theme.secondary, fontSize: 12, lineHeight: 18 }}>
          Beregnet mellom sammenhengende GPS-punkter. Høyere verdi betyr
          roligere tempo. Opphold i sporingen vises som hull i linjen.
        </Text>
      </View>
      <View style={panel}>
        <Text style={{ color: theme.text, fontSize: 19, fontWeight: "700" }}>
          Kilometertider
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Text style={{ color: theme.secondary, fontSize: 11, flex: 1 }}>
            DELSTREKNING
          </Text>
          <Text style={{ color: theme.secondary, fontSize: 11 }}>
            GPS-TID · TEMPO /KM
          </Text>
        </View>
        {analysis.splits.map((split, index) => (
          <View key={index} style={{ gap: 8 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>
                {split.distance >= 999.99
                  ? `${index + 1}. km`
                  : `Siste ${number(split.distance / 1000, 2)} km`}
              </Text>
              <Text style={{ color: theme.secondary, fontSize: 12 }}>
                {timerLabel(Math.round(split.seconds))}
              </Text>
              <Text style={{ color: "#E2702A", fontWeight: "700" }}>
                {paceLabel(split.seconds, split.distance)}
              </Text>
            </View>
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: theme.track,
              }}
            >
              <View
                style={{
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "#F47D35",
                  width: `${Math.min(100, split.distance / 10)}%`,
                }}
              />
            </View>
          </View>
        ))}
        <Text style={{ color: theme.secondary, fontSize: 12, lineHeight: 18 }}>
          Kilometergrensene beregnes mellom målte punkter. GPS-tid utelater
          pauser og hull i sporingen, og kan avvike fra aktiv tid.
        </Text>
      </View>
      <View style={panel}>
        <Text style={{ color: theme.text, fontSize: 19, fontWeight: "700" }}>
          Om GPS-sporet
        </Text>
        <Text style={{ color: theme.secondary, lineHeight: 21 }}>
          {run!.points.length} GPS-punkter · {analysis.segments} sammenhengende
          rutedeler · {timerLabel(Math.round(analysis.gpsSeconds))} registrert
          GPS-tid.
        </Text>
      </View>
    </>
  );
}
