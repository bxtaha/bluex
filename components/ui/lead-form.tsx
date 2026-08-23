"use client";

import { useEffect, useRef, useState } from "react";
import { EMPTY_LEAD, validateLead, type LeadErrors, type LeadInput } from "@/lib/lead";

type Status = "idle" | "sending" | "done" | "error";

const FIELDS = [
  { key: "name", label: "Your name", type: "text", autoComplete: "name", required: true },
  { key: "business", label: "Business name", type: "text", autoComplete: "organization", required: true },
  { key: "phone", label: "Phone (with country code)", type: "tel", autoComplete: "tel", required: true },
  { key: "email", label: "Email (optional)", type: "email", autoComplete: "email", required: false },
] as const;

/**
 * Lead capture dialog. Built on the native <dialog> element, which gives focus
 * trapping, Esc-to-close, inert background and the top layer for free — all
 * things a hand-rolled modal gets subtly wrong.
 */
export function LeadForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<LeadInput>(EMPTY_LEAD);
  const [errors, setErrors] = useState<LeadErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  // Whether the lead actually reached Hermes. Without the webhook configured
  // the request succeeds but no call is placed, and promising one would be a
  // straight lie to the visitor.
  const [dispatched, setDispatched] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Esc and backdrop dismissal both fire `close` natively; mirror that back
  // into React state so the parent's `open` cannot desync from the DOM.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const update = (key: keyof LeadInput, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear a field's error as soon as it is edited, rather than making people
    // resubmit to discover whether they fixed it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = validateLead(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.errors) setErrors(data.errors);
        setStatus("error");
        setMessage(data.message ?? "Please check the form and try again.");
        return;
      }

      setDispatched(data.dispatched === true);
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Network problem — please try again.");
    }
  };

  const reset = () => {
    setValues(EMPTY_LEAD);
    setErrors({});
    setStatus("idle");
    setMessage("");
    setDispatched(false);
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="lead-form-title"
      className="bx-card bx-hairline m-auto w-[min(92vw,30rem)] bg-[#101219] p-0 text-ink backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {status === "done" ? (
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-electric/15 text-electric">
            <svg viewBox="0 0 24 24" fill="none" className="size-7" aria-hidden>
              <path
                d="m5 13 4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {/* `p`, not `h2`. The accessible name comes from `aria-labelledby`
              above, which does not care what element it points at, and the
              form sits in the page's markup whether or not it is open — as an
              `h2` it was a permanent entry in the document outline for a panel
              nobody had asked to see. */}
          <p id="lead-form-title" className="bx-display text-2xl">
            {dispatched ? "You’re in the queue" : "Got your details"}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {dispatched ? (
              <>
                Keep your phone nearby — our agent will call{" "}
                <span className="text-ink">{values.phone}</span> within five
                minutes.
              </>
            ) : (
              <>
                We have your number as{" "}
                <span className="text-ink">{values.phone}</span> and will be in
                touch shortly.
              </>
            )}
          </p>
          <button type="button" onClick={reset} className="bx-btn bx-btn--ghost bx-btn--sm mt-6">
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="p-7 sm:p-8">
          <p className="bx-eyebrow">Five minute callback</p>
          <p id="lead-form-title" className="bx-display mt-2 text-2xl sm:text-3xl">
            Tell us where to call.
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
            Our AI agent rings you back in under five minutes, qualifies what you
            need and books the meeting.
          </p>

          <div className="mt-6 space-y-4">
            {FIELDS.map((field) => {
              const error = errors[field.key];
              return (
                <div key={field.key}>
                  <label
                    htmlFor={`lead-${field.key}`}
                    className="mb-1.5 block text-xs font-medium text-ink-muted"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`lead-${field.key}`}
                    name={field.key}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    value={values[field.key]}
                    onChange={(e) => update(field.key, e.target.value)}
                    aria-invalid={!!error}
                    aria-describedby={error ? `lead-${field.key}-error` : undefined}
                    /* A real focus ring. `outline-none` with only a border
                       colour change left keyboard users with no reliable
                       indication of where they were — a 1px hairline shifting
                       hue is not one, and it was being outranked by the error
                       border besides. */
                    className={`w-full rounded-lg border bg-white/[0.03] px-3.5 py-2.5 text-sm text-ink transition placeholder:text-ink-muted/60 focus:border-electric focus:bg-white/[0.06] focus:outline-2 focus:outline-offset-2 focus:outline-electric-glow ${
                      error ? "border-red-500/70" : "border-white/12"
                    }`}
                  />
                  {error && (
                    <p id={`lead-${field.key}-error`} className="mt-1.5 text-xs text-red-400">
                      {error}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {status === "error" && message && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {message}
            </p>
          )}

          <div className="mt-7 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={reset}
              className="bx-btn bx-btn--ghost bx-btn--sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "sending"}
              className="bx-btn bx-btn--signal bx-btn--sm disabled:opacity-60"
            >
              {status === "sending" ? "Starting the call…" : "Call me now"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
