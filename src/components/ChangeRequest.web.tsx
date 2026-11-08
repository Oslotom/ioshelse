import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useVitalTheme } from "./UI";

export function ChangeRequest() {
  const theme = useVitalTheme();
  const [marking, setMarking] = useState(false),
    [open, setOpen] = useState(false);
  const [selection, setSelection] = useState(""),
    [request, setRequest] = useState("");
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  const previous = useRef<
    { element: HTMLElement; outline: string } | undefined
  >(undefined);
  const message = `Endringsønske i VITAL\nSide: ${window.location.pathname}\nMarkert felt/tekst: ${selection}\nØnsket endring: ${request.trim()}\nGjør endringen og push til Git.`;
  function clearHighlight() {
    if (previous.current)
      previous.current.element.style.outline = previous.current.outline;
    previous.current = undefined;
  }
  useEffect(() => () => clearHighlight(), []);
  useEffect(() => {
    if (!marking) return;
    const before = document.body.style.cursor;
    document.body.style.cursor = "crosshair";
    const select = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("#vital-change-tool, #vital-change-dialog"))
        return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const element =
        target.closest("[aria-label], button, input, p, span, svg") ?? target;
      const text =
        window.getSelection()?.toString().trim() ||
        element.getAttribute("aria-label") ||
        (element as HTMLElement).innerText ||
        element.textContent ||
        element.tagName;
      clearHighlight();
      const html =
        element instanceof HTMLElement ? element : element.parentElement;
      if (html) {
        previous.current = { element: html, outline: html.style.outline };
        html.style.outline = "3px solid #F47D35";
      }
      setSelection(text.slice(0, 600));
      setRequest("");
      setCopied(false);
      setError("");
      setMarking(false);
      setOpen(true);
    };
    document.addEventListener("click", select, true);
    return () => {
      document.body.style.cursor = before;
      document.removeEventListener("click", select, true);
    };
  }, [marking]);
  const close = () => {
    setOpen(false);
    clearHighlight();
  };
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setError("");
    } catch {
      setError(
        "Kunne ikke kopiere automatisk. Marker meldingen nedenfor og kopier den manuelt.",
      );
    }
  }
  return (
    <>
      <View
        nativeID="vital-change-tool"
        style={{
          position: "absolute",
          bottom: 90,
          right: 16,
          zIndex: 1000,
          gap: 7,
          alignItems: "flex-end",
          maxWidth: 280,
        }}
      >
        {marking && (
          <Text
            style={{
              backgroundColor: theme.card,
              color: theme.text,
              padding: 12,
              borderRadius: 14,
            }}
          >
            Klikk på et felt eller en tekst. Trykk Avbryt for å avslutte.
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            marking ? "Avbryt markering" : "Marker noe du vil endre"
          }
          onPress={() => setMarking((value) => !value)}
          style={{
            minHeight: 46,
            borderRadius: 23,
            paddingHorizontal: 16,
            backgroundColor: marking ? theme.orange : theme.card,
            borderWidth: 1,
            borderColor: theme.track,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Ionicons
            name={marking ? "close" : "create-outline"}
            size={20}
            color={theme.text}
          />
          <Text style={{ color: theme.text, fontWeight: "600" }}>
            {marking ? "Avbryt" : "Foreslå endring"}
          </Text>
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View
          nativeID="vital-change-dialog"
          style={{
            flex: 1,
            backgroundColor: "#17232D66",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 560,
              alignSelf: "center",
              maxHeight: "90%",
              padding: 22,
              gap: 14,
              borderRadius: 24,
              backgroundColor: theme.card,
              overflow: "scroll",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 21, fontWeight: "700", color: theme.text }}
              >
                Hva vil du endre?
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Lukk"
                onPress={close}
                style={{ padding: 10 }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>
            <Text selectable style={{ color: theme.secondary }}>
              Markert: {selection}
            </Text>
            <TextInput
              accessibilityLabel="Beskriv ønsket endring"
              autoFocus
              multiline
              maxLength={2000}
              placeholder="Beskriv hvordan du vil ha det …"
              placeholderTextColor={theme.secondary}
              value={request}
              onChangeText={(text) => {
                setRequest(text);
                setCopied(false);
              }}
              style={{
                minHeight: 100,
                padding: 14,
                borderRadius: 14,
                backgroundColor: theme.track,
                color: theme.text,
                fontSize: 15,
                textAlignVertical: "top",
              }}
            />
            <Text
              style={{ color: theme.secondary, fontSize: 13, lineHeight: 19 }}
            >
              Kopier forespørselen og lim den inn i Codex-chatten. Ingenting
              sendes automatisk, og appen kan ikke pushe endringer selv.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={!request.trim()}
              onPress={() => void copy()}
              style={{
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                backgroundColor: theme.mint,
                opacity: request.trim() ? 1 : 0.5,
              }}
            >
              <Text style={{ color: "#062C26", fontWeight: "700" }}>
                {copied ? "Kopiert · lim inn i chatten" : "Kopier til chat"}
              </Text>
            </Pressable>
            {!!error && (
              <Text accessibilityRole="alert" style={{ color: theme.coral }}>
                {error}
              </Text>
            )}
            {(copied || !!error) && (
              <TextInput
                accessibilityLabel="Ferdig endringsforespørsel"
                multiline
                editable={false}
                value={message}
                style={{
                  color: theme.text,
                  backgroundColor: theme.track,
                  padding: 12,
                  borderRadius: 12,
                  minHeight: 120,
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
