import React, { useEffect, useRef } from "react";
import { Platform, Text, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RunPoint } from "../data/running";

export const RunMap = React.memo(function RunMap({
  points,
  live = false,
  follow = live,
  emptyTitle = "Din neste løpetur",
}: {
  points: RunPoint[];
  live?: boolean;
  follow?: boolean;
  emptyTitle?: string;
}) {
  const map = useRef<MapView>(null);
  const located = useRef(false);
  const last = points.at(-1);
  const groups: RunPoint[][] = [];
  points.forEach((point) => {
    const group = groups.at(-1);
    if (group?.at(-1)?.segment === point.segment) group.push(point);
    else groups.push([point]);
  });
  useEffect(() => {
    if (!last || (live && !follow && located.current)) return;
    located.current = true;
    if (live || points.length === 1)
      map.current?.animateToRegion(
        { ...last, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        400,
      );
    else
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 115, bottom: 50, left: 40, right: 40 },
        animated: false,
      });
  }, [points, live, follow]);
  const fit = () => {
    if (points.length > 1)
      map.current?.fitToCoordinates(points, {
        edgePadding: { top: 115, bottom: 50, left: 40, right: 40 },
        animated: false,
      });
  };
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        userInterfaceStyle="light"
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
        customMapStyle={[
          { elementType: "geometry", stylers: [{ color: "#F4F3EE" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#6B706B" }] },
          {
            elementType: "labels.text.stroke",
            stylers: [{ color: "#FFFFFF" }],
          },
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#DDE9D5" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#C6DFEA" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#FFFFFF" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#E7DCC1" }],
          },
        ]}
        mapPadding={{ top: 100, right: 12, bottom: 36, left: 12 }}
        showsCompass
        showsScale
        initialRegion={
          last
            ? { ...last, latitudeDelta: 0.008, longitudeDelta: 0.008 }
            : {
                latitude: 64.5,
                longitude: 13,
                latitudeDelta: 14,
                longitudeDelta: 14,
              }
        }
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
        {points[0] && (
          <Marker coordinate={points[0]} title="Start" pinColor="#39B8A5" />
        )}
        {last && (
          <Marker
            coordinate={last}
            title={live ? "Siste posisjon" : "Mål"}
            pinColor="#F47D35"
          />
        )}
      </MapView>
      {!last && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 40,
            left: 20,
            right: 20,
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFFEE",
              paddingVertical: 9,
              paddingHorizontal: 14,
              borderRadius: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
            }}
          >
            <Ionicons name="navigate-outline" size={15} color="#F47D35" />
            <Text style={{ color: "#535F58", fontSize: 12, flexShrink: 1 }}>
              {emptyTitle} · ingen posisjon ennå
            </Text>
          </View>
        </View>
      )}
    </View>
  );
});
