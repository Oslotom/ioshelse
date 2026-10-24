import React, { PropsWithChildren, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Reading } from "../data/models";
import { Sparkline } from "./Sparkline";
import { Card, Title, useVitalTheme } from "./UI";
export function CollapsibleCard({
  title,
  icon,
  color,
  summary,
  filter,
  sparkline = [],
  sparklineLabel,
  maxGap,
  children,
}: PropsWithChildren<{
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  summary?: string;
  filter?: React.ReactNode;
  sparkline?: Reading[];
  sparklineLabel?: string;
  maxGap?: number;
}>) {
  const [collapsed, setCollapsed] = useState(false),
    theme = useVitalTheme();
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? "Utvid" : "Minimer"} ${title}`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCollapsed((value) => !value)}
        hitSlop={8}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Title text={title} icon={icon} color={color} />
          {collapsed && summary && (
            <Text style={{ color: theme.secondary, fontSize: 13 }}>
              {summary}
            </Text>
          )}
        </View>
        {collapsed && (
          <Sparkline
            data={sparkline}
            color={color}
            maxGap={maxGap}
            label={sparklineLabel ?? title}
          />
        )}
        <Ionicons
          name={collapsed ? "chevron-down" : "chevron-up"}
          color={theme.secondary}
          size={18}
        />
      </Pressable>
      {!collapsed && filter}
      {!collapsed && children}
    </Card>
  );
}
