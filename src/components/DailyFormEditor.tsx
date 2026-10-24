import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  dailyEntries,
  dailyMetrics,
  DailyValues,
  dayDate,
  dayKey,
  defaultDailyValues,
  metricTone,
  MetricKey,
  Symptom,
  symptomOptions,
} from "../data/daily-form";
import { makeLogId } from "../data/journal";
import { useJournal } from "../data/journal-store";
import { Button, Copy, Heading, useReduceMotion, useVitalTheme } from "./UI";

function MetricSlider({
  metric,
  value,
  onChange,
  disabled,
}: {
  metric: (typeof dailyMetrics)[number];
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}) {
  const theme = useVitalTheme(),
    reduce = useReduceMotion(),
    scale = useRef(new Animated.Value(1)).current,
    color = metricTone(metric.key, value);
  function complete() {
    void Haptics.selectionAsync().catch(() => {});
    if (!reduce) {
      scale.setValue(1.12);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 3,
      }).start();
    }
  }
  return (
    <View
      style={{
        gap: 5,
        padding: 13,
        borderRadius: 18,
        backgroundColor: theme.track,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={metric.icon} size={18} color={color} />
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {metric.label}
        </Text>
        <Animated.Text
          style={{
            color,
            fontSize: 21,
            fontWeight: "700",
            transform: [{ scale }],
          }}
        >
          {value}
          <Text style={{ fontSize: 12, color: theme.secondary }}> / 10</Text>
        </Animated.Text>
      </View>
      <Slider
        accessibilityLabel={metric.label}
        accessibilityValue={{
          min: 1,
          max: 10,
          now: value,
          text: `${value} av 10. 1: ${metric.low}. 10: ${metric.high}.`,
        }}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        onSlidingComplete={complete}
        minimumTrackTintColor={color}
        maximumTrackTintColor={theme.secondary + "44"}
        thumbTintColor={color}
        disabled={disabled}
        style={{ width: "100%", height: 44 }}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontSize: 11,
            lineHeight: 14,
            color: theme.secondary,
          }}
        >
          1 · {metric.low}
        </Text>
        <Text
          style={{
            flex: 1,
            textAlign: "right",
            fontSize: 11,
            lineHeight: 14,
            color: theme.secondary,
          }}
        >
          10 · {metric.high}
        </Text>
      </View>
    </View>
  );
}
export function DailyFormFields({
  day = dayKey(new Date()),
  onSaved,
  onSaving,
}: {
  day?: string;
  onSaved: () => void;
  onSaving?: (saving: boolean) => void;
}) {
  const journal = useJournal(),
    theme = useVitalTheme(),
    reduce = useReduceMotion();
  const existing = useMemo(
    () => dailyEntries(journal.data.entries).find((entry) => entry.day === day),
    [journal.data.entries, day],
  );
  const [metrics, setMetrics] = useState<DailyValues>(() =>
      existing ? { ...existing.metrics } : defaultDailyValues(),
    ),
    [symptoms, setSymptoms] = useState<Symptom[]>(() =>
      existing ? [...existing.symptoms] : [],
    ),
    [note, setNote] = useState(existing?.note ?? ""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState<string>();
  const loaded = useRef(false),
    alive = useRef(true),
    success = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!journal.loading && !loaded.current) {
      loaded.current = true;
      if (existing) {
        setMetrics({ ...existing.metrics });
        setSymptoms([...existing.symptoms]);
        setNote(existing.note);
      }
    }
  }, [journal.loading, existing]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  function change(key: MetricKey, value: number) {
    setMetrics((current) => ({ ...current, [key]: Math.round(value) }));
  }
  async function save() {
    if (saving || journal.busy || journal.loading) return;
    setSaving(true);
    onSaving?.(true);
    setError(undefined);
    try {
      const now = new Date();
      if (day > dayKey(now))
        throw new Error(
          "Du kan ikke registrere dagsform for en framtidig dato.",
        );
      await journal.save({
        id: existing?.id ?? makeLogId(),
        kind: "dailyForm",
        date:
          existing?.date ??
          (day === dayKey(now) ? now : dayDate(day)).toISOString(),
        day,
        metrics: { ...metrics },
        symptoms: [...symptoms],
        note: note.trim(),
        createdAt: existing?.createdAt ?? now.toISOString(),
        updatedAt: now.toISOString(),
      });
      if (!alive.current) return;
      setSaved(true);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      Animated.timing(success, {
        toValue: 1,
        duration: reduce ? 0 : 220,
        useNativeDriver: true,
      }).start();
      await new Promise((resolve) => setTimeout(resolve, reduce ? 150 : 400));
      if (alive.current) onSaved();
    } catch (error) {
      if (alive.current)
        setError(
          error instanceof Error
            ? error.message
            : "Kunne ikke lagre dagsformen.",
        );
    } finally {
      if (alive.current) setSaving(false);
      onSaving?.(false);
    }
  }
  const disabled = saving || journal.busy || journal.loading;
  return (
    <View style={{ gap: 12 }}>
      <Copy>
        {dayDate(day).toLocaleDateString("nb-NO", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        {existing ? " · rediger registrering" : ""}
      </Copy>
      {dailyMetrics.map((metric) => (
        <MetricSlider
          key={metric.key}
          metric={metric}
          value={metrics[metric.key]}
          onChange={(value) => change(metric.key, value)}
          disabled={disabled}
        />
      ))}
      <Text
        style={{
          color: theme.text,
          fontWeight: "600",
          fontSize: 15,
          marginTop: 6,
        }}
      >
        Symptomer
      </Text>
      <Copy small>
        Velg alle som passer. Ingen valg betyr ingen registrerte symptomer.
      </Copy>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {symptomOptions.map((symptom) => {
          const selected = symptoms.includes(symptom);
          return (
            <Pressable
              key={symptom}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              disabled={disabled}
              onPress={() =>
                setSymptoms((current) =>
                  current.includes(symptom)
                    ? current.filter((value) => value !== symptom)
                    : [...current, symptom],
                )
              }
              style={{
                maxWidth: "100%",
                paddingHorizontal: 12,
                paddingVertical: 11,
                minHeight: 44,
                justifyContent: "center",
                borderRadius: 12,
                backgroundColor: selected ? theme.mint : theme.track,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              }}
            >
              {selected && (
                <Ionicons name="checkmark" size={14} color="#062C26" />
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: selected ? "#062C26" : theme.text,
                }}
              >
                {symptom}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        accessibilityLabel="Hvordan har du det i dag?"
        placeholder="Hvordan har du det i dag?"
        placeholderTextColor={theme.secondary}
        value={note}
        onChangeText={setNote}
        editable={!disabled}
        multiline
        maxLength={500}
        style={{
          backgroundColor: theme.track,
          borderRadius: 15,
          padding: 15,
          minHeight: 95,
          color: theme.text,
          fontSize: 15,
          textAlignVertical: "top",
        }}
      />
      {(error || journal.error) && (
        <Text accessibilityRole="alert" style={{ color: theme.coral }}>
          {error ?? journal.error}
        </Text>
      )}
      {!journal.available && !journal.loading && (
        <Button
          label="Last loggen på nytt"
          secondary
          onPress={() => void journal.reload()}
        />
      )}
      {saved ? (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={{
            opacity: success,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 15,
          }}
        >
          <Ionicons name="checkmark-circle" size={24} color={theme.mint} />
          <Text style={{ color: theme.text, fontWeight: "600" }}>
            Dagens form er lagret
          </Text>
        </Animated.View>
      ) : (
        <Button
          label={saving ? "Lagrer …" : "Lagre dagens form"}
          disabled={disabled || !journal.available}
          onPress={() => void save()}
        />
      )}
    </View>
  );
}
export function DailyFormSheet({
  day,
  onClose,
}: {
  day?: string;
  onClose: () => void;
}) {
  const theme = useVitalTheme(),
    insets = useSafeAreaInsets(),
    reduce = useReduceMotion(),
    [saving, setSaving] = useState(false);
  return (
    <Modal
      visible={!!day}
      transparent
      animationType={reduce ? "none" : "slide"}
      onRequestClose={() => {
        if (!saving) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lukk dagsform"
          disabled={saving}
          onPress={onClose}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#00000055",
          }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "94%",
            backgroundColor: theme.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: Math.max(18, insets.bottom),
          }}
        >
          <View
            style={{
              height: 5,
              width: 38,
              borderRadius: 3,
              alignSelf: "center",
              backgroundColor: theme.secondary,
              opacity: 0.3,
              marginTop: 10,
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 18 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Heading>Dagens form</Heading>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lukk"
                disabled={saving}
                onPress={onClose}
                hitSlop={12}
              >
                <Ionicons name="close" size={24} color={theme.secondary} />
              </Pressable>
            </View>
            {day && (
              <DailyFormFields
                key={day}
                day={day}
                onSaved={onClose}
                onSaving={setSaving}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
