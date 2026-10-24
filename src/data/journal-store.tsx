import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addEntry,
  ActiveWorkout,
  beginWorkout,
  createJournalRepository,
  emptyJournal,
  finishWorkout,
  Journal,
  JournalEntry,
} from "./journal";
import { DailyFormEntry } from "./daily-form";
import { mergeDailyBackup } from "./daily-backup";
import { useHealth } from "./store";
import { makeDemoJournal } from "./demo-journal";
import { withDeadline } from "./startup";

function useJournalModel(demo: boolean) {
  const repository = useRef(
    createJournalRepository({
      getItem: (key) =>
        withDeadline(
          demo
            ? AsyncStorage.getItem("vital.demo-journal.v1").then((raw) => raw ?? JSON.stringify(makeDemoJournal()))
            : AsyncStorage.getItem(key),
          5000,
          "Loggen bruker for lang tid på å åpne. Registreringene er beholdt.",
        ),
      setItem: (key, value) => AsyncStorage.setItem(demo ? "vital.demo-journal.v1" : key, value),
    }),
  ).current;
  const [data, setData] = useState<Journal>(emptyJournal),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const mounted = useRef(true),
    pending = useRef(0),
    generation = useRef(0),
    readable = useRef(false);
  const reload = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError(undefined);
    try {
      const next = await repository.load();
      if (mounted.current && ticket === generation.current) {
        setData(next);
        readable.current = true;
      }
    } catch (error) {
      if (mounted.current && ticket === generation.current) {
        readable.current = false;
        setError(
          error instanceof Error ? error.message : "Kunne ikke lese loggen.",
        );
      }
    } finally {
      if (mounted.current && ticket === generation.current) setLoading(false);
    }
  }, [repository]);
  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);
  const mutate = useCallback(
    async (change: (state: Journal) => Journal) => {
      if (!readable.current)
        throw new Error(
          "Vent til loggen er lastet. Ved feil: last loggen på nytt i Form.",
        );
      ++generation.current;
      pending.current++;
      setBusy(true);
      setError(undefined);
      try {
        const next = await repository.mutate(change);
        if (mounted.current) setData(next);
      } catch (error) {
        if (mounted.current)
          setError(
            error instanceof Error
              ? error.message
              : "Registreringen kunne ikke lagres.",
          );
        throw error;
      } finally {
        pending.current--;
        if (mounted.current) {
          setBusy(pending.current > 0);
          if (!pending.current) setLoading(false);
        }
      }
    },
    [repository],
  );
  return {
    data,
    available: readable.current,
    loading,
    busy,
    error,
    reload,
    importDaily: (entries: DailyFormEntry[]) =>
      mutate((state) => mergeDailyBackup(state, entries)),
    save: (entry: JournalEntry) => mutate((state) => addEntry(state, entry)),
    start: (active: ActiveWorkout) =>
      mutate((state) => beginWorkout(state, active)),
    finish: () => mutate((state) => finishWorkout(state)),
    discard: () =>
      mutate((state) => {
        const { active: _, ...next } = state;
        return next;
      }),
    remove: (id: string) =>
      mutate((state) => ({
        ...state,
        entries: state.entries.filter((entry) => entry.id !== id),
      })),
  };
}
const Context = createContext<ReturnType<typeof useJournalModel> | null>(null);
export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { preferences } = useHealth();
  return <JournalModeProvider key={preferences.demo ? "demo" : "personal"} demo={preferences.demo}>{children}</JournalModeProvider>;
}
function JournalModeProvider({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const model = useJournalModel(demo);
  return <Context.Provider value={model}>{children}</Context.Provider>;
}
export function useJournal() {
  const model = useContext(Context);
  if (!model) throw new Error("JournalProvider mangler");
  return model;
}
