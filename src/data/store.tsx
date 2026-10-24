import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { Appearance } from "../theme";
import { emptySnapshot } from "./models";
import { makeDemo } from "./demo";
import { authorizeHealth, loadHealth, observeHealth } from "./health";

type Preferences = {
  onboarded: boolean;
  demo: boolean;
  goal: number;
  miles: boolean;
  appearance: Appearance;
  average: boolean;
};
const defaults: Preferences = {
  onboarded: false,
  demo: false,
  goal: 10000,
  miles: false,
  appearance: "light",
  average: true,
};
function useModel() {
  const [preferences, setPreferences] = useState(defaults),
    [hydrated, setHydrated] = useState(false);
  const [data, setData] = useState(emptySnapshot),
    [loading, setLoading] = useState(false),
    [error, setError] = useState<string>();
  const [lastRefresh, setLastRefresh] = useState<Date>();
  const generation = useRef(0),
    current = useRef(preferences),
    busy = useRef(false);
  current.current = preferences;
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem("vital.preferences.v1")
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          const p = JSON.parse(raw) as Partial<Preferences>;
          setPreferences({
            ...defaults,
            ...p,
            goal:
              typeof p.goal === "number" && p.goal >= 1000 && p.goal <= 40000
                ? p.goal
                : 10000,
          });
        }
      })
      .catch(() => {
        if (mounted)
          setError("Innstillingene kunne ikke leses. Standardvalg brukes.");
      })
      .finally(() => {
        if (mounted) setHydrated(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const update = useCallback((changes: Partial<Preferences>) => {
    const next = { ...current.current, ...changes };
    current.current = next;
    setPreferences(next);
    void AsyncStorage.setItem(
      "vital.preferences.v1",
      JSON.stringify(next),
    ).catch(() => setError("Innstillingene kunne ikke lagres."));
  }, []);
  const refresh = useCallback(async (force = false) => {
    if (busy.current && !force) return;
    const ticket = ++generation.current;
    busy.current = true;
    setLoading(true);
    setError(undefined);
    const demo = current.current.demo;
    try {
      const next = demo ? makeDemo() : await loadHealth();
      if (ticket === generation.current) {
        setData(next);
        setLastRefresh(new Date());
      }
    } catch (e) {
      if (ticket === generation.current)
        setError(
          e instanceof Error
            ? e.message
            : "Kunne ikke hente målinger. Prøv igjen.",
        );
    } finally {
      if (ticket === generation.current) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, []);
  const setDemo = useCallback(
    async (demo: boolean) => {
      ++generation.current;
      update({ demo });
      setData(emptySnapshot());
      setLastRefresh(undefined);
      await refresh(true);
    },
    [refresh, update],
  );
  const connect = useCallback(async () => {
    setError(undefined);
    try {
      await authorizeHealth();
      update({ onboarded: true });
      await setDemo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke åpne Apple Helse.");
    }
  }, [setDemo, update]);
  useEffect(() => {
    if (hydrated && preferences.onboarded) void refresh();
  }, [hydrated, preferences.onboarded, refresh]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && current.current.onboarded) void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);
  useEffect(() => {
    if (!hydrated || !preferences.onboarded || preferences.demo) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = observeHealth(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 750);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [hydrated, preferences.onboarded, preferences.demo, refresh]);
  return {
    preferences,
    update,
    hydrated,
    data,
    loading,
    error,
    lastRefresh,
    refresh,
    setDemo,
    connect,
  };
}
type Model = ReturnType<typeof useModel>;
const Context = createContext<Model | null>(null);
export function HealthProvider({ children }: { children: React.ReactNode }) {
  const model = useModel();
  return <Context.Provider value={model}>{children}</Context.Provider>;
}
export function useHealth() {
  const model = useContext(Context);
  if (!model) throw new Error("HealthProvider mangler");
  return model;
}
