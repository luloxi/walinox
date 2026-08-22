"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_DISPLAY, loadDisplay, saveDisplay, type DisplayPrefs } from "@/lib/display";

type DisplayState = {
  prefs: DisplayPrefs;
  setPrefs: (prefs: DisplayPrefs) => void;
};

const DisplayContext = createContext<DisplayState>({
  prefs: DEFAULT_DISPLAY,
  setPrefs: () => {},
});

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<DisplayPrefs>(DEFAULT_DISPLAY);

  useEffect(() => {
    setPrefsState(loadDisplay());
  }, []);

  const setPrefs = useCallback((next: DisplayPrefs) => {
    const fiat = next.fiat;
    const primary = next.primary === "usdt" ? "usdt" : "fiat";
    const prefs: DisplayPrefs = { fiat, primary };
    setPrefsState(prefs);
    saveDisplay(prefs);
  }, []);

  const value = useMemo(() => ({ prefs, setPrefs }), [prefs, setPrefs]);
  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useDisplay(): DisplayState {
  return useContext(DisplayContext);
}
