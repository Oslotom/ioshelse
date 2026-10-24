import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { RunMap } from "./RunMap";
import { useReduceMotion } from "./UI";

export function ExpandableRunMap({
  height,
  ...props
}: React.ComponentProps<typeof RunMap> & { height: number }) {
  const [expanded, setExpanded] = useState(false),
    insets = useSafeAreaInsets(),
    reduce = useReduceMotion();
  return (
    <>
      <View style={{ height, overflow: "hidden", backgroundColor: "#EDF3F0" }}>
        <RunMap {...props} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Utvid kartet til fullskjerm"
          onPress={() => setExpanded(true)}
          style={StyleSheet.absoluteFill}
        >
          <View
            style={{
              position: "absolute",
              right: 16,
              bottom: 42,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#FFFFFFF2",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="expand-outline" size={23} color="#15171B" />
          </View>
        </Pressable>
      </View>
      <Modal
        visible={expanded}
        animationType={reduce ? "none" : "fade"}
        presentationStyle="fullScreen"
        onRequestClose={() => setExpanded(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
          <RunMap {...props} follow={false} />
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: insets.top + 12,
              left: 16,
              right: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFFF2",
                paddingVertical: 12,
                paddingHorizontal: 18,
                borderRadius: 22,
                flex: 1,
              }}
            >
              <Text
                style={{ color: "#15171B", fontSize: 18, fontWeight: "700" }}
              >
                Løperute
              </Text>
              <Text style={{ color: "#727C89", fontSize: 12, marginTop: 3 }}>
                Dra og zoom for å utforske kartet
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Lukk fullskjermskart"
              onPress={() => setExpanded(false)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" color="#15171B" size={26} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
