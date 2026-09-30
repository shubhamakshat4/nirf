"use client";

const KEY = "nirf-portal:theme";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = cur === "dark" ? "light" : cur === "light" ? "dark" : prefersDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode — theme just won't persist */
    }
  }
  return (
    <button type="button" className="tinybtn" onClick={toggle}>
      Switch theme
    </button>
  );
}
