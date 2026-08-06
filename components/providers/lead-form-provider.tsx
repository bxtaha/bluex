"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LeadForm } from "@/components/ui/lead-form";

const LeadFormContext = createContext<{ open: () => void } | null>(null);

/**
 * Holds the single dialog instance. Several CTAs across the page open the same
 * form, and mounting one dialog per button would duplicate DOM ids and let two
 * modals open at once.
 */
export function LeadFormProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <LeadFormContext.Provider value={value}>
      {children}
      <LeadForm open={isOpen} onClose={close} />
    </LeadFormContext.Provider>
  );
}

export function useLeadForm() {
  const context = useContext(LeadFormContext);
  if (!context) {
    throw new Error("useLeadForm must be used inside <LeadFormProvider>");
  }
  return context;
}
