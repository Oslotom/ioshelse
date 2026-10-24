import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useJournal } from "../data/journal-store";
import {
  formLabels,
  glucoseContexts,
  glucoseValue,
  makeLogId,
  WorkoutType,
  workoutTypes,
} from "../data/journal";
import { Button, Copy, Heading, useReduceMotion, useVitalTheme } from "./UI";

type SheetPage = "menu" | "form" | "workout" | "glucose";
export function LogSheet({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const journal = useJournal(),
    theme = useVitalTheme(),
    insets = useSafeAreaInsets(),
    reduce = useReduceMotion();
  const [page, setPage] = useState<SheetPage>("menu"),
    [rating, setRating] = useState(3),
    [glucose, setGlucose] = useState(""),
    [context, setContext] =
      useState<(typeof glucoseContexts)[number]>("Ikke angitt"),
    [activity, setActivity] = useState<WorkoutType>("Gåtur"),
    [note, setNote] = useState(""),
    [date, setDate] = useState(new Date()),
    [error, setError] = useState<string>(),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (visible) {
      setPage("menu");
      setRating(3);
      setGlucose("");
      setContext("Ikke angitt");
      setActivity("Gåtur");
      setNote("");
      setDate(new Date());
      setError(undefined);
    }
  }, [visible]);
  const disabled = saving || journal.busy || journal.loading;
  const inputStyle = {
    backgroundColor: theme.track,
    borderRadius: 14,
    padding: 15,
    color: theme.text,
    fontSize: 16,
  };
  async function submit() {
    if (disabled) return;
    setSaving(true);
    setError(undefined);
    try {
      if (date > new Date())
        throw new Error("Tidspunktet kan ikke være i fremtiden.");
      const id = makeLogId();
      if (page === "form")
        await journal.save({
          id,
          kind: "form",
          date: date.toISOString(),
          rating,
          note: note.trim(),
        });
      if (page === "glucose")
        await journal.save({
          id,
          kind: "glucose",
          date: date.toISOString(),
          value: glucoseValue(glucose),
          context,
          note: note.trim(),
        });
      if (page === "workout")
        await journal.start({
          id,
          startedAt: new Date().toISOString(),
          activity,
          note: note.trim(),
        });
      onSaved();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Kunne ikke lagre. Prøv igjen.",
      );
    } finally {
      setSaving(false);
    }
  }
  function chips<T extends string>(
    values: readonly T[],
    selected: T,
    onSelect: (value: T) => void,
  ) {
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {values.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === value }}
            onPress={() => onSelect(value)}
            disabled={disabled}
            style={{
              paddingVertical: 11,
              paddingHorizontal: 14,
              borderRadius: 13,
              backgroundColor: selected === value ? theme.mint : theme.track,
            }}
          >
            <Text
              style={{
                color: selected === value ? "#062C26" : theme.text,
                fontWeight: "500",
              }}
            >
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduce ? "none" : "slide"}
      onRequestClose={() => {
        if (!disabled) onClose();
      }}
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lukk registrering"
          disabled={disabled}
          onPress={onClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#00000055",
          }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: theme.card,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            maxHeight: "92%",
            paddingBottom: Math.max(18, insets.bottom),
          }}
        >
          <View
            style={{
              alignSelf: "center",
              height: 5,
              width: 38,
              borderRadius: 3,
              backgroundColor: theme.secondary,
              opacity: 0.3,
              marginTop: 10,
            }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, gap: 20 }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 14 }}
            >
              {page !== "menu" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Tilbake til valg"
                  disabled={disabled}
                  onPress={() => {
                    setPage("menu");
                    setError(undefined);
                  }}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={24} color={theme.text} />
                </Pressable>
              )}
              <View style={{ flex: 1 }}>
                <Heading>
                  {page === "menu"
                    ? "Hva vil du logge?"
                    : page === "form"
                      ? "Dagens form"
                      : page === "workout"
                        ? "Start trening"
                        : "Logg blodsukker"}
                </Heading>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lukk"
                disabled={disabled}
                onPress={onClose}
                hitSlop={10}
              >
                <Ionicons name="close" size={23} color={theme.secondary} />
              </Pressable>
            </View>
            {page === "menu" ? (
              <>
                <Copy>
                  Små notater gir deg en personlig historikk. Alt lagres på
                  telefonen.
                </Copy>
                {(
                  [
                    {
                      page: "form",
                      title: "Dagens form",
                      description: "Hvordan har du det i dag?",
                      icon: "happy-outline",
                      color: theme.mint,
                    },
                    {
                      page: "workout",
                      title: journal.data.active
                        ? "Trening pågår"
                        : "Start trening",
                      description: journal.data.active
                        ? "Se og avslutt økten i Form"
                        : "Start tidtaking av en treningsøkt",
                      icon: "fitness-outline",
                      color: theme.orange,
                    },
                    {
                      page: "glucose",
                      title: "Logg blodsukker",
                      description: "Registrer en måling i mmol/L",
                      icon: "water-outline",
                      color: theme.coral,
                    },
                  ] as const
                ).map((option) => (
                  <Pressable
                    key={option.page}
                    accessibilityRole="button"
                    onPress={() => {
                      if (option.page === "workout" && journal.data.active) {
                        onSaved();
                        return;
                      }
                      setPage(option.page);
                      setNote("");
                      setDate(new Date());
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 15,
                      padding: 18,
                      borderRadius: 20,
                      backgroundColor: theme.track,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <View
                      style={{
                        padding: 11,
                        borderRadius: 15,
                        backgroundColor: option.color + "22",
                      }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={25}
                        color={option.color}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        {option.title}
                      </Text>
                      <Copy small>{option.description}</Copy>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={theme.secondary}
                    />
                  </Pressable>
                ))}
              </>
            ) : (
              <>
                {page === "form" && (
                  <>
                    <Copy>
                      Hvordan opplever du formen din? Dette er din egen
                      vurdering.
                    </Copy>
                    {chips(formLabels, formLabels[rating - 1]!, (value) =>
                      setRating(formLabels.indexOf(value) + 1),
                    )}
                  </>
                )}
                {page === "workout" && (
                  <>
                    <Copy>
                      Velg aktivitet. Klokken starter når du trykker Start.
                      Økten fortsetter å telles fra starttidspunktet når appen
                      er i bakgrunnen.
                    </Copy>
                    {chips(workoutTypes, activity, setActivity)}
                    <Copy small>
                      Kun tidtaking. Ingen GPS, puls eller kaloriberegning.
                    </Copy>
                  </>
                )}
                {page === "glucose" && (
                  <>
                    <Copy>
                      Legg inn verdien fra måleapparatet ditt. Appen måler ikke
                      blodsukker.
                    </Copy>
                    <TextInput
                      accessibilityLabel="Blodsukker i mmol/L"
                      placeholder="For eksempel 5,6"
                      placeholderTextColor={theme.secondary}
                      keyboardType="decimal-pad"
                      value={glucose}
                      onChangeText={setGlucose}
                      maxLength={8}
                      editable={!disabled}
                      style={inputStyle}
                    />
                    <Text style={{ color: theme.secondary, fontSize: 13 }}>
                      Enhet: mmol/L
                    </Text>
                    {chips(glucoseContexts, context, setContext)}
                  </>
                )}
                {page !== "workout" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Copy>Tidspunkt</Copy>
                    <DateTimePicker
                      value={date}
                      maximumDate={new Date()}
                      mode={Platform.OS === "ios" ? "datetime" : "date"}
                      locale="nb-NO"
                      themeVariant={theme.dark ? "dark" : "light"}
                      onChange={(_, value) => {
                        if (value) setDate(value);
                      }}
                    />
                  </View>
                )}
                <TextInput
                  accessibilityLabel="Valgfritt notat"
                  placeholder="Legg til et notat (valgfritt)"
                  placeholderTextColor={theme.secondary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={500}
                  editable={!disabled}
                  style={[
                    inputStyle,
                    { minHeight: 95, textAlignVertical: "top" },
                  ]}
                />
                {error && (
                  <Text
                    accessibilityRole="alert"
                    style={{ color: theme.coral }}
                  >
                    {error}
                  </Text>
                )}
                {journal.error && <Copy small>{journal.error}</Copy>}
                {journal.loading && <Copy small>Laster loggen …</Copy>}
                <Button
                  label={
                    saving
                      ? "Lagrer …"
                      : page === "workout"
                        ? "Start økten"
                        : "Lagre registrering"
                  }
                  disabled={disabled}
                  onPress={() => void submit()}
                />
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
