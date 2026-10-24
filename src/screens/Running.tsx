import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { StackParams } from "../App";
import { useJournal } from "../data/journal-store";
import { makeLogId, timerLabel } from "../data/journal";
import {
  emptyRun,
  paceLabel,
  runDistance,
  runSeconds,
  RunPoint,
} from "../data/running";
import { useRunTracking } from "../data/run-tracking";
import { dateLabel, number } from "../data/models";
import { withDeadline } from "../data/startup";
import { RunMap } from "../components/RunMap";

const ink = "#15171B",
  muted = "#727C89",
  accent = "#F47D35";
function Action({
  label,
  icon,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        minHeight: 56,
        padding: 15,
        borderRadius: 20,
        backgroundColor: secondary ? "#F0F2F4" : accent,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={secondary ? ink : "#FFFFFF"} />
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: secondary ? ink : "#FFFFFF",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function Stats({
  seconds,
  distance,
  hasGPS,
}: {
  seconds: number;
  distance: number;
  hasGPS: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 4,
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        paddingVertical: 18,
      }}
    >
      {[
        { value: timerLabel(seconds), label: "Aktiv tid" },
        {
          value: hasGPS ? paceLabel(seconds, distance) : "–:––",
          label: "Snitt /km",
        },
        {
          value: hasGPS ? number(distance / 1000, 2) : "–",
          label: "Distanse km",
        },
      ].map((item) => (
        <View
          key={item.label}
          style={{ flex: 1, alignItems: "center", gap: 6 }}
        >
          <Text
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.65}
            style={{
              maxWidth: "96%",
              fontSize: 22,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
              color: ink,
            }}
          >
            {item.value}
          </Text>
          <Text style={{ fontSize: 11, color: muted, textAlign: "center" }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
export function RunningScreen({
  navigation,
  route,
}: NativeStackScreenProps<StackParams, "Run">) {
  const insets = useSafeAreaInsets(),
    { height } = useWindowDimensions();
  const mapHeight = Math.min(320, Math.max(240, height * 0.4));
  const journal = useJournal(),
    status = useRunTracking();
  const [now, setNow] = useState(new Date()),
    [gps, setGPS] = useState(true),
    [note, setNote] = useState("");
  const [error, setError] = useState<string>(),
    [working, setWorking] = useState(false),
    [locating, setLocating] = useState(false);
  const [preview, setPreview] = useState<RunPoint[]>([]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const completed = route.params?.id
    ? journal.data.entries.find(
        (entry) => entry.id === route.params?.id && entry.kind === "workout",
      )
    : undefined;
  const saved = completed?.kind === "workout" ? completed : undefined;
  const active =
    !route.params?.id && journal.data.active?.activity === "Løping"
      ? journal.data.active
      : undefined;
  const run = saved?.run ?? active?.run;
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [active?.id]);
  const seconds = saved
    ? run
      ? runSeconds(saved.startedAt, run, new Date(saved.endedAt))
      : saved.seconds
    : active
      ? run
        ? runSeconds(active.startedAt, run, now)
        : Math.max(0, Math.floor((+now - +new Date(active.startedAt)) / 1000))
      : 0;
  const distance = useMemo(() => (run ? runDistance(run) : 0), [run?.points]);
  const points = run?.points ?? preview;
  const showError = (cause: unknown) => {
    if (alive.current)
      setError(
        cause instanceof Error
          ? cause.message
          : "Kunne ikke fullføre handlingen.",
      );
  };
  async function permitted() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Posisjonstilgang mangler. Tillat posisjon i iPhone-innstillingene, eller slå av GPS for å bruke kun tidtaking.",
      );
  }
  async function locate() {
    setLocating(true);
    setError(undefined);
    try {
      await permitted();
      const position = await withDeadline(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        15000,
        "Fant ikke posisjonen. Prøv igjen utendørs.",
      );
      if (alive.current)
        setPreview([
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy ?? 0,
            timestamp: position.timestamp,
            segment: 0,
          },
        ]);
    } catch (cause) {
      showError(cause);
    } finally {
      if (alive.current) setLocating(false);
    }
  }
  async function start() {
    setWorking(true);
    setError(undefined);
    try {
      if (gps) await permitted();
      await journal.start({
        id: makeLogId(),
        activity: "Løping",
        startedAt: new Date().toISOString(),
        note: note.trim(),
        run: emptyRun(gps),
      });
    } catch (cause) {
      showError(cause);
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  async function pause() {
    setWorking(true);
    setError(undefined);
    try {
      await journal.pauseRun();
    } catch (cause) {
      showError(cause);
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  async function finish() {
    if (!active) return;
    const id = active.id;
    setWorking(true);
    setError(undefined);
    try {
      await journal.finish();
      if (alive.current) navigation.setParams({ id });
    } catch (cause) {
      showError(cause);
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  function confirmFinish() {
    Alert.alert(
      "Avslutte løpeturen?",
      "Økten og registrerte GPS-punkter lagres på telefonen.",
      [
        { text: "Fortsett økten", style: "cancel" },
        { text: "Avslutt og lagre", onPress: () => void finish() },
      ],
    );
  }
  async function discard() {
    setWorking(true);
    try {
      await journal.discard();
      navigation.goBack();
    } catch (cause) {
      showError(cause);
    } finally {
      if (alive.current) setWorking(false);
    }
  }
  const isDetail = !!route.params?.id;
  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: "#F7F8FA" }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          position: "absolute",
          top: insets.top + 10,
          left: 16,
          right: 16,
          zIndex: 10,
          padding: 10,
          borderRadius: 24,
          backgroundColor: "#FFFFFFF2",
          shadowColor: "#21362A",
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          gap: 14,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tilbake"
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={23} color={ink} />
        </Pressable>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: ink }}>
            {saved
              ? "Løpeturen din"
              : active
                ? "Løpetur pågår"
                : "Start løpetur"}
          </Text>
          <Text style={{ color: muted, fontSize: 12 }}>
            {saved
              ? dateLabel(saved.startedAt, true)
              : active?.run?.pausedAt
                ? "På pause · ta den tiden du trenger"
                : active
                  ? "Ett steg av gangen"
                  : "Din tid. Ditt tempo."}
          </Text>
        </View>
        <Ionicons
          name={saved ? "checkmark-circle" : "fitness-outline"}
          color={saved ? "#39B8A5" : accent}
          size={26}
        />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {isDetail && !saved ? (
          <Text style={{ margin: 24, color: muted }}>
            {journal.loading
              ? "Laster løpeturen …"
              : "Denne løpeturen finnes ikke lenger."}
          </Text>
        ) : (
          <>
            <View
              style={{
                height: mapHeight,
                overflow: "hidden",
                backgroundColor: "#EDF3F0",
              }}
            >
              <RunMap
                points={points}
                live={!!active}
                emptyTitle={
                  saved
                    ? "Ingen GPS-rute registrert"
                    : active
                      ? run?.gpsEnabled
                        ? "Venter på posisjon"
                        : "Tidtaking uten GPS"
                      : "Din neste løpetur"
                }
              />
            </View>
            <View
              style={{
                padding: 18,
                gap: 14,
                marginTop: -24,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                backgroundColor: "#F7F8FA",
              }}
            >
              {(active || saved) && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
                >
                  <Ionicons
                    name={saved ? "checkmark-circle-outline" : "locate-outline"}
                    color={saved ? "#39B8A5" : accent}
                    size={16}
                  />
                  <Text style={{ color: muted, fontSize: 12, flex: 1 }}>
                    {saved
                      ? run?.points.length
                        ? "GPS-rute lagret på telefonen"
                        : "Lagret økt uten GPS-rute"
                      : status}
                  </Text>
                </View>
              )}
              <Stats
                seconds={seconds}
                distance={distance}
                hasGPS={!!run?.points.length}
              />
              {saved ? (
                <>
                  <Text style={{ fontSize: 25, fontWeight: "700", color: ink }}>
                    Godt jobbet!
                  </Text>
                  <Text style={{ fontSize: 14, color: muted, lineHeight: 21 }}>
                    Løpeturen er lagret. Du finner den igjen i Form → Trening.
                  </Text>
                  <View
                    style={{
                      backgroundColor: "#FFFFFF",
                      padding: 18,
                      gap: 14,
                      borderRadius: 22,
                    }}
                  >
                    <Detail
                      label="Start"
                      value={dateLabel(saved.startedAt, true)}
                    />
                    <Detail
                      label="Avsluttet"
                      value={dateLabel(saved.endedAt, true)}
                    />
                    <Detail
                      label="Total varighet"
                      value={timerLabel(saved.seconds)}
                    />
                    <Detail
                      label="Pauser"
                      value={timerLabel(
                        Math.floor((run?.pausedMs ?? 0) / 1000),
                      )}
                    />
                    {!!saved.note && (
                      <Text style={{ color: ink, lineHeight: 21 }}>
                        {saved.note}
                      </Text>
                    )}
                  </View>
                  <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>
                    Distanse og tempo bygger på registrerte GPS-punkter og aktiv
                    tid. Svakt signal og opphold i sporingen kan gi
                    ufullstendige tall.
                  </Text>
                  <Action
                    label="Tilbake til oversikt"
                    icon="checkmark"
                    onPress={() =>
                      navigation.popTo("Main", { screen: "Oversikt" })
                    }
                  />
                </>
              ) : active ? (
                <>
                  {run && (
                    <Action
                      label={run.pausedAt ? "Fortsett løpeturen" : "Pause"}
                      icon={run.pausedAt ? "play" : "pause"}
                      disabled={working}
                      onPress={() => void pause()}
                    />
                  )}
                  <Action
                    label={working ? "Lagrer …" : "Avslutt og lagre"}
                    icon="stop"
                    secondary
                    disabled={working || seconds < 1}
                    onPress={confirmFinish}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={working}
                    onPress={() =>
                      Alert.alert(
                        "Forkaste løpeturen?",
                        "Økten og ruten blir ikke lagret.",
                        [
                          { text: "Behold", style: "cancel" },
                          {
                            text: "Forkast",
                            style: "destructive",
                            onPress: () => void discard(),
                          },
                        ],
                      )
                    }
                    style={{
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: muted }}>Forkast løpeturen</Text>
                  </Pressable>
                  <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>
                    GPS registreres bare mens appen er åpen. Tidtaking
                    fortsetter i bakgrunnen til du pauser. Opphold i
                    GPS-sporingen tegnes ikke som rute.
                  </Text>
                </>
              ) : (
                <>
                  {journal.data.active ? (
                    <>
                      <Text style={{ color: muted }}>
                        Du har en annen treningsøkt på gang. Avslutt den før du
                        starter en løpetur.
                      </Text>
                      <Action
                        label="Åpne aktiv trening"
                        icon="fitness"
                        onPress={() =>
                          navigation.popTo("Main", { screen: "Form" })
                        }
                      />
                    </>
                  ) : (
                    <Action
                      label={working ? "Starter …" : "Start løpetur"}
                      icon="play"
                      disabled={
                        working || journal.loading || !journal.available
                      }
                      onPress={() => void start()}
                    />
                  )}
                  <View
                    style={{
                      padding: 18,
                      backgroundColor: "#FFFFFF",
                      borderRadius: 22,
                      gap: 16,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={23}
                        color={accent}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "600", color: ink }}>
                          Registrer med GPS
                        </Text>
                        <Text style={{ color: muted, fontSize: 12 }}>
                          Rute, distanse og gjennomsnittstempo
                        </Text>
                      </View>
                      <Switch
                        accessibilityLabel="Registrer løpetur med GPS"
                        value={gps}
                        onValueChange={setGPS}
                        trackColor={{ true: "#39B8A5" }}
                      />
                    </View>
                    {gps && (
                      <Action
                        secondary
                        disabled={locating}
                        label={
                          locating ? "Finner posisjon …" : "Finn GPS-posisjon"
                        }
                        icon="locate"
                        onPress={() => void locate()}
                      />
                    )}
                    <TextInput
                      accessibilityLabel="Notat for løpeturen"
                      placeholder="Plan for turen? (valgfritt)"
                      placeholderTextColor={muted}
                      value={note}
                      onChangeText={setNote}
                      maxLength={500}
                      multiline
                      style={{
                        minHeight: 55,
                        color: ink,
                        fontSize: 15,
                        backgroundColor: "#F7F8FA",
                        padding: 13,
                        borderRadius: 13,
                      }}
                    />
                  </View>
                  <Text style={{ color: muted, fontSize: 12, lineHeight: 18 }}>
                    {gps
                      ? "Tillat posisjon når du starter. GPS krever at appen er åpen; ingen bakgrunnssporing."
                      : "Kun tidtaking. Distanse og tempo vises ikke uten GPS."}
                  </Text>
                </>
              )}
              {(working || locating) && <ActivityIndicator color={accent} />}
              {(error || journal.error) && (
                <Text
                  accessibilityRole="alert"
                  style={{ color: "#C63F55", lineHeight: 21 }}
                >
                  {error ?? journal.error}
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", gap: 14 }}>
      <Text style={{ color: muted, flex: 1 }}>{label}</Text>
      <Text style={{ color: ink, fontWeight: "600", flexShrink: 1 }}>
        {value}
      </Text>
    </View>
  );
}
