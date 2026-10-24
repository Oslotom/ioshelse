import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildImportedSteps, ExportPreview } from "../data/apple-export";
import { pickAppleExport } from "../data/import-storage";
import { dateLabel, number } from "../data/models";
import { useHealth } from "../data/store";
import {
  Button,
  Card,
  Copy,
  Heading,
  Page,
  Row,
  Title,
  useVitalTheme,
} from "./UI";

const fullDate = (date: string) =>
  new Date(date).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function ImportSteps() {
  const {
      importInfo,
      commitImport,
      activateImport,
      removeImport,
      preferences,
    } = useHealth(),
    theme = useVitalTheme();
  const [pending, setPending] = useState<{
      preview: ExportPreview;
      name: string;
    }>(),
    [source, setSource] = useState("");
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState<string>();
  const controller = useRef<AbortController | undefined>(undefined),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  async function choose() {
    controller.current = new AbortController();
    setBusy(true);
    setProgress(0);
    setError(undefined);
    try {
      const result = await pickAppleExport((value) => {
        if (mounted.current) setProgress(value);
      }, controller.current.signal);
      if (result && mounted.current) {
        setPending(result);
        setSource(result.preview.sources[0]!.id);
      }
    } catch (e) {
      if (mounted.current)
        setError(e instanceof Error ? e.message : "Kunne ikke lese eksporten.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const value = useMemo(
    () =>
      pending && pending.preview.sources.some((s) => s.id === source)
        ? buildImportedSteps(pending.preview, source, pending.name)
        : undefined,
    [pending, source],
  );
  async function apply() {
    if (!value) return;
    setBusy(true);
    setError(undefined);
    try {
      await commitImport(value);
      if (mounted.current) setPending(undefined);
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error
            ? e.message
            : "Importen kunne ikke lagres. Forrige import er beholdt.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  function deleteSaved() {
    Alert.alert(
      "Slette importert historikk?",
      "Dette sletter bare den lagrede importen i VITAL. Originalfilen og Apple Helse endres ikke.",
      [
        { text: "Avbryt", style: "cancel" },
        {
          text: "Slett import",
          style: "destructive",
          onPress: () => {
            void removeImport().catch(() =>
              setError("Kunne ikke slette importen. Prøv igjen."),
            );
          },
        },
      ],
    );
  }
  return (
    <>
      <Card>
        <Title
          text="Importer skritthistorikk"
          icon="document-attach-outline"
          color={theme.mint}
        />
        <Copy>
          I Helse: trykk på profilbildet → Eksporter alle helsedata. Lagre
          eksporten i Filer, og velg export.zip her. Du kan også velge
          export.xml etter utpakking.
        </Copy>
        <Copy small>
          Kun skritt importeres. Ingen Apple Developer-konto er nødvendig. Du
          velger én kilde; importen blandes ikke med skrittelleren eller
          demodata.
        </Copy>
        <Button
          label={
            busy
              ? `Leser eksport … ${Math.round(progress * 100)} %`
              : "Velg eksportfil"
          }
          onPress={() => void choose()}
          disabled={busy}
        />
        {busy && !pending && (
          <Button
            label="Avbryt lesing"
            secondary
            onPress={() => controller.current?.abort()}
          />
        )}
        {importInfo && (
          <>
            <Row label="Lagret kilde" value={importInfo.source} />
            <Copy small>
              {fullDate(importInfo.from)}–{fullDate(importInfo.to)} ·{" "}
              {importInfo.days} registrerte dager. Importert{" "}
              {dateLabel(importInfo.importedAt, true)}.
            </Copy>
            <Button
              label="Vis lagret import"
              secondary
              disabled={
                busy || (!preferences.demo && preferences.source === "import")
              }
              onPress={() => void activateImport()}
            />
            <Button
              label="Slett lagret import"
              secondary
              disabled={busy}
              onPress={deleteSaved}
            />
          </>
        )}
        {error && (
          <Text
            accessibilityRole="alert"
            style={{ color: theme.secondary, lineHeight: 21 }}
          >
            {error}
          </Text>
        )}
      </Card>
      <Modal
        visible={!!pending}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!busy) setPending(undefined);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          <Page>
            <Heading>Velg skrittkilde</Heading>
            <Copy>
              Velg kilden du vil beholde. Summer fra flere telefoner og klokker
              legges aldri sammen.
            </Copy>
            {pending?.preview.sources.map((candidate, index) => (
              <Pressable
                key={candidate.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: source === candidate.id }}
                disabled={busy}
                onPress={() => setSource(candidate.id)}
                style={{
                  backgroundColor: theme.card,
                  padding: 18,
                  borderRadius: 18,
                  borderWidth: 2,
                  borderColor:
                    source === candidate.id ? theme.mint : "transparent",
                  gap: 5,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>
                  {candidate.name}
                </Text>
                <Copy small>
                  Kilde {index + 1} · {number(candidate.records.length)}{" "}
                  målinger
                </Copy>
                {candidate.device && (
                  <Copy small>
                    {candidate.device.replace(/[<>]/g, "").slice(0, 220)}
                  </Copy>
                )}
              </Pressable>
            ))}
            {value && (
              <Card>
                <Title
                  text="Forhåndsvisning"
                  icon="checkmark-circle-outline"
                  color={theme.mint}
                />
                <Row
                  label="Registrerte dager"
                  value={number(value.info.days)}
                />
                <Row
                  label="Skrittmålinger"
                  value={number(value.info.records)}
                />
                <Copy>
                  {fullDate(value.info.from)}–{fullDate(value.info.to)}
                </Copy>
                <Copy small>
                  {value.info.duplicates} duplikater og {value.info.overlaps}{" "}
                  overlappende målinger utelatt fra valgt kilde.{" "}
                  {value.info.invalid} ugyldige skrittmålinger utelatt fra
                  filen.
                </Copy>
                <Copy small>
                  Skritt plasseres på målingens startdato og starttime, i
                  telefonens tidssone. Døgn- og timesummer kan avvike fra Helse,
                  som prioriterer og kombinerer kilder på sin egen måte.
                </Copy>
                <Copy small>
                  Den valgte skritthistorikken lagres lokalt i appen.
                  Originalfilen beholdes i Filer. En ny import erstatter hele
                  den tidligere importen.
                </Copy>
              </Card>
            )}
            {error && (
              <Text
                accessibilityRole="alert"
                style={{ color: theme.secondary }}
              >
                {error}
              </Text>
            )}
            <Button
              label={
                busy
                  ? "Lagrer …"
                  : importInfo
                    ? "Importer og erstatt tidligere import"
                    : "Importer skritthistorikk"
              }
              disabled={busy || !value}
              onPress={() => void apply()}
            />
            <Button
              label="Avbryt"
              secondary
              disabled={busy}
              onPress={() => setPending(undefined)}
            />
          </Page>
        </SafeAreaView>
      </Modal>
    </>
  );
}
