import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>{theme}</button>;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("ThemeProvider storage resilience", () => {
  it("mounts and toggles when browser storage throws SecurityError", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    const button = screen.getByRole("button", { name: "light" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "dark" })).toBeTruthy();
  });

  it("preserves saved theme and persists toggles when storage works", () => {
    window.localStorage.setItem("theme", "dark");
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    const button = screen.getByRole("button", { name: "dark" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "light" })).toBeTruthy();
    expect(window.localStorage.getItem("theme")).toBe("light");
  });
});
