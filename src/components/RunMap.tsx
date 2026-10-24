import React, { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RunPoint } from "../data/running";

export const RunMap = React.memo(function RunMap({
  points,
  live = false,
  emptyTitle = "Din neste løpetur",
}: {
  points: RunPoint[];
  live?: boolean;
  emptyTitle?: string;
}) {
  const map = useRef<MapView>(null);
  const last = points.at(-1);
  const groups: RunPoint[][] = [];
  points.forEach((point) => {
    const group = groups.at(-1);
    if (group?.at(-1)?.segment === point.segment) group.push(point);
    else groups.push([point]);
  });
  useEffect(() => {
    if (!last) return;
    if (live)
      map.current?.animateToRegion(
        { ...last, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        400,
      );
    else if (points.length > 1)
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 45, bottom: 45, left: 40, right: 40 },
        animated: false,
      });
  }, [points, live]);
  if (!last)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#EDF3F0",
          gap: 12,
          padding: 28,
        }}
      >
        <View
          style={{
            width: 74,
            height: 74,
            borderRadius: 37,
            backgroundColor: "#FFFFFF",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons name="navigate-outline" size={30} color="#39B8A5" />
        </View>
        <Text style={{ color: "#15171B", fontSize: 19, fontWeight: "600" }}>
          {emptyTitle}
        </Text>
        <Text style={{ color: "#727C89", textAlign: "center", lineHeight: 20 }}>
          Rutekartet vises når GPS har registrert en posisjon. Ingen rute tegnes
          uten målinger.
        </Text>
      </View>
    );
  const fit = () => {
    if (points.length > 1)
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 45, bottom: 45, left: 40, right: 40 },
        animated: false,
      });
  };
  return (
    <MapView
      ref={map}
      style={{ flex: 1 }}
      userInterfaceStyle="light"
      showsCompass
      showsScale
      initialRegion={{ ...last, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      onMapReady={fit}
    >
      {groups.map(
        (group, index) =>
          group.length > 1 && (
            <Polyline
              key={index}
              coordinates={group}
              strokeWidth={5}
              strokeColor="#F47D35"
            />
          ),
      )}
      <Marker coordinate={points[0]!} title="Start" pinColor="#39B8A5" />
      <Marker
        coordinate={last}
        title={live ? "Siste posisjon" : "Mål"}
        pinColor="#F47D35"
      />
    </MapView>
  );
});
