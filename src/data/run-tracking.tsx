import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { useJournal } from "./journal-store";
const Context = createContext("GPS er ikke startet");
export function RunTrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const journal = useJournal(),
    current = useRef(journal);
  current.current = journal;
  const active = journal.data.active;
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  const [message, setMessage] = useState("Venter på GPS …");
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => listener.remove();
  }, []);
  useEffect(() => {
    let cancelled = false,
      subscription: Location.LocationSubscription | undefined,
      first = true;
    if (!active?.run?.gpsEnabled || active.run.pausedAt || !foreground) return;
    const id = active.id;
    setMessage("Søker etter GPS …");
    void (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          setMessage("Ingen posisjonstilgang · tidtaking fortsetter");
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (location) => {
            if (
              cancelled ||
              !foreground ||
              location.timestamp < Date.now() - 15000 ||
              location.timestamp < +new Date(active.startedAt)
            )
              return;
            const accuracy = location.coords.accuracy;
            if (accuracy === null || accuracy > 35 || accuracy < 0) {
              setMessage("Svakt GPS-signal · venter på bedre presisjon");
              return;
            }
            if (
              (current.current.data.active?.run?.points.length ?? 0) >= 10000
            ) {
              setMessage("Rutelagringen er full · tidtaking fortsetter");
              return;
            }
            const latest = current.current.data.active?.run?.points.at(-1);
            if (latest && location.timestamp <= latest.timestamp) return;
            const newSegment = first;
            first = false;
            setMessage(`GPS aktiv · presisjon ±${Math.round(accuracy)} m`);
            void current.current
              .recordRunPoint(
                id,
                {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  timestamp: location.timestamp,
                  accuracy,
                },
                newSegment,
              )
              .catch(() => {
                first = true;
                setMessage(
                  "Kunne ikke lagre GPS-punkt. Se lagringsfeilen nedenfor.",
                );
              });
          },
        );
        if (cancelled) subscription.remove();
      } catch {
        if (!cancelled)
          setMessage("GPS er utilgjengelig · tidtaking fortsetter");
      }
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [
    active?.id,
    active?.run?.gpsEnabled,
    !!active?.run?.pausedAt,
    foreground,
  ]);
  const status = !active?.run?.gpsEnabled
    ? "Tidtaking uten GPS"
    : active.run.pausedAt
      ? "Løpeturen er satt på pause"
      : !foreground
        ? "GPS stoppes mens appen er i bakgrunnen"
        : message;
  return <Context.Provider value={status}>{children}</Context.Provider>;
}
export const useRunTracking = () => useContext(Context);
