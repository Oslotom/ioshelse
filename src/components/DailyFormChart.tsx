import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SVGText } from "react-native-svg";
import {
  DailyFormEntry,
  dailyMetrics,
  dailyScore,
  dayDate,
  MetricKey,
} from "../data/daily-form";
import { plotSamples, Reading } from "../data/models";
import { useVitalTheme } from "./UI";
export type DailySeries = MetricKey | "score";
export const seriesLabel = (key: DailySeries) =>
  key === "score"
    ? "Formscore"
    : dailyMetrics.find((metric) => metric.key === key)!.label;
export const seriesValue = (entry: DailyFormEntry, key: DailySeries) =>
  key === "score" ? dailyScore(entry) : entry.metrics[key];
export function DailyFormChart({
  entries,
  primary,
  secondary,
  onSelect,
  range,
}: {
  entries: DailyFormEntry[];
  range?: { start: string; end: string };
  primary: DailySeries;
  secondary?: MetricKey;
  onSelect: (entry: DailyFormEntry) => void;
}) {
  const theme = useVitalTheme(),
    [width, setWidth] = useState(280),
    [selected, setSelected] = useState<string>();
  function paths(key: DailySeries) {
    const points = plotSamples(
        entries.map((entry) => ({
          date: dayDate(entry.day).toISOString(),
          value: seriesValue(entry, key),
        })),
        100,
      ),
      groups: Reading[][] = [];
    points.forEach((point) => {
      const group = groups.at(-1),
        last = group?.at(-1);
      if (last && +new Date(point.date) - +new Date(last.date) <= 36 * 3600000)
        group!.push(point);
      else groups.push([point]);
    });
    return groups;
  }
  const plotted = useMemo(
    () =>
      ([primary, ...(secondary ? [secondary] : [])] as DailySeries[]).map(
        (key) => paths(key),
      ),
    [entries, primary, secondary],
  );
  if (!entries.length)
    return (
      <Text style={{ color: theme.secondary, paddingVertical: 25 }}>
        Ingen dagsform er registrert i perioden.
      </Text>
    );
  const start = +dayDate(range?.start ?? entries[0]!.day),
    end = +dayDate(range?.end ?? entries.at(-1)!.day),
    height = 180;
  const x = (date: string) =>
      end === start
        ? width / 2
        : 24 + ((+new Date(date) - start) / (end - start)) * (width - 32),
    y = (value: number) => height - 12 - ((value - 1) / 9) * (height - 24);
  function closest(position: number) {
    const day =
      start + ((position - 24) / Math.max(1, width - 32)) * (end - start);
    let chosen = entries[0]!;
    entries.forEach((entry) => {
      if (
        Math.abs(+dayDate(entry.day) - day) <
        Math.abs(+dayDate(chosen.day) - day)
      )
        chosen = entry;
    });
    setSelected(chosen.day);
    onSelect(chosen);
  }
  const chosen = entries.find((entry) => entry.day === selected);
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`Dagsformgraf. ${seriesLabel(primary)}${secondary ? ` og ${seriesLabel(secondary)}` : ""}. ${entries.length} registrerte dager. Skala 1 til 10.`}
        accessibilityValue={{
          text: chosen
            ? `${chosen.day}: ${seriesValue(chosen, primary).toFixed(1)}`
            : "Velg en registrering",
        }}
        accessibilityActions={[
          { name: "increment", label: "Neste dag" },
          { name: "decrement", label: "Forrige dag" },
        ]}
        onAccessibilityAction={(event) => {
          const index = Math.max(
              0,
              entries.findIndex((entry) => entry.day === selected),
            ),
            next =
              entries[
                Math.max(
                  0,
                  Math.min(
                    entries.length - 1,
                    index +
                      (event.nativeEvent.actionName === "increment" ? 1 : -1),
                  ),
                )
              ]!;
          setSelected(next.day);
          onSelect(next);
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => closest(event.nativeEvent.locationX)}
        onResponderMove={(event) => closest(event.nativeEvent.locationX)}
      >
        <Svg width={width} height={height}>
          {[1, 5, 10].map((value) => (
            <React.Fragment key={value}>
              <Line
                x1={24}
                x2={width}
                y1={y(value)}
                y2={y(value)}
                stroke={theme.track}
              />
              <SVGText
                x={0}
                y={y(value) + 3}
                fontSize={10}
                fill={theme.secondary}
              >
                {value}
              </SVGText>
            </React.Fragment>
          ))}
          {plotted.map((groups, index) =>
            groups.map((group, i) => (
              <React.Fragment key={`${index}-${i}`}>
                <Path
                  d={group
                    .map(
                      (point, j) =>
                        `${j ? "L" : "M"}${x(point.date)},${y(point.value)}`,
                    )
                    .join(" ")}
                  stroke={index ? theme.lavender : theme.mint}
                  strokeWidth={2}
                  fill="none"
                />
                {group.map((point, j) => (
                  <Circle
                    key={j}
                    cx={x(point.date)}
                    cy={y(point.value)}
                    r={2.5}
                    fill={index ? theme.lavender : theme.mint}
                  />
                ))}
              </React.Fragment>
            )),
          )}
          {chosen && (
            <Line
              x1={x(dayDate(chosen.day).toISOString())}
              x2={x(dayDate(chosen.day).toISOString())}
              y1={0}
              y2={height}
              stroke={theme.secondary}
              strokeDasharray="3 4"
            />
          )}
        </Svg>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <Text style={{ color: theme.secondary, fontSize: 10 }}>
          {range?.start ?? entries[0]!.day}
        </Text>
        <Text style={{ color: theme.secondary, fontSize: 10 }}>
          {range?.end ?? entries.at(-1)!.day}
        </Text>
      </View>
      <Text
        style={{
          color: theme.secondary,
          fontSize: 11,
          lineHeight: 17,
          marginTop: 10,
        }}
      >
        Trykk eller dra for detaljer. Manglende dager vises som opphold.
        {(primary === "stress" || secondary === "stress") &&
          " Stress vises som råverdi i grafen; bare formscoren reverserer stress."}
      </Text>
    </View>
  );
}
