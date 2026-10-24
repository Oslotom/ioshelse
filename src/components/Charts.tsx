import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Rect, Line, Circle, Path } from "react-native-svg";
import {
  Reading,
  Sleep,
  dateLabel,
  number,
  plotSamples,
  pulseSeries,
  addDays,
  startOfDay,
} from "../data/models";
import { Theme } from "../theme";

const emptyReadings: Reading[] = [];
export function Chart({
  data,
  color,
  theme,
  line = false,
  compact = false,
  unit = "skritt",
  digits = 0,
  average = emptyReadings,
}: {
  data: Reading[];
  color: string;
  theme: Theme;
  line?: boolean;
  compact?: boolean;
  unit?: string;
  digits?: number;
  average?: Reading[];
}) {
  const [width, setWidth] = useState(280),
    [selected, setSelected] = useState<number>();
  const height = compact ? 52 : 175,
    padding = compact ? 3 : 12;
  const { max, minimum, groups } = useMemo(
    () => ({
      max: [...data, ...average].reduce(
        (value, r) => Math.max(value, r.value),
        1,
      ),
      minimum: data.reduce((value, r) => Math.min(value, r.value), Infinity),
      groups: line ? pulseSeries(plotSamples(data)) : [],
    }),
    [data, average, line],
  );
  const min = line ? Math.max(0, minimum - 8) : 0;
  const lowTime = data.length ? +new Date(data[0]!.date) : 0,
    highTime = data.length ? +new Date(data.at(-1)!.date) : 1;
  const x = (i: number) =>
    padding +
    (width - 2 * padding) * (data.length <= 1 ? 0.5 : i / (data.length - 1));
  const timeX = (date: string) =>
    padding +
    (width - 2 * padding) *
      (highTime === lowTime
        ? 0.5
        : (+new Date(date) - lowTime) / (highTime - lowTime));
  const y = (value: number) =>
    height -
    padding -
    ((value - min) / Math.max(1, max - min)) * (height - padding * 2);
  const chosen =
    selected === undefined
      ? undefined
      : data[Math.min(selected, data.length - 1)];
  function select(locationX: number) {
    if (!data.length) return;
    if (line) {
      const target =
        lowTime +
        ((locationX - padding) / Math.max(1, width - 2 * padding)) *
          (highTime - lowTime);
      let index = 0;
      data.forEach((r, i) => {
        if (
          Math.abs(+new Date(r.date) - target) <
          Math.abs(+new Date(data[index]!.date) - target)
        )
          index = i;
      });
      setSelected(index);
    } else
      setSelected(
        Math.max(
          0,
          Math.min(
            data.length - 1,
            Math.round(
              ((locationX - padding) / Math.max(1, width - 2 * padding)) *
                (data.length - 1),
            ),
          ),
        ),
      );
  }
  if (!data.length)
    return (
      <Text style={{ color: theme.secondary, paddingVertical: 18 }}>
        Ingen registrerte målinger i perioden.
      </Text>
    );
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {!compact && (
        <Text style={{ color: theme.secondary, fontSize: 12, minHeight: 30 }}>
          {chosen
            ? `${dateLabel(chosen.date, true)} · ${number(chosen.value, digits)} ${unit}`
            : `Trykk eller dra for detaljer · ${unit}`}
        </Text>
      )}
      <View
        accessible
        accessibilityLabel={`Diagram med ${data.length} målinger, fra ${dateLabel(data[0]!.date)} til ${dateLabel(data.at(-1)!.date)}. Laveste ${number(minimum, digits)}, høyeste ${number(max, digits)} ${unit}.`}
        accessibilityRole="adjustable"
        accessibilityActions={[
          { name: "increment", label: "Neste måling" },
          { name: "decrement", label: "Forrige måling" },
        ]}
        accessibilityValue={{
          text: chosen
            ? `${dateLabel(chosen.date, true)}, ${number(chosen.value, digits)} ${unit}`
            : `${data.length} målinger`,
        }}
        onAccessibilityAction={(e) =>
          setSelected(
            Math.max(
              0,
              Math.min(
                data.length - 1,
                (selected ?? 0) +
                  (e.nativeEvent.actionName === "increment" ? 1 : -1),
              ),
            ),
          )
        }
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => select(e.nativeEvent.locationX)}
        onResponderMove={(e) => select(e.nativeEvent.locationX)}
      >
        <Svg width={width} height={height}>
          {!compact &&
            [0.25, 0.5, 0.75].map((v) => (
              <Line
                key={v}
                x1={0}
                x2={width}
                y1={height * v}
                y2={height * v}
                stroke={theme.track}
                strokeWidth={1}
              />
            ))}
          {line
            ? groups.map((group, i) => (
                <React.Fragment key={i}>
                  {!compact && group.length > 1 && (
                    <Path
                      d={`${group.map((r, j) => `${j ? "L" : "M"}${timeX(r.date)},${y(r.value)}`).join(" ")} L${timeX(group.at(-1)!.date)},${height - padding} L${timeX(group[0]!.date)},${height - padding} Z`}
                      fill={color}
                      opacity={0.07}
                    />
                  )}
                  <Path
                    d={group
                      .map(
                        (r, j) =>
                          `${j ? "L" : "M"}${timeX(r.date)},${y(r.value)}`,
                      )
                      .join(" ")}
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                  />
                  {group.map((r, j) => (
                    <Circle
                      key={j}
                      cx={timeX(r.date)}
                      cy={y(r.value)}
                      r={compact ? 1.5 : 2.2}
                      fill={color}
                    />
                  ))}
                </React.Fragment>
              ))
            : data.map((r, i) => (
                <Rect
                  key={i}
                  x={
                    x(i) - Math.max(2, ((width - 24) / data.length) * 0.68) / 2
                  }
                  y={y(r.value)}
                  width={Math.max(2, ((width - 24) / data.length) * 0.68)}
                  height={Math.max(1, height - padding - y(r.value))}
                  rx={3}
                  fill={color}
                  opacity={selected === undefined || selected === i ? 1 : 0.35}
                />
              ))}
          {!line && average.length > 1 && (
            <Path
              d={average
                .map((r, i) => `${i ? "L" : "M"}${timeX(r.date)},${y(r.value)}`)
                .join(" ")}
              stroke={theme.orange}
              strokeWidth={2}
              fill="none"
            />
          )}
          {chosen && (
            <Line
              x1={line ? timeX(chosen.date) : x(selected!)}
              x2={line ? timeX(chosen.date) : x(selected!)}
              y1={0}
              y2={height}
              stroke={theme.secondary}
              strokeDasharray="3 4"
            />
          )}
        </Svg>
      </View>
      {!compact && data.length > 960 && (
        <Text style={{ color: theme.secondary, fontSize: 11 }}>
          Forenklet diagram med registrerte ytterpunkter. Detaljvalg bruker alle
          målinger.
        </Text>
      )}
      {!compact && (
        <View style={styles.axis}>
          <Text style={{ color: theme.secondary, fontSize: 11 }}>
            {dateLabel(data[0]!.date)}
          </Text>
          <Text style={{ color: theme.secondary, fontSize: 11 }}>
            {dateLabel(data.at(-1)!.date)}
          </Text>
        </View>
      )}
    </View>
  );
}
export function Ring({
  progress,
  goal,
  theme,
}: {
  progress: number;
  goal: number;
  theme: Theme;
}) {
  const radius = 43,
    circumference = 2 * Math.PI * radius;
  return (
    <View
      style={{
        width: 108,
        height: 108,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessible
      accessibilityLabel={`${number(progress * 100)} prosent av målet på ${number(goal)} skritt`}
    >
      <Svg width={108} height={108} style={StyleSheet.absoluteFill}>
        <Circle
          cx={54}
          cy={54}
          r={radius}
          stroke={theme.mint + "22"}
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={54}
          cy={54}
          r={radius}
          stroke={theme.mint}
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={
            circumference * (1 - Math.min(1, Math.max(0, progress)))
          }
          rotation={-90}
          origin="54,54"
        />
      </Svg>
      <Text style={{ color: theme.mint, fontSize: 24, fontWeight: "700" }}>
        {progress >= 1 ? "✓" : "↗"}
      </Text>
      <Text style={{ color: theme.mint, fontSize: 12, fontWeight: "700" }}>
        {number(progress * 100)} %
      </Text>
    </View>
  );
}
export function Heatmap({
  data,
  goal,
  theme,
  days = 91,
  endDate,
}: {
  data: Reading[];
  goal: number;
  theme: Theme;
  days?: number;
  endDate?: Date;
}) {
  const { width } = useWindowDimensions(),
    size = Math.max(8, Math.floor((width - 132) / 13));
  return (
    <View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {Array.from({ length: days }, (_, i) => {
          const date = addDays(startOfDay(endDate ?? new Date()), i - days + 1),
            value = data.find(
              (r) => +startOfDay(new Date(r.date)) === +date,
            )?.value;
          return (
            <View
              key={i}
              accessible
              accessibilityLabel={`${dateLabel(date)}, ${value === undefined ? "ingen data" : `${number(value)} skritt`}`}
              style={{
                width: size,
                height: size,
                borderRadius: 3,
                backgroundColor: value === undefined ? theme.track : theme.mint,
                opacity:
                  value === undefined
                    ? 1
                    : 0.15 + Math.min(1, value / goal) * 0.85,
              }}
            />
          );
        })}
      </View>
      <Text style={{ color: theme.secondary, fontSize: 11, marginTop: 12 }}>
        {days} dager · mørkere farge betyr nærmere målet
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  axis: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
});

export function SleepTimeline({
  segments,
  theme,
}: {
  segments: Sleep[];
  theme: Theme;
}) {
  const [width, setWidth] = useState(280);
  if (!segments.length) return null;
  const stages = ["Våken", "REM", "Lett", "Dyp", "Søvn"].filter((stage) =>
    segments.some((s) => s.stage === stage),
  );
  const start = segments.reduce(
    (value, s) => Math.min(value, +new Date(s.start)),
    Infinity,
  );
  const end = segments.reduce(
    (value, s) => Math.max(value, +new Date(s.end)),
    0,
  );
  const x = (date: string) =>
    48 + ((+new Date(date) - start) / Math.max(1, end - start)) * (width - 48);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg
        width={width}
        height={stages.length * 24}
        accessible
        accessibilityLabel="Tidslinje for registrerte søvnfaser"
      >
        {segments.map((s, i) => (
          <Rect
            key={i}
            x={x(s.start)}
            y={stages.indexOf(s.stage) * 24 + 3}
            width={Math.max(1, x(s.end) - x(s.start))}
            height={14}
            rx={3}
            fill={theme.lavender}
            opacity={s.stage === "Dyp" ? 1 : s.stage === "Våken" ? 0.25 : 0.6}
          />
        ))}
      </Svg>
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: 0, gap: 9 }}
      >
        {stages.map((stage) => (
          <Text
            key={stage}
            style={{ color: theme.secondary, fontSize: 11, lineHeight: 15 }}
          >
            {stage}
          </Text>
        ))}
      </View>
    </View>
  );
}
