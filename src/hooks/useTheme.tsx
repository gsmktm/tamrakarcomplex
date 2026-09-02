import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { readThemeSettings } from "@/lib/siteSettings";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const isTheme = (value: unknown): value is Theme => value === "light" || value === "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem("theme");
  if (isTheme(stored)) return stored;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    root.style.colorScheme = theme;
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyThemeSettings = (syncMode = false) => {
      try {
        const parsed = readThemeSettings();

        // Tailwind colors in this project consume complete CSS color values.
        // HSL channel fragments (e.g. "240 100% 50%") are invalid here.
        if (parsed.primaryColor) root.style.setProperty("--primary", parsed.primaryColor);
        else root.style.removeProperty("--primary");
        if (parsed.secondaryColor) root.style.setProperty("--secondary", parsed.secondaryColor);
        else root.style.removeProperty("--secondary");
        if (parsed.radius) root.style.setProperty("--radius", `${parsed.radius}px`);
        if (parsed.containerMaxWidth) root.style.setProperty("--container-max-width", `${parsed.containerMaxWidth}px`);
        if (parsed.fontFamily) document.body.style.fontFamily = parsed.fontFamily;
        else document.body.style.removeProperty("font-family");

        if (syncMode && isTheme(parsed.theme)) setThemeState(parsed.theme);
      } catch (e) {
        console.error("Failed to apply custom theme settings", e);
      }
    };

    applyThemeSettings();

    const handleThemeUpdate = () => applyThemeSettings(true);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "theme" && isTheme(event.newValue)) {
        setThemeState(event.newValue);
      } else if (event.key === "theme-settings") {
        applyThemeSettings(true);
      }
    };

    window.addEventListener("theme-update", handleThemeUpdate);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("theme-update", handleThemeUpdate);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
