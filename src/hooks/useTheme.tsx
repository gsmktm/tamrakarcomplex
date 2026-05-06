import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { hexToHSL } from "@/lib/utils";
import { readThemeSettings } from "@/lib/siteSettings";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);

    const applyThemeSettings = () => {
      try {
        const parsed = readThemeSettings();
        if (parsed.primaryColor) {
          const color = parsed.primaryColor.startsWith("#") ? hexToHSL(parsed.primaryColor) : parsed.primaryColor;
          root.style.setProperty("--primary", color);
        }
        if (parsed.secondaryColor) {
          const color = parsed.secondaryColor.startsWith("#") ? hexToHSL(parsed.secondaryColor) : parsed.secondaryColor;
          root.style.setProperty("--secondary", color);
        }
        if (parsed.radius) root.style.setProperty("--radius", `${parsed.radius}px`);
        if (parsed.containerMaxWidth) root.style.setProperty("--container-max-width", `${parsed.containerMaxWidth}px`);
        if (parsed.fontFamily) document.body.style.fontFamily = parsed.fontFamily;
      } catch (e) {
        console.error("Failed to apply custom theme settings", e);
      }
    };

    applyThemeSettings();

    window.addEventListener("theme-update", applyThemeSettings);
    return () => window.removeEventListener("theme-update", applyThemeSettings);
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

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
