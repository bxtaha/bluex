"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

/** The admin area opens dark. */
export const ADMIN_DEFAULT_DARK = true;

/**
 * Applies the theme class before the first paint.
 *
 * Rendered as a plain script tag so it executes while the document is still
 * parsing, ahead of anything being painted. Without it the markup arrives in
 * its light form, React hydrates, an effect adds `dark`, and the whole
 * dashboard visibly flips — on every single load.
 *
 * It is a literal defined here, not anything a request can influence.
 */
export const ADMIN_THEME_SCRIPT = `document.documentElement.classList.${
  ADMIN_DEFAULT_DARK ? "add" : "remove"
}("dark")`;

type AdminThemeValue = {
  isDark: boolean;
  setIsDark: (next: boolean) => void;
};

const AdminThemeContext = createContext<AdminThemeValue | null>(null);

/**
 * One owner for the admin area's theme.
 *
 * The class lives on `<html>`, which outlives every page under it, so exactly
 * one component may add and remove it. When the dashboard owned it directly,
 * signing out unmounted the dashboard, its cleanup stripped `dark`, and the
 * login page it redirected to rendered light — two pages in the same area
 * disagreeing about the theme. Holding it at the layout means the class
 * survives navigation *within* the admin area and is dropped only on the way
 * out, so the marketing site never inherits it.
 */
export function AdminThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(ADMIN_DEFAULT_DARK);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
  }, [isDark]);

  // Separate from the effect above, and with no dependencies, so it runs only
  // when the admin area itself is left — not on every toggle.
  useEffect(() => {
    const root = document.documentElement;
    return () => root.classList.remove("dark");
  }, []);

  return (
    <AdminThemeContext.Provider value={{ isDark, setIsDark }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme(): AdminThemeValue {
  const value = useContext(AdminThemeContext);
  if (!value) {
    throw new Error("useAdminTheme must be used inside AdminThemeProvider");
  }
  return value;
}
