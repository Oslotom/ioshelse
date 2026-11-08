import Svg, { Text as SvgText } from "react-native-svg";
import { GraphReveal, GrowingBar } from "./GraphReveal";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Card, Copy, Entrance, Title, useVitalTheme } from "./UI";
import { number } from "../data/models";

// Static demonstration only. No personal data is sent to an AI service.
const examples = {
  7: {
    description:
      "Du har hatt en mer aktiv uke enn vanlig. Skrittene ligger over b\u00e5de \u00e5rssnittet og de siste fire ukene. S\u00f8vnen har v\u00e6rt litt kortere enn nylig, mens formen er bedre enn begge referansene. Et jevnere s\u00f8vnm\u00f8nster kan v\u00e6re et fint fokus neste uke.",
    sleep: 7.1,
    steps: 10240,
    form: 7.6,
  },
  14: {
    description:
      "De siste to ukene viser jevn aktivitet og god form. B\u00e5de s\u00f8vn, skritt og form ligger over \u00e5rssnittet. Sammenlignet med de fire foreg\u00e5ende ukene er endringene sm\u00e5, med en positiv utvikling i aktivitet og form.",
    sleep: 7.4,
    steps: 9450,
    form: 7.4,
  },
  30: {
    description:
      "Den siste m\u00e5neden ligger du over \u00e5rssnittet i alle tre m\u00e5lingene. Aktiviteten har \u00f8kt sammenlignet med de fire foreg\u00e5ende ukene, mens s\u00f8vnen er stabil og formen litt bedre. Det samlede bildet viser en jevn, positiv utvikling.",
    sleep: 7.3,
    steps: 9180,
    form: 7.3,
  },
} as const;
const references = {
  year: { sleep: 6.9, steps: 7850, form: 6.8 },
  weeks: { sleep: 7.3, steps: 8640, form: 7.1 },
};
export function AIAnalysis() {
  const theme = useVitalTheme();
  const [collapsed, setCollapsed] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const current = examples[period];
  const metrics = [
    { key: "sleep", label: "S\u00f8vn", unit: "t", color: theme.blue },
    { key: "steps", label: "Skritt", unit: "skritt", color: theme.mint },
    { key: "form", label: "Form", unit: "/ 10", color: theme.orange },
  ] as const;
  const delta = (value: number, reference: number, key: string) => {
    if (key === "steps") {
      const percent = ((value - reference) / reference) * 100;
      return `${percent > 0 ? "+" : ""}${number(percent, 0)} %`;
    }
    const change = value - reference;
    return `${change > 0 ? "+" : ""}${number(change, 1)} ${key === "sleep" ? "t" : "poeng"}`;
  };
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          collapsed ? "Vis mer AI-analyse" : "Minimer AI-analyse"
        }
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCollapsed((value) => !value)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Title text="AI-analyse" icon="sparkles-outline" color={theme.blue} />
        <View
          style={{
            backgroundColor: theme.lightBlue,
            paddingHorizontal: 9,
            paddingVertical: 5,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 10 }}>Eksempeldata</Text>
        </View>
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          size={18}
          color={theme.secondary}
        />
      </Pressable>
      {!collapsed && (
        <View
          accessibilityRole="radiogroup"
          style={{
            flexDirection: "row",
            backgroundColor: theme.track,
            borderRadius: 16,
            padding: 4,
            gap: 4,
          }}
        >
          {([7, 14, 30] as const).map((days) => (
            <Pressable
              key={days}
              accessibilityRole="radio"
              accessibilityState={{ checked: days === period }}
              accessibilityLabel={`Analyser siste ${days} dager`}
              onPress={() => setPeriod(days)}
              style={{
                flex: 1,
                minHeight: 44,
                borderRadius: 12,
                backgroundColor: days === period ? theme.card : "transparent",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: days === period ? theme.text : theme.secondary,
                  fontSize: 12,
                  fontWeight: days === period ? "600" : "400",
                }}
              >
                {days} dager
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable
        disabled={!collapsed}
        accessibilityRole={collapsed ? "button" : undefined}
        accessibilityLabel={
          collapsed ? "Vis mer om analysen av skritt" : undefined
        }
        onPress={() => setCollapsed(false)}
      >
        <Entrance key={period}>
          <View style={{ gap: 18 }}>
            <Text
              accessibilityRole="header"
              style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}
            >
              Siste {period} dager
            </Text>
            {!collapsed && (
              <Text style={{ color: theme.text, fontSize: 14, lineHeight: 23 }}>
                {current.description}
              </Text>
            )}
            {(collapsed
              ? metrics.filter((metric) => metric.key === "steps")
              : metrics
            ).map((metric) => (
              <View
                key={metric.key}
                style={{
                  gap: 7,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.track,
                  paddingBottom: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {metric.label}
                  </Text>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 17,
                      fontWeight: "600",
                    }}
                  >
                    {number(
                      current[metric.key],
                      metric.key === "steps" ? 0 : 1,
                    )}{" "}
                    <Text style={{ color: theme.secondary, fontSize: 11 }}>
                      {metric.unit}
                      {metric.key === "form" ? "" : " / dag"}
                    </Text>
                  </Text>
                </View>
                <GraphReveal key={`${period}-${metric.key}`}>
                  <Svg
                    width="100%"
                    height={142}
                    viewBox="0 0 300 142"
                    accessible
                    accessibilityLabel={`${metric.label}. Valgt periode ${number(current[metric.key], 1)}. Siste ukers snitt ${number(references.weeks[metric.key], 1)}. \u00c5rssnitt ${number(references.year[metric.key], 1)}.`}
                  >
                    {[
                      {
                        label: "Valgt periode",
                        value: current[metric.key],
                        color: metric.color,
                      },
                      {
                        label: "Siste uker",
                        value: references.weeks[metric.key],
                        color: theme.blue,
                      },
                      {
                        label: "\u00c5rssnitt",
                        value: references.year[metric.key],
                        color: theme.lightMint,
                      },
                    ].map((item, index) => {
                      const maximum =
                        metric.key === "form"
                          ? 10
                          : Math.max(
                              current[metric.key],
                              references.weeks[metric.key],
                              references.year[metric.key],
                            ) * 1.15;
                      const height = (item.value / maximum) * 86;
                      const x = 50 + index * 100;
                      return (
                        <React.Fragment key={item.label}>
                          <GrowingBar
                            x={x - 21}
                            y={110 - height}
                            width={42}
                            height={height}
                            rx={7}
                            fill={item.color}
                          />
                          <SvgText
                            x={x}
                            y={110 - height - 7}
                            textAnchor="middle"
                            fontSize={11}
                            fill={theme.text}
                          >
                            {number(item.value, metric.key === "steps" ? 0 : 1)}
                          </SvgText>
                          <SvgText
                            x={x}
                            y={133}
                            textAnchor="middle"
                            fontSize={10}
                            fill={theme.secondary}
                          >
                            {item.label}
                          </SvgText>
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                </GraphReveal>
                {!collapsed && (
                  <>
                    <Copy small>
                      \u00c5rssnitt:{" "}
                      {number(
                        references.year[metric.key],
                        metric.key === "steps" ? 0 : 1,
                      )}{" "}
                      \u00b7{" "}
                      {delta(
                        current[metric.key],
                        references.year[metric.key],
                        metric.key,
                      )}
                    </Copy>
                    <Copy small>
                      Siste ukers snitt:{" "}
                      {number(
                        references.weeks[metric.key],
                        metric.key === "steps" ? 0 : 1,
                      )}{" "}
                      \u00b7{" "}
                      {delta(
                        current[metric.key],
                        references.weeks[metric.key],
                        metric.key,
                      )}
                    </Copy>
                  </>
                )}
              </View>
            ))}
          </View>
        </Entrance>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => setCollapsed((value) => !value)}
        style={{
          minHeight: 44,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: theme.blue, fontWeight: "600" }}>
          {collapsed ? "Vis mer" : "Vis mindre"}
        </Text>
      </Pressable>
      {!collapsed && (
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 7 }}
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={theme.secondary}
          />
          <View style={{ flex: 1 }}>
            <Copy small>
              Eksempelanalyse med oppdiktede verdier, ikke en faktisk
              AI-vurdering. Sammenligner daglige snitt med de siste 12
              m\u00e5nedene og de fire ukene f\u00f8r valgt periode.
            </Copy>
          </View>
        </View>
      )}
    </Card>
  );
}
