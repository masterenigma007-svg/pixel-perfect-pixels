// Tiny theme manager: 'light' | 'dark' | 'system'. Persists to localStorage,
// reflects the choice by toggling the `dark` class on <html>, and reacts to
// system theme changes when 'system' is selected.
export type ThemePref = "light" | "dark" | "system";

const KEY = "app-theme";
const listeners = new Set<(t: ThemePref) => void>();

export function getTheme(): ThemePref {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(KEY) as ThemePref | null;
  return v ?? "dark";
}

function apply(theme: ThemePref) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
  // Update <meta name="theme-color"> too so the status bar matches
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isDark ? "#1a1330" : "#ffffff");
}

export function setTheme(theme: ThemePref) {
  localStorage.setItem(KEY, theme);
  apply(theme);
  listeners.forEach((cb) => cb(theme));
}

export function onThemeChange(cb: (t: ThemePref) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function initTheme() {
  apply(getTheme());
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", () => {
      if (getTheme() === "system") apply("system");
    });
  }
}
