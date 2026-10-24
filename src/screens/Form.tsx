import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { DailyFormDashboard } from "../components/DailyFormDashboard";
import { DailyFormSheet } from "../components/DailyFormEditor";
import { dailyScore, dayDate } from "../data/daily-form";
import { useJournal } from "../data/journal-store";
import {
  elapsedSeconds,
  formLabels,
  JournalEntry,
  timerLabel,
} from "../data/journal";
import { dateLabel, number } from "../data/models";
import { useHealth } from "../data/store";
import {
  Button,
  Card,
  Copy,
  Row,
  Title,
  useVitalTheme,
} from "../components/UI";

export function FormScreen() {
  const journal = useJournal(),
    { preferences } = useHealth(),
    theme = useVitalTheme();
  const [filter, setFilter] = useState<
      "Alle" | "Form" | "Trening" | "Blodsukker"
    >("Alle"),
    [now, setNow] = useState(new Date()),
    [actionError, setActionError] = useState<string>(),
    [editDay, setEditDay] = useState<string>();
  useEffect(() => {
    if (!journal.data.active) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [journal.data.active?.id]);
  const entries = journal.data.entries.filter(
    (entry) =>
      filter === "Alle" ||
      (filter === "Form" &&
        (entry.kind === "form" || entry.kind === "dailyForm")) ||
      (filter === "Trening" && entry.kind === "workout") ||
      (filter === "Blodsukker" && entry.kind === "glucose"),
  );
  async function finish() {
    setActionError(undefined);
    try {
      await journal.finish();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Kunne ikke lagre økten.",
      );
    }
  }
  function discard() {
    Alert.alert(
      "Forkaste treningsøkten?",
      "Den pågående økten blir ikke lagret i historikken.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Forkast",
          style: "destructive",
          onPress: () => {
            void journal
              .discard()
              .catch(() => setActionError("Kunne ikke forkaste økten."));
          },
        },
      ],
    );
  }
  function remove(entry: JournalEntry) {
    Alert.alert(
      "Slette registreringen?",
      "Dette sletter bare denne registreringen fra VITAL.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett",
          style: "destructive",
          onPress: () => {
            void journal
              .remove(entry.id)
              .catch(() => setActionError("Kunne ikke slette registreringen."));
          },
        },
      ],
    );
  }
  return (
    <>
      <FlatList
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        data={entries}
        keyExtractor={(entry) => entry.id}
        refreshing={journal.loading}
        onRefresh={() => {
          if (!journal.busy) void journal.reload();
        }}
        ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListHeaderComponent={
          <View style={{ gap: 20, marginBottom: 20 }}>
            {preferences.demo && <Copy>Demomodus · fiktive eksempeldata. Egne registreringer vises når du slår av demomodus.</Copy>}
            {journal.data.active && (
              <Card>
                <Title
                  text="Trening pågår"
                  icon="fitness"
                  color={theme.orange}
                />
                <Text
                  style={{
                    fontSize: 42,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "600",
                    color: theme.text,
                  }}
                >
                  {timerLabel(
                    elapsedSeconds(journal.data.active.startedAt, now),
                  )}
                </Text>
                <Row label="Aktivitet" value={journal.data.active.activity} />
                <Copy small>
                  Startet {dateLabel(journal.data.active.startedAt, true)} ·
                  tidtaking uten GPS
                </Copy>
                <Button
                  label={journal.busy ? "Lagrer …" : "Avslutt og lagre økten"}
                  onPress={() => void finish()}
                  disabled={journal.busy}
                />
                <Button
                  label="Forkast økten"
                  secondary
                  onPress={discard}
                  disabled={journal.busy}
                />
              </Card>
            )}
            {(journal.error || actionError) && (
              <Card>
                <Text accessibilityRole="alert" style={{ color: theme.coral }}>
                  {actionError ?? journal.error}
                </Text>
                <Button
                  label="Last loggen på nytt"
                  secondary
                  onPress={() => void journal.reload()}
                  disabled={journal.busy || journal.loading}
                />
              </Card>
            )}
            <DailyFormDashboard />
            <Card>
              <Title
                text="Logghistorikk"
                icon="journal-outline"
                color={theme.mint}
              />
              <Copy>
                Bruk + i bunnmenyen for å logge form, starte trening eller
                registrere blodsukker.
              </Copy>
              <Copy small>
                Dette er dine egne registreringer. De lagres lokalt og skrives
                ikke til Apple Helse.
                {preferences.demo
                  ? " De er adskilt fra demodataene i helseoversikten."
                  : ""}
              </Copy>
            </Card>
            <View
              accessibilityRole="tablist"
              style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}
            >
              {(["Alle", "Form", "Trening", "Blodsukker"] as const).map(
                (value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === value }}
                    onPress={() => setFilter(value)}
                    style={{
                      backgroundColor:
                        filter === value ? theme.mint : theme.card,
                      paddingVertical: 11,
                      paddingHorizontal: 15,
                      borderRadius: 13,
                    }}
                  >
                    <Text
                      style={{
                        color: filter === value ? "#062C26" : theme.text,
                        fontWeight: "500",
                      }}
                    >
                      {value}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          journal.loading ? (
            <ActivityIndicator color={theme.mint} />
          ) : (
            <Card>
              <Title
                text={
                  journal.available
                    ? "Ingen registreringer ennå"
                    : "Historikken er ikke lastet"
                }
                icon="create-outline"
                color={theme.mint}
              />
              <Copy>
                {filter === "Alle"
                  ? "Trykk på + for å legge til din første registrering."
                  : "Ingen registreringer av denne typen. Velg et annet filter eller legg til en ny med +."}
              </Copy>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <Title
                text={
                  item.kind === "form" || item.kind === "dailyForm"
                    ? "Dagens form"
                    : item.kind === "glucose"
                      ? "Blodsukker"
                      : item.activity
                }
                icon={
                  item.kind === "form" || item.kind === "dailyForm"
                    ? "happy-outline"
                    : item.kind === "glucose"
                      ? "water-outline"
                      : "fitness-outline"
                }
                color={
                  item.kind === "form" || item.kind === "dailyForm"
                    ? theme.mint
                    : item.kind === "glucose"
                      ? theme.coral
                      : theme.orange
                }
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Slett registrering fra ${dateLabel(item.date, true)}`}
                disabled={journal.busy}
                onPress={() => remove(item)}
                hitSlop={12}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.secondary}
                />
              </Pressable>
            </View>
            <Text
              style={{ color: theme.text, fontSize: 26, fontWeight: "600" }}
            >
              {item.kind === "dailyForm"
                ? `${number(dailyScore(item), 1)} / 10`
                : item.kind === "form"
                  ? formLabels[item.rating - 1]
                  : item.kind === "glucose"
                    ? `${number(item.value, 2)} mmol/L`
                    : timerLabel(item.seconds)}
            </Text>
            <Copy small>
              {item.kind === "dailyForm"
                ? dayDate(item.day).toLocaleDateString("nb-NO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : new Date(item.date).toLocaleString("nb-NO", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
            </Copy>
            {item.kind === "glucose" && (
              <Copy small>
                {item.context === "Ikke angitt"
                  ? "Måltidssituasjon ikke angitt"
                  : item.context}{" "}
                · manuelt registrert måling
              </Copy>
            )}
            {item.kind === "dailyForm" && (
              <>
                <Copy small>Subjektiv formscore · seks målinger</Copy>
                <Copy small>
                  {item.symptoms.length
                    ? item.symptoms.join(" · ")
                    : "Ingen symptomer registrert"}
                </Copy>
                <Button
                  label="Åpne og rediger"
                  secondary
                  onPress={() => setEditDay(item.day)}
                />
              </>
            )}
            {item.kind === "form" && (
              <Copy small>Tidligere egenvurdering · {item.rating} av 5</Copy>
            )}
            {!!item.note && <Copy>{item.note}</Copy>}
          </Card>
        )}
        ListFooterComponent={
          <View style={{ paddingTop: 22 }}>
            <Copy small>
              VITAL viser det du har registrert og gir ingen medisinske
              vurderinger eller behandlingsråd. Målingene tolkes ikke
              automatisk.
            </Copy>
          </View>
        }
      />
      <DailyFormSheet day={editDay} onClose={() => setEditDay(undefined)} />
    </>
  );
}
