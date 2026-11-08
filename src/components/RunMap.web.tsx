import React from "react";
import { Text, View } from "react-native";
import { RunPoint } from "../data/running";
export function RunMap({
  points,
  emptyTitle = "Kartforhåndsvisning",
}: {
  points: RunPoint[];
  live?: boolean;
  follow?: boolean;
  emptyTitle?: string;
}) {
  const last = points.at(-1);
  const latitude = last?.latitude ?? 64.5,
    longitude = last?.longitude ?? 13,
    delta = last ? 0.015 : 8;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  return (
    <View style={{ flex: 1, minHeight: 240 }}>
      <iframe
        title="Kart fra OpenStreetMap"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik${last ? `&marker=${latitude},${longitude}` : ""}`}
        style={{
          border: 0,
          width: "100%",
          height: "100%",
          minHeight: 240,
          flex: 1,
        }}
      />
      <Text
        style={{
          backgroundColor: "#fff",
          padding: 8,
          color: "#727C89",
          fontSize: 12,
        }}
      >
        {last
          ? "Siste registrerte posisjon · full rute vises i mobilappen"
          : emptyTitle + " · ingen posisjon ennå"}
      </Text>
    </View>
  );
}
