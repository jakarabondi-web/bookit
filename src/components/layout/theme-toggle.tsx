"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

/** Fired after a toggle so every mounted ThemeToggle re-reads the theme. */
const THEME_EVENT = "bookit-theme-change";

/**
 * What the visitor is actually seeing right now: an explicit stamp from a
 * previous toggle wins, otherwise the OS preference.
 */
function readTheme(): Theme {
  const stamped = document.documentElement.dataset.theme;
  if (stamped === "light" || stamped === "dark") return stamped;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

/**
 * Light/dark switch in the site header.
 *
 * The theme itself is CSS-only (tokens in globals.css); this button stamps
 * `data-theme` on <html> and persists the choice, which the inline script in
 * the root layout restores before paint on the next visit. The theme is
 * external DOM state, so it's read through useSyncExternalStore — the server
 * snapshot claims "light", and React corrects the icon on the client if the
 * visitor is actually in the dark.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);

  function toggle() {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("bookit-theme", next);
    } catch {
      // Private browsing without storage: the flip still applies to this page.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="rounded-xl p-2.5 text-ink-secondary transition-colors hover:bg-surface-secondary hover:text-ink"
    >
      {theme === "dark" ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
