import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useHealth } from "../data/store";
import { useJournal } from "../data/journal-store";
import {
  addDays,
  dateLabel,
  inRange,
  number,
  startOfDay,
  sum,
} from "../data/models";
import { dailyEntries, dailyScore, dayKey } from "../data/daily-form";
import { sleepHistory, sleepTime } from "../data/sleep";
import { CollapsibleCard } from "./CollapsibleCard";
import { useVitalTheme } from "./UI";

export function HealthHistory() {
  const { data } = useHealth(),
    journal = useJournal(),
    theme = useVitalTheme();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [days, setDays] = useState<7 | 14>(7),
    [ending, setEnding] = useState(new Date());
  const [visible, setVisible] = useState({
    sleep: true,
    steps: true,
    form: true,
  });
  const [width, setWidth] = useState(280),
    [selected, setSelected] = useState<string>();
  const rows = useMemo(() => {
    const forms = new Map(
      dailyEntries(journal.data.entries).map((entry) => [entry.day, entry]),
    );
    return sleepHistory(data.sleep, ending, days).map((night) => {
      const date = new Date(night.date),
        steps = inRange(data.steps, date, addDays(date, 1)),
        form = forms.get(dayKey(date));
      return {
        ...night,
        day: dayKey(date),
        steps: steps.length ? sum(steps) : undefined,
        score: form ? dailyScore(form) : undefined,
      };
    });
  }, [data.sleep, data.steps, journal.data.entries, ending, days]);
  const plotWidth = Math.max(1, width - 58),
    x = (i: number) => 29 + (plotWidth * (i + 0.5)) / days;
  const maxHours = Math.max(10, ...rows.map((row) => row.seconds / 3600));
  const maxSteps = Math.max(12500, ...rows.map((row) => row.steps ?? 0));
  const bottom = 182,
    height = 154,
    ySleep = (seconds: number) => bottom - (seconds / 3600 / maxHours) * height;
  const ySteps = (steps: number) => bottom - (steps / maxSteps) * height;
  const groups: number[][] = [];
  rows.forEach((row, index) => {
    if (!row.seconds) return;
    const last = groups.at(-1);
    if (last && last.at(-1) === index - 1) last.push(index);
    else groups.push([index]);
  });
  const chosen = rows.find((row) => row.day === selected) ?? rows.at(-1)!;
  const face = (score: number) =>
    score < 3
      ? "😭"
      : score < 5
        ? "🙁"
        : score < 7
          ? "😐"
          : score < 9
            ? "🙂"
            : "😄";
  const choose = (position: number) =>
    setSelected(
      rows[
        Math.max(
          0,
          Math.min(days - 1, Math.floor(((position - 29) / plotWidth) * days)),
        )
      ]!.day,
    );
  return (
    <CollapsibleCard
      title="Hovedgraf"
      style={{ marginHorizontal: -20, borderRadius: 0, shadowOpacity: 0 }}
      icon="analytics-outline"
      color={theme.lavender}
      summary={`${days} dager · til ${dateLabel(ending)}`}
      sparkline={rows
        .filter((row) => row.seconds > 0)
        .map((row) => ({ date: row.date, value: row.seconds / 3600 }))}
      sparklineLabel="Søvntimer"
    >
      <View style={{ alignItems: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Velg periode for hovedgrafen"
          accessibilityState={{ expanded: periodOpen }}
          onPress={() => setPeriodOpen((open) => !open)}
          style={{
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: 14,
            backgroundColor: theme.track,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
            {days} dager · {dateLabel(ending)} {periodOpen ? "⌃" : "⌄"}
          </Text>
        </Pressable>
      </View>
      {periodOpen && (
        <View
          style={{
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.track,
            borderRadius: 16,
            padding: 10,
            gap: 6,
          }}
        >
          {([7, 14] as const).map((period) => (
            <Pressable
              key={period}
              accessibilityRole="radio"
              accessibilityState={{ checked: days === period }}
              onPress={() => {
                setDays(period);
                setPeriodOpen(false);
              }}
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                justifyContent: "center",
                borderRadius: 10,
                backgroundColor:
                  days === period ? theme.lavender + "18" : "transparent",
              }}
            >
              <Text
                style={{
                  color: days === period ? theme.lavender : theme.text,
                  fontWeight: "600",
                }}
              >
                {period} dager{days === period ? "  ✓" : ""}
              </Text>
            </Pressable>
          ))}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: theme.secondary, fontSize: 13 }}>
              Til og med
            </Text>
            <DateTimePicker
              value={ending}
              maximumDate={new Date()}
              mode="date"
              locale="nb-NO"
              themeVariant={theme.dark ? "dark" : "light"}
              onChange={(_, value) => {
                if (value) {
                  setEnding(startOfDay(value));
                  setPeriodOpen(false);
                }
              }}
            />
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {(
          [
            { key: "sleep", label: "Søvn", color: theme.lavender },
            { key: "steps", label: "Skritt", color: theme.mint },
            { key: "form", label: "Form", color: theme.orange },
          ] as const
        ).map((series) => (
          <Pressable
            key={series.key}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: visible[series.key] }}
            accessibilityLabel={`Vis ${series.label.toLowerCase()}`}
            onPress={() =>
              setVisible((current) => ({
                ...current,
                [series.key]: !current[series.key],
              }))
            }
            style={{
              minHeight: 44,
              paddingHorizontal: 13,
              borderRadius: 13,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: visible[series.key]
                ? series.color + "22"
                : theme.track,
            }}
          >
            <Text
              style={{
                color: visible[series.key] ? series.color : theme.secondary,
              }}
            >
              {visible[series.key] ? "●" : "○"} {series.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        style={{ marginHorizontal: -22 }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Daglig søvn, skritt og form. Dra eller bruk neste og forrige dato."
        accessibilityValue={{
          text: `${dateLabel(chosen.date)}. Søvn: ${chosen.seconds ? sleepTime(chosen.seconds) : "ingen data"}. Skritt: ${chosen.steps ?? "ingen data"}. Form: ${chosen.score === undefined ? "ikke registrert" : number(chosen.score, 1)}`,
        }}
        accessibilityActions={[
          { name: "increment", label: "Neste dato" },
          { name: "decrement", label: "Forrige dato" },
        ]}
        onAccessibilityAction={(event) => {
          const index = rows.indexOf(chosen);
          setSelected(
            rows[
              Math.max(
                0,
                Math.min(
                  days - 1,
                  index +
                    (event.nativeEvent.actionName === "increment" ? 1 : -1),
                ),
              )
            ]!.day,
          );
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => choose(event.nativeEvent.locationX)}
        onResponderMove={(event) => choose(event.nativeEvent.locationX)}
      >
        <Svg width={width} height={visible.form ? 250 : 220}>
          <Defs>
            <LinearGradient id="sleepHistoryFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.lavender} stopOpacity={0.3} />
              <Stop offset="1" stopColor={theme.lavender} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((fraction) => (
            <React.Fragment key={fraction}>
              <Line
                x1={29}
                x2={width - 29}
                y1={bottom - fraction * height}
                y2={bottom - fraction * height}
                stroke={theme.track}
              />
              {visible.sleep && (
                <SvgText
                  x={0}
                  y={bottom - fraction * height + 4}
                  fontSize={9}
                  fill={theme.lavender}
                >
                  {number(maxHours * fraction, 0)} t
                </SvgText>
              )}
              {visible.steps && (
                <SvgText
                  x={width}
                  textAnchor="end"
                  y={bottom - fraction * height + 4}
                  fontSize={9}
                  fill={theme.mint}
                >
                  {number((maxSteps * fraction) / 1000, 1)}k
                </SvgText>
              )}
            </React.Fragment>
          ))}
          {visible.steps &&
            rows.map(
              (row, index) =>
                row.steps !== undefined && (
                  <Rect
                    key={row.day}
                    x={x(index) - (plotWidth / days) * 0.3}
                    y={ySteps(row.steps)}
                    width={(plotWidth / days) * 0.6}
                    height={Math.max(1, bottom - ySteps(row.steps))}
                    rx={3}
                    fill={theme.mint}
                    opacity={0.65}
                  />
                ),
            )}
          {visible.steps && (
            <>
              <Line
                x1={29}
                x2={width - 29}
                y1={ySteps(10000)}
                y2={ySteps(10000)}
                stroke={theme.mint}
                strokeDasharray="4 4"
              />
              <SvgText
                x={31}
                y={ySteps(10000) - 5}
                fontSize={9}
                fill={theme.mint}
              >
                Mål 10 000
              </SvgText>
            </>
          )}
          {visible.sleep &&
            groups.map((group, index) => {
              const path = group
                .map(
                  (i, j) =>
                    `${j ? "L" : "M"}${x(i)},${ySleep(rows[i]!.seconds)}`,
                )
                .join(" ");
              return (
                <React.Fragment key={index}>
                  {group.length > 1 && (
                    <Path
                      d={`${path} L${x(group.at(-1)!)},${bottom} L${x(group[0]!)},${bottom} Z`}
                      fill="url(#sleepHistoryFade)"
                    />
                  )}
                  <Path
                    d={path}
                    stroke={theme.lavender}
                    strokeWidth={2.5}
                    fill="none"
                  />
                  {group.map((i) => (
                    <Circle
                      key={i}
                      cx={x(i)}
                      cy={ySleep(rows[i]!.seconds)}
                      r={3}
                      fill={theme.lavender}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          <Line
            x1={x(rows.indexOf(chosen))}
            x2={x(rows.indexOf(chosen))}
            y1={24}
            y2={bottom}
            stroke={theme.secondary}
            strokeDasharray="2 4"
            opacity={0.5}
          />
          {rows.map((row, index) => (
            <React.Fragment key={row.day}>
              <SvgText
                x={x(index)}
                y={203}
                textAnchor="middle"
                fontSize={10}
                fill={theme.secondary}
              >
                {new Date(row.date).getDate()}
              </SvgText>
              {visible.form && (
                <SvgText
                  x={x(index)}
                  y={233}
                  textAnchor="middle"
                  fontSize={days === 7 ? 19 : 14}
                  fill={theme.secondary}
                >
                  {row.score === undefined ? "–" : face(row.score)}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </CollapsibleCard>
  );
}
