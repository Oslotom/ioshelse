import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useHealth } from "../data/store";
import { Theme, useTheme } from "../theme";
import { number, weeklyChange } from "../data/models";

export function useVitalTheme() {
  const { preferences } = useHealth();
  return useTheme(preferences.appearance);
}
export function useReduceMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce,
    );
    return () => sub.remove();
  }, []);
  return reduce;
}
export function Page({ children }: PropsWithChildren) {
  const theme = useVitalTheme(),
    { loading, refresh } = useHealth();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => void refresh()}
          tintColor={theme.mint}
        />
      }
    >
      {children}
    </ScrollView>
  );
}
export function Card({
  children,
  onPress,
  style,
  label,
}: PropsWithChildren<{
  onPress?: () => void;
  style?: ViewStyle;
  label?: string;
}>) {
  const theme = useVitalTheme(),
    reduce = useReduceMotion(),
    scale = useRef(new Animated.Value(1)).current;
  function animate(value: number) {
    if (!reduce)
      Animated.spring(scale, {
        toValue: value,
        useNativeDriver: true,
        speed: 30,
        bounciness: 2,
      }).start();
  }
  const content = (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.card, transform: [{ scale }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => animate(0.985)}
      onPressOut={() => animate(1)}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}
export function Title({
  text,
  icon,
  color,
}: {
  text: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}) {
  return (
    <View style={styles.title}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={{ color, fontSize: 14, fontWeight: "600", flexShrink: 1 }}>
        {text}
      </Text>
    </View>
  );
}
export function Copy({
  children,
  small = false,
}: PropsWithChildren<{ small?: boolean }>) {
  const t = useVitalTheme();
  return (
    <Text
      style={{
        color: t.secondary,
        fontSize: small ? 12 : 14,
        lineHeight: small ? 18 : 22,
      }}
    >
      {children}
    </Text>
  );
}
export function Heading({ children }: PropsWithChildren) {
  const t = useVitalTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: 28,
        fontWeight: "700",
        color: t.text,
        letterSpacing: -0.7,
      }}
    >
      {children}
    </Text>
  );
}
export function BigValue({ value, unit }: { value: string; unit?: string }) {
  const t = useVitalTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: 7,
        flexWrap: "wrap",
      }}
    >
      <Text
        style={{
          fontSize: 40,
          fontWeight: "700",
          letterSpacing: -1.5,
          color: t.text,
          fontVariant: ["tabular-nums"],
          flexShrink: 1,
        }}
      >
        {value}
      </Text>
      {unit && <Text style={{ fontSize: 14, color: t.secondary }}>{unit}</Text>}
    </View>
  );
}
export function Row({ label, value }: { label: string; value: string }) {
  const t = useVitalTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
        alignItems: "baseline",
      }}
    >
      <Text style={{ fontSize: 14, color: t.secondary, flex: 1 }}>{label}</Text>
      <Text
        style={{
          fontSize: 14,
          color: t.text,
          fontWeight: "600",
          flexShrink: 1,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const t = useVitalTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 16,
        borderRadius: 17,
        backgroundColor: secondary ? t.track : t.mint,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        alignItems: "center",
      })}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: secondary ? t.text : "#062C26",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Status() {
  const { preferences, error, lastRefresh } = useHealth(),
    t = useVitalTheme();
  return (
    <View style={{ gap: 7 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Ionicons
          name={preferences.demo ? "sparkles" : "heart"}
          size={12}
          color={preferences.demo ? t.orange : t.mint}
        />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "500",
            color: preferences.demo ? t.orange : t.secondary,
          }}
        >
          {preferences.demo
            ? "Demodata · eksempelvisning"
            : "Apple Helse · registrerte målinger"}
        </Text>
      </View>
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ fontSize: 13, lineHeight: 20, color: t.secondary }}
        >
          {error}
        </Text>
      )}
      {!preferences.demo && lastRefresh && (
        <Copy small>
          Hentet kl.{" "}
          {lastRefresh.toLocaleTimeString("nb-NO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Copy>
      )}
    </View>
  );
}
export function WeekSummary() {
  const { data } = useHealth(),
    change = weeklyChange(data.steps);
  return (
    <Copy>
      {change === undefined
        ? "Sammenligning vises når vi har to hele uker med registrerte skritt."
        : `Du har gått ${number(Math.abs(change))} % ${change >= 0 ? "flere" : "færre"} skritt de siste sju hele dagene enn de sju foregående.`}
    </Copy>
  );
}
export const styles = StyleSheet.create({
  page: { padding: 20, gap: 20, paddingBottom: 36 },
  card: {
    borderRadius: 26,
    padding: 22,
    gap: 16,
    shadowColor: "#18282C",
    shadowOpacity: 0.025,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  title: { flexDirection: "row", alignItems: "center", gap: 8 },
});
