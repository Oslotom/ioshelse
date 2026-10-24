import { RunningScreen } from "./screens/Running";
import { RunTrackingProvider } from "./data/run-tracking";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  NavigationContainer,
  NavigatorScreenParams,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import { JournalProvider } from "./data/journal-store";
import { FormScreen } from "./screens/Form";
import { LogSheet } from "./components/LogSheet";
import { SleepScreen } from "./screens/Sleep";
import { Onboarding, Settings } from "./screens/Settings";

export type StackParams = {
  Run: { id?: string } | undefined;
  Main: NavigatorScreenParams<TabParams> | undefined;
  Steps: undefined;
  Heart: undefined;
  Settings: undefined;
  Trends: undefined;
};
type TabParams = {
  Oversikt: undefined;
  Aktivitet: undefined;
  Søvn: undefined;
  Registrer: undefined;
  Form: undefined;
};
const Stack = createNativeStackNavigator<StackParams>(),
  Tab = createBottomTabNavigator<TabParams>();
function Tabs({ navigation }: NativeStackScreenProps<StackParams, "Main">) {
  const theme = useVitalTheme();
  const [logOpen, setLogOpen] = useState(false);
  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: route.name !== "Oversikt",
          headerTitleStyle: { fontWeight: "700", fontSize: 27 },
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 18, marginRight: 16 }}>
              {route.name === "Aktivitet" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Åpne trender"
                  onPress={() => navigation.navigate("Trends")}
                  hitSlop={10}
                >
                  <Ionicons
                    name="stats-chart-outline"
                    color={theme.text}
                    size={23}
                  />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Åpne innstillinger"
                onPress={() => navigation.navigate("Settings")}
                hitSlop={10}
              >
                <Ionicons
                  name="settings-outline"
                  color={theme.text}
                  size={23}
                />
              </Pressable>
            </View>
          ),
          tabBarActiveTintColor:
            route.name === "Søvn" ? theme.lavender : theme.mint,
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
                    : route.name === "Søvn"
                      ? "moon"
                      : "journal-outline"
              }
              size={size - 2}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Oversikt">
          {() => (
            <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
              <Dashboard
                onSteps={() => navigation.navigate("Steps")}
                onHeart={() => navigation.navigate("Heart")}
                onSettings={() => navigation.navigate("Settings")}
              />
            </SafeAreaView>
          )}
        </Tab.Screen>
        <Tab.Screen name="Aktivitet">
          {() => <Activity onSteps={() => navigation.navigate("Steps")} />}
        </Tab.Screen>
        <Tab.Screen
          name="Registrer"
          component={EmptyTab}
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
              setLogOpen(true);
            },
          }}
          options={{
            headerShown: false,
            tabBarAccessibilityLabel: "Legg til registrering",
            tabBarLabel: () => null,
            tabBarIcon: () => (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 16,
                  backgroundColor: theme.mint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={30} color="#062C26" />
              </View>
            ),
          }}
        />
        <Tab.Screen name="Søvn" component={SleepScreen} />
        <Tab.Screen name="Form">
          {() => (
            <FormScreen
              onRun={(id) =>
                navigation.navigate("Run", id ? { id } : undefined)
              }
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
      <LogSheet
        onRun={() => {
          setLogOpen(false);
          navigation.navigate("Run");
        }}
        visible={logOpen}
        onClose={() => setLogOpen(false)}
        onSaved={() => {
          setLogOpen(false);
          navigation.navigate("Main", { screen: "Form" });
        }}
      />
    </>
  );
}
function EmptyTab() {
  return null;
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
              name="Run"
              component={RunningScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              component={Settings}
              options={{ title: "Innstillinger" }}
            />
            <Stack.Screen
              name="Trends"
              component={Trends}
              options={{ title: "Trender" }}
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
        <JournalProvider>
          <RunTrackingProvider>
            <Root />
          </RunTrackingProvider>
        </JournalProvider>
      </HealthProvider>
    </SafeAreaProvider>
  );
}
