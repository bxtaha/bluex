"use client";

import * as React from "react";
import { createContext, useContext, useState, type ReactNode } from "react";

// Matches the Home tab's color in components/navbar.tsx, which is the
// default-selected tab.
export const DEFAULT_ACCENT_COLOR = "#4343f5";

const AccentColorContext = createContext<{
  color: string;
  setColor: (color: string) => void;
} | null>(null);

export function AccentColorProvider({ children }: { children: ReactNode }) {
  const [color, setColor] = useState(DEFAULT_ACCENT_COLOR);
  return (
    <AccentColorContext.Provider value={{ color, setColor }}>
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  const ctx = useContext(AccentColorContext);
  if (!ctx) {
    throw new Error("useAccentColor must be used within AccentColorProvider");
  }
  return ctx;
}
