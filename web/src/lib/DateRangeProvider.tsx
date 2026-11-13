"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Preset = "7d" | "30d" | "90d" | "180d" | "ytd" | "all";

interface DateRangeContextType {
  preset: Preset;
  setPreset: (p: Preset) => void;
  customStart?: string;
  customEnd?: string;
  setCustomRange: (start: string, end: string) => void;
}

const DateRangeContext = createContext<DateRangeContextType | null>(null);

const PRESET_DAYS: Record<Preset, number> = {
  "7d": 7, "30d": 30, "90d": 90, "180d": 180, "ytd": 365, "all": 3650,
};

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState<string>();
  const [customEnd, setCustomEnd] = useState<string>();

  // Sync with URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("range") as Preset | null;
    if (p && p in PRESET_DAYS) setPreset(p);
    const cs = params.get("start");
    const ce = params.get("end");
    if (cs) setCustomStart(cs);
    if (ce) setCustomEnd(ce);
  }, []);

  const updateUrl = (newPreset: Preset, start?: string, end?: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("range", newPreset);
    if (start) params.set("start", start); else params.delete("start");
    if (end) params.set("end", end); else params.delete("end");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  };

  const handleSetPreset = (p: Preset) => {
    setPreset(p);
    setCustomStart(undefined);
    setCustomEnd(undefined);
    updateUrl(p);
  };

  const handleSetCustomRange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPreset("all"); // custom uses "all" as base
    updateUrl("all", start, end);
  };

  return (
    <DateRangeContext.Provider value={{ preset, setPreset: handleSetPreset, customStart, customEnd, setCustomRange: handleSetCustomRange }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRange must be used within DateRangeProvider");
  return ctx;
}

export function getDateRange(preset: Preset, customStart?: string, customEnd?: string) {
  const end = customEnd ? new Date(customEnd) : new Date();
  const start = customStart ? new Date(customStart) : new Date(end.getTime() - PRESET_DAYS[preset] * 86400000);
  return { start, end };
}
