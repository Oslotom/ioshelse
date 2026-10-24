import React from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { plotSamples, Reading } from "../data/models";
export function Sparkline({
  data,
  color,
  maxGap = 36 * 3600000,
  label,
}: {
  data: Reading[];
  color: string;
  maxGap?: number;
  label: string;
}) {
  const ordered = plotSamples(
    [...data]
      .filter(
        (r) => Number.isFinite(r.value) && Number.isFinite(Date.parse(r.date)),
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
    24,
  );
  if (!ordered.length)
    return (
      <View
        style={{
          width: 82,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
        accessible
        accessibilityLabel={`${label}: ingen data`}
      >
        <Text style={{ color, fontSize: 18 }}>–</Text>
      </View>
    );
  let min = ordered.reduce((v, r) => Math.min(v, r.value), Infinity),
    max = ordered.reduce((v, r) => Math.max(v, r.value), -Infinity);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const from = +new Date(ordered[0]!.date),
    to = +new Date(ordered.at(-1)!.date);
  const x = (r: Reading) =>
    to === from ? 41 : 3 + ((+new Date(r.date) - from) / (to - from)) * 76;
  const y = (r: Reading) => 29 - ((r.value - min) / (max - min)) * 26;
  const groups: Reading[][] = [];
  ordered.forEach((r) => {
    const group = groups.at(-1),
      last = group?.at(-1);
    if (last && +new Date(r.date) - +new Date(last.date) <= maxGap)
      group!.push(r);
    else groups.push([r]);
  });
  return (
    <View
      accessible
      accessibilityLabel={`${label}: minigraf med ${data.length} registrerte verdier`}
      pointerEvents="none"
    >
      <Svg width={82} height={32}>
        {groups.map((group, index) => (
          <React.Fragment key={index}>
            <Path
              d={group
                .map((r, i) => `${i ? "L" : "M"}${x(r)},${y(r)}`)
                .join(" ")}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {group.map((r, i) => (
              <Circle key={i} cx={x(r)} cy={y(r)} r={1.5} fill={color} />
            ))}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
