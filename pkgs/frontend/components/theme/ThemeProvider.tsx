"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "amm-dex-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (window.localStorage.getItem(STORAGE_KEY) as Theme) || "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const applyThemeClass = useCallback((next: Theme) => {
    const root = document.documentElement;
    const systemDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const effective = next === "system" ? (systemDark ? "dark" : "light") : next;
    root.classList.toggle("dark", effective === "dark");
    setResolved(effective);
  }, []);

  useEffect(() => {
    applyThemeClass(theme);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, applyThemeClass]);

  // react to system changes when using system theme
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyThemeClass("system");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [theme, applyThemeClass]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme: resolved, setTheme, toggleTheme }),
    [theme, resolved, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
