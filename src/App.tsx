import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";
import { HealthProvider, useHealth } from "./data/store";
import { useVitalTheme } from "./components/UI";
import { Dashboard } from "./screens/Dashboard";
import {
  Activity,
  HeartDetail,
  StepsDetail,
  Trends,
} from "./screens/Analytics";
import { Onboarding, Settings } from "./screens/Settings";

type StackParams = { Main: undefined; Steps: undefined; Heart: undefined };
type TabParams = {
  Oversikt: undefined;
  Aktivitet: undefined;
  Trender: undefined;
  Innstillinger: undefined;
};
const Stack = createNativeStackNavigator<StackParams>(),
  Tab = createBottomTabNavigator<TabParams>();
function Tabs({ navigation }: NativeStackScreenProps<StackParams, "Main">) {
  const theme = useVitalTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name !== "Oversikt",
        headerTitleStyle: { fontWeight: "700", fontSize: 27 },
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        tabBarActiveTintColor: theme.mint,
        tabBarInactiveTintColor: theme.secondary,
        tabBarStyle: { backgroundColor: theme.card, borderTopWidth: 0 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={
              route.name === "Oversikt"
                ? "grid"
                : route.name === "Aktivitet"
                  ? "walk"
                  : route.name === "Trender"
                    ? "stats-chart"
                    : "options"
            }
            size={size - 2}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Oversikt">
        {({
          navigation: tabs,
        }: BottomTabScreenProps<TabParams, "Oversikt">) => (
          <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            <Dashboard
              onSteps={() => navigation.navigate("Steps")}
              onHeart={() => navigation.navigate("Heart")}
              onSettings={() => tabs.navigate("Innstillinger")}
            />
          </SafeAreaView>
        )}
      </Tab.Screen>
      <Tab.Screen name="Aktivitet">
        {() => <Activity onSteps={() => navigation.navigate("Steps")} />}
      </Tab.Screen>
      <Tab.Screen name="Trender" component={Trends} />
      <Tab.Screen name="Innstillinger" component={Settings} />
    </Tab.Navigator>
  );
}
function Root() {
  const { hydrated, preferences } = useHealth(),
    theme = useVitalTheme();
  if (!hydrated)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.background,
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
        }}
      >
        <ActivityIndicator color={theme.mint} />
        <Text style={{ color: theme.secondary }}>Åpner VITAL …</Text>
      </View>
    );
  return (
    <>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      {!preferences.onboarded ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <Onboarding />
        </SafeAreaView>
      ) : (
        <NavigationContainer
          theme={{
            ...(theme.dark ? DarkTheme : DefaultTheme),
            colors: {
              ...(theme.dark ? DarkTheme : DefaultTheme).colors,
              background: theme.background,
              card: theme.card,
              text: theme.text,
              primary: theme.mint,
            },
          }}
        >
          <Stack.Navigator
            screenOptions={{
              headerBackTitle: "Tilbake",
              headerTintColor: theme.text,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.background },
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            <Stack.Screen
              name="Main"
              component={Tabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Steps"
              component={StepsDetail}
              options={{ title: "Skritt" }}
            />
            <Stack.Screen
              name="Heart"
              component={HeartDetail}
              options={{ title: "Puls" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <HealthProvider>
        <Root />
      </HealthProvider>
    </SafeAreaProvider>
  );
}
