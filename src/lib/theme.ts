export const THEME_KEY = "walinox.theme";
export const THEME_DARK_COLOR = "#0a1014";
export const THEME_LIGHT_COLOR = "#e7f3f5";

export type Theme = "light" | "dark";

export function isTheme(value: string | null | undefined): value is Theme {
  return value === "light" || value === "dark";
}

export function loadTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  const raw = localStorage.getItem(THEME_KEY);
  return isTheme(raw) ? raw : "dark";
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? THEME_LIGHT_COLOR : THEME_DARK_COLOR);
}

export function saveTheme(theme: Theme): void {
  if (typeof localStorage !== "undefined") localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
