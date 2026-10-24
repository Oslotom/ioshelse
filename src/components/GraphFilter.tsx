import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addDays, startOfDay } from "../data/models";
import { GraphPeriod, graphPeriods, graphRange } from "../data/graph-range";
import { useVitalTheme } from "./UI";

export function useGraphSelection(
  phoneOnly = false,
  initial: GraphPeriod = "Dag",
) {
  const [date, setDate] = useState(new Date()),
    [selected, setSelected] = useState<GraphPeriod>(initial);
  const period = phoneOnly && selected === "Måned" ? "Uke" : selected;
  useEffect(() => {
    const earliest = addDays(startOfDay(new Date()), -6);
    if (phoneOnly && date < earliest) setDate(earliest);
  }, [phoneOnly, date]);
  return {
    date,
    period,
    range: graphRange(date, period),
    setDate,
    setPeriod: setSelected,
    phoneOnly,
  };
}
export function graphSelectionLabel(selection: {
  date: Date;
  period: GraphPeriod;
}) {
  return `${selection.period} · ${selection.date.toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })}`;
}
export function GraphFilter({
  selection,
  label,
}: {
  selection: ReturnType<typeof useGraphSelection>;
  label: string;
}) {
  const [open, setOpen] = useState(false),
    theme = useVitalTheme();
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Velg dato og periode for ${label}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 7,
            backgroundColor: theme.track,
            borderRadius: 10,
            paddingVertical: 8,
            paddingHorizontal: 11,
          }}
        >
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "500" }}>
            {graphSelectionLabel(selection)}
          </Text>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            color={theme.secondary}
            size={13}
          />
        </Pressable>
      </View>
      {open && (
        <View
          style={{
            backgroundColor: theme.track,
            padding: 12,
            borderRadius: 14,
            gap: 12,
          }}
        >
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: "row", gap: 6 }}
          >
            {graphPeriods
              .filter((value) => !selection.phoneOnly || value !== "Måned")
              .map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selection.period === value }}
                  onPress={() => {
                    selection.setPeriod(value);
                    setOpen(false);
                  }}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 10,
                    borderRadius: 9,
                    backgroundColor:
                      selection.period === value ? theme.card : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: theme.text,
                    }}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ color: theme.secondary, fontSize: 12 }}>
              Til og med
            </Text>
            <DateTimePicker
              value={selection.date}
              maximumDate={new Date()}
              minimumDate={
                selection.phoneOnly
                  ? addDays(startOfDay(new Date()), -6)
                  : undefined
              }
              mode="date"
              locale="nb-NO"
              themeVariant={theme.dark ? "dark" : "light"}
              onChange={(_, date) => {
                if (date) selection.setDate(date);
              }}
            />
          </View>
          {selection.phoneOnly && (
            <Text
              style={{ fontSize: 11, lineHeight: 15, color: theme.secondary }}
            >
              Skrittelleren har bare sju dagers historikk.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
