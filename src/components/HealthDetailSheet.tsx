import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, useWindowDimensions, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { dateLabel, number } from "../data/models";
import { sleepTime } from "../data/sleep";
import { Chart } from "./Charts";
import { useReduceMotion, useVitalTheme } from "./UI";

export type HealthDetailRow = {
  date: string; day: string; seconds: number; deep: number; rem: number; light: number; unknown: number;
  steps?: number; score?: number; sleepScore?: number;
};
export function HealthDetailSheet({ metric, rows, example, onClose }: {
  metric: "sleep" | "steps" | "form"; rows: HealthDetailRow[]; example: boolean; onClose: () => void;
}) {
  const theme = useVitalTheme(), insets = useSafeAreaInsets(), reduce = useReduceMotion();
  const { height: windowHeight } = useWindowDimensions();
  const opening = useRef(new Animated.Value(windowHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;
  const [expanded, setExpanded] = useState(false);
  const compactHeight = Math.min(windowHeight * 0.58, 480);
  const fullHeight = Math.max(compactHeight, windowHeight - insets.top - 16);
  const sheetHeight = useRef(new Animated.Value(compactHeight)).current;
  useEffect(() => {
    const animation = Animated.timing(sheetHeight, {
      toValue: expanded ? fullHeight : compactHeight,
      duration: reduce ? 0 : 520, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, compactHeight, fullHeight, reduce, sheetHeight]);
  const animateOpening = () => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      Animated.parallel([
        Animated.timing(opening, { toValue: 0, duration: reduced ? 0 : 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdrop, { toValue: 1, duration: reduced ? 0 : 800, useNativeDriver: true }),
      ]).start();
    }).catch(() => { opening.setValue(0); backdrop.setValue(1); });
  };
  useEffect(() => () => { opening.stopAnimation(); backdrop.stopAnimation(); }, [opening, backdrop]);
  const title = metric === "sleep" ? "S\u00f8vn" : metric === "steps" ? "Skritt" : "Form";
  const color = metric === "sleep" ? theme.blue : metric === "steps" ? theme.mint : theme.orange;
  const values = rows.flatMap((row) => {
    const value = metric === "sleep" ? row.seconds > 0 ? row.seconds / 3600 : undefined : metric === "steps" ? row.steps : row.score;
    return value === undefined ? [] : [{ date: row.date, value }];
  });
  const total = values.reduce((sum, row) => sum + row.value, 0);
  const average = values.length ? total / values.length : undefined;
  const format = (value: number) => metric === "sleep" ? sleepTime(value * 3600) : metric === "form" ? `${number(value, 1)} / 10` : number(value);
  const summaries = [
    { label: "Gjennomsnitt", value: average === undefined ? "Ingen data" : format(average) },
    { label: metric === "steps" ? "Totalt" : "H\u00f8yest", value: values.length ? format(metric === "steps" ? total : Math.max(...values.map((row) => row.value))) : "Ingen data" },
  ];
  return <Modal transparent animationType="none" onShow={animateOpening} visible onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity: backdrop }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Lukk detaljer" onPress={onClose} style={{ flex: 1, backgroundColor: "#26374866" }} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateY: opening }] }}>
      <Animated.View accessibilityViewIsModal style={{ height: sheetHeight, overflow: "hidden", backgroundColor: theme.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Minimer detaljer" : "Utvid detaljer"} accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)} style={{ minHeight: 36, alignItems: "center", justifyContent: "center", gap: 5 }}>
          <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: theme.track }} />
          <Text style={{ color: theme.secondary, fontSize: 10 }}>{expanded ? "Trykk for mindre visning" : "Trykk for full visning"}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={expanded ? "Minimer detaljer" : "Utvid detaljer"} accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={{ flex: 1, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ color: theme.text, fontSize: 25, fontWeight: "600" }}>{title}</Text>
            <Ionicons name={expanded ? "chevron-down" : "chevron-up"} size={18} color={theme.secondary} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Lukk detaljer" onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}><Ionicons name="close" size={24} color={theme.secondary} /></Pressable>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: Math.max(24, insets.bottom + 16), gap: 22 }}>
          <Text style={{ color: theme.secondary, fontSize: 12 }}>{dateLabel(rows[0]!.date)} - {dateLabel(rows.at(-1)!.date)}{example ? " \u00b7 Eksempeldata" : ""}</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>{summaries.map((item) => <View key={item.label} style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: theme.secondary, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ color: theme.text, fontSize: 23, fontWeight: "600" }}>{item.value}</Text>
          </View>)}</View>
          {values.length ? <Chart data={values} color={color} theme={theme} line={metric !== "sleep"} maxGap={36 * 3600000} unit={metric === "sleep" ? "timer" : metric === "steps" ? "skritt" : "/ 10"} digits={metric === "steps" ? 0 : 1} /> : <Text style={{ color: theme.secondary }}>Ingen registreringer i perioden.</Text>}
          {metric === "sleep" && ([{ key: "deep", title: "Dyp s\u00f8vn", color: theme.blue }, { key: "rem", title: "REM-s\u00f8vn", color: "#B0CCE7" }, { key: "light", title: "Lett s\u00f8vn", color: theme.lightBlue }] as const).map((stage) => {
            const nights = rows.filter((row) => row.seconds > 0);
            const data = nights.map((row) => ({ date: row.date, value: row[stage.key] / 3600 }));
            return <View key={stage.key} style={{ gap: 10 }}>
              <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>{stage.title}</Text>
              <Chart data={data} color={stage.color} theme={theme} unit="timer" digits={1} />
            </View>;
          })}
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>Dag for dag</Text>
          {rows.slice().reverse().map((row) => {
            const value = metric === "sleep" ? row.seconds > 0 ? row.seconds / 3600 : undefined : metric === "steps" ? row.steps : row.score;
            return <View key={row.day} style={{ borderBottomWidth: 1, borderBottomColor: theme.track, paddingBottom: 12, gap: 5 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: theme.secondary }}>{dateLabel(row.date)}</Text>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{value === undefined ? "Ingen data" : format(value)}</Text>
              </View>
              {metric === "sleep" && row.sleepScore !== undefined && <Text style={{ color: theme.secondary, fontSize: 11 }}>Eksempel p\u00e5 s\u00f8vnscore: {row.sleepScore} / 100</Text>}
            </View>;
          })}
        </ScrollView>
      </Animated.View>
      </Animated.View>
    </View>
  </Modal>;
}
