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
import { restoreStartupState } from "./startup";
import { ImportInfo, ImportedSteps } from "./apple-export";
import { readSavedImport, saveImport, eraseImport } from "./import-storage";
import { Appearance } from "../theme";
import { emptySnapshot } from "./models";
import { makeDemo } from "./demo";
import {
  authorizeHealth,
  getHealthKit,
  loadHealth,
  observeHealth,
} from "./health";
import {
  authorizePhoneSteps,
  loadPhoneSteps,
  observePhoneSteps,
} from "./pedometer";

type Preferences = {
  onboarded: boolean;
  demo: boolean;
  source: "pedometer" | "healthkit" | "import";
  goal: number;
  miles: boolean;
  appearance: Appearance;
  average: boolean;
};
const defaults: Preferences = {
  onboarded: false,
  demo: false,
  source: "pedometer",
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
  const [importInfo, setImportInfo] = useState<ImportInfo>();
  const generation = useRef(0),
    current = useRef(preferences),
    busy = useRef(false);
  current.current = preferences;
  useEffect(() => {
    let mounted = true;
    void restoreStartupState({
      readPreferences: () => AsyncStorage.getItem("vital.preferences.v1"),
      onPreferences: (raw) => {
        if (!mounted) return;
        if (raw) {
          const p = JSON.parse(raw) as Partial<Preferences>;
          setPreferences({
            ...defaults,
            ...p,
            source:
              p.source === "pedometer" ||
              p.source === "healthkit" ||
              p.source === "import"
                ? p.source
                : getHealthKit()
                  ? "healthkit"
                  : "pedometer",
            goal:
              typeof p.goal === "number" && p.goal >= 1000 && p.goal <= 40000
                ? p.goal
                : 10000,
          });
        }
      },
      onReady: () => {
        if (mounted) setHydrated(true);
      },
      readImport: () => readSavedImport(),
      onImport: (saved) => {
        if (mounted) setImportInfo(saved?.info);
      },
      onError: (error) => {
        if (mounted)
          setError(
            error instanceof Error
              ? error.message
              : "Lokal lagring kunne ikke åpnes. Lagrede data er beholdt.",
          );
      },
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
      const imported =
        !demo && current.current.source === "import"
          ? await readSavedImport()
          : undefined;
      if (!demo && current.current.source === "import" && !imported)
        throw new Error(
          "Ingen lagret import. Velg en eksportfil under Innstillinger.",
        );
      const next = demo
        ? makeDemo()
        : imported
          ? imported.snapshot
          : current.current.source === "pedometer"
            ? await loadPhoneSteps()
            : await loadHealth();
      if (ticket === generation.current) {
        setData(next);
        setLastRefresh(
          imported ? new Date(imported.info.importedAt) : new Date(),
        );
        if (imported) setImportInfo(imported.info);
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
      update({ onboarded: true, source: "healthkit" });
      await setDemo(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunne ikke åpne Apple Helse.");
    }
  }, [setDemo, update]);
  const connectPhone = useCallback(async () => {
    setError(undefined);
    try {
      await authorizePhoneSteps();
      update({ onboarded: true, source: "pedometer" });
      await setDemo(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Kunne ikke åpne skrittelleren.",
      );
    }
  }, [setDemo, update]);
  const activateImport = useCallback(async () => {
    update({ onboarded: true, source: "import" });
    await setDemo(false);
  }, [update, setDemo]);
  const commitImport = useCallback(
    async (value: ImportedSteps) => {
      await saveImport(value);
      setImportInfo(value.info);
      await activateImport();
    },
    [activateImport],
  );
  const removeImport = useCallback(async () => {
    await eraseImport();
    setImportInfo(undefined);
    if (current.current.source === "import") {
      update({ source: "pedometer" });
      if (!current.current.demo) await setDemo(false);
    }
  }, [update, setDemo]);
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
    if (
      !hydrated ||
      !preferences.onboarded ||
      preferences.demo ||
      preferences.source === "import"
    )
      return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observe =
      preferences.source === "pedometer" ? observePhoneSteps : observeHealth;
    const stop = observe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 750);
    });
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [
    hydrated,
    preferences.onboarded,
    preferences.demo,
    preferences.source,
    refresh,
  ]);
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
    connectPhone,
    importInfo,
    activateImport,
    commitImport,
    removeImport,
    importedOnly: !preferences.demo && preferences.source === "import",
    phoneOnly: !preferences.demo && preferences.source === "pedometer",
    healthKitAvailable: !!getHealthKit(),
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
