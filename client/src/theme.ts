export type ThemePref = "light" | "dark" | "system";

const KEY = "snowflakeshelf-theme";
const mq = window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePref(): ThemePref {
  const v = localStorage.getItem(KEY);
  return v === "light" || v === "dark" ? v : "system";
}

function effective(pref: ThemePref): "light" | "dark" {
  return pref === "system" ? (mq.matches ? "dark" : "light") : pref;
}

export function applyTheme(pref: ThemePref) {
  localStorage.setItem(KEY, pref);
  document.documentElement.setAttribute("data-theme", effective(pref));
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", effective(pref) === "dark" ? "#0b0f1a" : "#f4f6fb");
}

export function initTheme() {
  applyTheme(getThemePref());
  mq.addEventListener("change", () => {
    if (getThemePref() === "system") applyTheme("system");
  });
}
