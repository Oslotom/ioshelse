import React, { useEffect, useState } from "react";
import { Linking, Platform, Switch, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import {
  BigValue,
  Button,
  Card,
  Copy,
  Heading,
  Page,
  Row,
  Status,
  Title,
  useVitalTheme,
} from "../components/UI";
import { useHealth } from "../data/store";
import { number } from "../data/models";
import { ImportSteps } from "../components/ImportSteps";
import { Segments } from "./Analytics";

export function Onboarding() {
  const { update, setDemo, connect, connectPhone, healthKitAvailable, error } =
      useHealth(),
    theme = useVitalTheme(),
    [connecting, setConnecting] = useState(false);
  return (
    <Page>
      <View style={{ height: 34 }} />
      <Text
        style={{
          fontSize: 13,
          letterSpacing: 6,
          fontWeight: "700",
          color: theme.mint,
        }}
      >
        VITAL
      </Text>
      <Heading>Din helse.{`\n`}Et klarere bilde.</Heading>
      <Copy>
        Små bevegelser. Gode vaner. Få en rolig oversikt over aktivitet, puls og
        søvn.
      </Copy>
      <Card>
        <Title
          text="Bare på din iPhone"
          icon="shield-checkmark"
          color={theme.mint}
        />
        <Copy>
          Hent ekte skritt fra iPhonens bevegelsessensor, også i Expo Go. Ingen
          Apple Developer-konto, server eller deling av helseopplysninger.
        </Copy>
        <Copy small>
          Du blir spurt om tilgang til Bevegelse og trening. Skrittelleren gir
          dagens skritt og opptil seks tidligere dager. Puls, søvn og energi er
          ikke tilgjengelig fra denne sensoren.
        </Copy>
      </Card>
      <Button
        label={
          connecting ? "Åpner skrittelleren …" : "Bruk iPhonens skritteller"
        }
        disabled={connecting || Platform.OS !== "ios"}
        onPress={() => {
          setConnecting(true);
          void connectPhone().finally(() => setConnecting(false));
        }}
      />
      {healthKitAvailable && (
        <Button
          label="Bruk Apple Helse i stedet"
          secondary
          disabled={connecting}
          onPress={() => {
            setConnecting(true);
            void connect().finally(() => setConnecting(false));
          }}
        />
      )}
      <Button
        label="Utforsk med demodata"
        secondary
        onPress={() => {
          update({ onboarded: true });
          void setDemo(true);
        }}
      />
      <ImportSteps />
      <Button
        label="Fortsett uten tilgang"
        secondary
        onPress={() => update({ onboarded: true })}
      />
      {error && (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.secondary, lineHeight: 22 }}
        >
          {error}
        </Text>
      )}
      <Copy small>
        Ekte skritt og demomodus holdes adskilt. Apple Helse er et valgfritt
        alternativ i native iOS-bygg. VITAL gir ingen medisinske vurderinger.
      </Copy>
    </Page>
  );
}
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useVitalTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: t.mint }}
      />
    </View>
  );
}
export function Settings() {
  const {
      preferences,
      update,
      setDemo,
      connect,
      connectPhone,
      healthKitAvailable,
      refresh,
      lastRefresh,
      loading,
    } = useHealth(),
    theme = useVitalTheme();
  const [reminder, setReminder] = useState(false),
    [notificationError, setNotificationError] = useState<string>();
  useEffect(() => {
    void Notifications.getAllScheduledNotificationsAsync()
      .then((rows) =>
        setReminder(rows.some((r) => r.identifier === "vital.daily")),
      )
      .catch(() => {});
  }, []);
  async function toggleReminder(enabled: boolean) {
    setNotificationError(undefined);
    try {
      if (!enabled) {
        await Notifications.cancelScheduledNotificationAsync("vital.daily");
        setReminder(false);
        return;
      }
      const status = await Notifications.requestPermissionsAsync();
      if (!status.granted) {
        setNotificationError(
          "Varsler er ikke tillatt. Du kan endre dette i iPhone-innstillingene.",
        );
        return;
      }
      await Notifications.scheduleNotificationAsync({
        identifier: "vital.daily",
        content: {
          title: "Et øyeblikk for deg",
          body: "Se dagens aktivitet i VITAL.",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 19,
          minute: 0,
        },
      });
      setReminder(true);
    } catch {
      setNotificationError(
        "Kunne ikke endre påminnelsen. Prøv igjen i et native appbygg.",
      );
    }
  }
  return (
    <Page>
      <Status />
      <Card>
        <Title text="Datakilde" icon="footsteps" color={theme.mint} />
        <Row
          label="Valgt kilde for ekte data"
          value={
            preferences.source === "pedometer"
              ? "iPhonens skritteller"
              : preferences.source === "import"
                ? "Importert skritthistorikk"
                : "Apple Helse"
          }
        />
        <Button
          label="Bruk iPhonens skritteller"
          onPress={() => void connectPhone()}
          disabled={Platform.OS !== "ios" || loading}
        />
        <Copy small>
          Fungerer i Expo Go uten Apple Developer-konto. Krever tilgang til
          Bevegelse og trening. Gir bare skritt fra iPhone, ikke målinger fra
          klokker eller Apple Helse.
        </Copy>
        <Button
          label="Åpne iPhone-innstillinger"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(() => {});
          }}
        />
        {healthKitAvailable && (
          <Button
            label="Bruk Apple Helse i stedet"
            secondary
            disabled={loading}
            onPress={() => void connect()}
          />
        )}
        {!healthKitAvailable && (
          <Copy small>
            Puls, HRV, søvn, distanse og energi er ikke tilgjengelig fra
            skrittelleren. Apple Helse krever et separat native iOS-bygg.
          </Copy>
        )}

        <Button
          label={loading ? "Oppdaterer …" : "Oppdater nå"}
          secondary
          disabled={loading}
          onPress={() => void refresh()}
        />
        {lastRefresh && (
          <Row
            label="Sist hentet"
            value={lastRefresh.toLocaleString("nb-NO", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        )}
        {preferences.source === "healthkit" && (
          <Copy small>
            Apple oppgir ikke om lesetilgang er avslått. Manglende målinger kan
            bety at data eller tilgang mangler. Administrer tilgang i Helse →
            profil → Apper → VITAL.
          </Copy>
        )}
      </Card>
      <ImportSteps />
      <Card>
        <Title text="Dine mål" icon="flag" color={theme.mint} />
        <BigValue value={number(preferences.goal)} unit="skritt per dag" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="− 500"
              secondary
              disabled={preferences.goal <= 1000}
              onPress={() =>
                update({ goal: Math.max(1000, preferences.goal - 500) })
              }
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="+ 500"
              secondary
              disabled={preferences.goal >= 40000}
              onPress={() =>
                update({ goal: Math.min(40000, preferences.goal + 500) })
              }
            />
          </View>
        </View>
        <Toggle
          label="Vis distanse i miles"
          value={preferences.miles}
          onChange={(miles) => update({ miles })}
        />
        <Copy small>Målhistorikken beregnes med ditt nåværende mål.</Copy>
      </Card>
      <Card>
        <Title text="Utseende" icon="contrast" color={theme.lavender} />
        <Segments
          values={["Lyst", "Mørkt", "System"]}
          value={
            preferences.appearance === "light"
              ? "Lyst"
              : preferences.appearance === "dark"
                ? "Mørkt"
                : "System"
          }
          onChange={(v) =>
            update({
              appearance:
                v === "Lyst" ? "light" : v === "Mørkt" ? "dark" : "system",
            })
          }
        />
        <Toggle
          label="Vis sjudagerssnitt i skrittdiagram"
          value={preferences.average}
          onChange={(average) => update({ average })}
        />
      </Card>
      <Card>
        <Title text="Demonstrasjon" icon="sparkles" color={theme.orange} />
        <Toggle
          label="Bruk demodata"
          value={preferences.demo}
          onChange={(value) => void setDemo(value)}
        />
        <Copy small>
          Demodata er eksempler, ikke dine målinger. Bytte av modus endrer aldri
          Apple Helse.
        </Copy>
      </Card>
      <Card>
        <Title
          text="Påminnelser"
          icon="notifications-outline"
          color={theme.mint}
        />
        <Toggle
          label="Daglig påminnelse kl. 19"
          value={reminder}
          onChange={(value) => void toggleReminder(value)}
        />
        {notificationError && (
          <Text
            accessibilityRole="alert"
            style={{ color: theme.secondary, fontSize: 13 }}
          >
            {notificationError}
          </Text>
        )}
        <Copy small>
          Varsler planlegges lokalt og inneholder ingen helseopplysninger.
        </Copy>
      </Card>
      <Card>
        <Title text="Personvern" icon="lock-closed" color={theme.mint} />
        <Copy>
          Opplysningene blir på enheten. VITAL leser fra iPhonens skritteller
          eller, i native bygg, Apple Helse. Ingen konto, analyseverktøy eller
          server. Innstillinger og eventuell importert skritthistorikk lagres
          lokalt. Importen kan slettes under Datakilde.
        </Copy>
        <Row label="Versjon" value="1.0.0" />
      </Card>
    </Page>
  );
}
