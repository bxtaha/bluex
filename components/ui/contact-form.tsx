"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { submitContactMessage } from "@/app/actions/contact";
import {
  EMPTY_CONTACT,
  MESSAGE_MIN_LENGTH,
  NEED_OPTIONS,
  type ContactErrors,
  type ContactValues,
} from "@/lib/contact-fields";

/**
 * The contact form.
 *
 * Two things here are the brief rather than the default:
 *
 * **Success replaces the form.** Not a toast. A toast is a notification that
 * something happened somewhere else, which is wrong when the thing that
 * happened is the only thing on screen — and it disappears, leaving a filled-in
 * form that looks unsent and invites a second submission.
 *
 * **Failure keeps every character.** The values live in React state and the
 * action only ever returns errors, so a rejected submission never costs anyone
 * their message. Losing a paragraph someone just wrote is the fastest way to
 * lose the enquiry entirely.
 *
 * Client-side checks are `required` and `type="email"` — a courtesy for typos,
 * not a gate. `contactSchema` on the server is the gate.
 */
export function ContactForm() {
  const [values, setValues] = useState<ContactValues>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [failure, setFailure] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(key: keyof ContactValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear the field's error the moment it is edited, rather than making
    // someone resubmit to find out whether they fixed it.
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure("");

    startTransition(async () => {
      const result = await submitContactMessage(values);
      if (result.ok) {
        setDone(true);
        return;
      }
      setErrors(result.errors ?? {});
      setFailure(
        result.message ??
          (result.errors ? "" : "Something went wrong. Please try again."),
      );
    });
  }

  if (done) {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-electric/15 text-electric">
          <Check className="size-7" strokeWidth={2} aria-hidden />
        </div>
        {/* `role="status"` so a screen reader is told the form was replaced —
            visually it is obvious, and to a screen reader it is silent. */}
        <p role="status" className="bx-display text-2xl text-ink">
          Got it.
        </p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
          You&apos;ll hear back within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <p className="bx-eyebrow">Send a note</p>
      <p className="bx-display mt-2 text-2xl text-ink">
        Tell us what you need.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field
          name="name"
          label="Name"
          autoComplete="name"
          required
          values={values}
          errors={errors}
          onChange={update}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          values={values}
          errors={errors}
          onChange={update}
        />
        <Field
          name="phone"
          label="Phone (with country code)"
          type="tel"
          autoComplete="tel"
          values={values}
          errors={errors}
          onChange={update}
        />
        <Field
          name="company"
          label="Company"
          autoComplete="organization"
          values={values}
          errors={errors}
          onChange={update}
        />

        <div className="sm:col-span-2">
          <label htmlFor="contact-need" className="bx-field__label">
            What do you need?
          </label>
          <select
            id="contact-need"
            name="need"
            className="bx-field bx-field--select"
            value={values.need}
            onChange={(event) => update("need", event.target.value)}
          >
            {NEED_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="bx-field__label">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={5}
            required
            minLength={MESSAGE_MIN_LENGTH}
            className="bx-field bx-field--area"
            value={values.message}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "contact-message-error" : undefined}
            onChange={(event) => update("message", event.target.value)}
          />
          {errors.message && (
            <p id="contact-message-error" className="bx-field__error">
              {errors.message}
            </p>
          )}
        </div>
      </div>

      {/* The bot trap. Off-screen rather than `display: none`, which the
          cheaper scrapers do check for, and taken out of the tab order and the
          accessibility tree so nobody using a keyboard or a screen reader can
          land in it by accident and fail the check. */}
      <div className="bx-honeypot" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(event) => update("website", event.target.value)}
        />
      </div>

      {failure && (
        <p role="alert" className="mt-5 text-sm text-red-400">
          {failure}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bx-btn bx-btn--signal bx-btn--sm mt-6 w-full disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required,
  values,
  errors,
  onChange,
}: {
  name: keyof ContactValues;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  values: ContactValues;
  errors: ContactErrors;
  onChange: (key: keyof ContactValues, value: string) => void;
}) {
  const error = errors[name];
  const id = `contact-${name}`;

  return (
    <div>
      <label htmlFor={id} className="bx-field__label">
        {label}
        {!required && <span className="bx-field__optional"> (optional)</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="bx-field"
        value={values[name]}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(name, event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="bx-field__error">
          {error}
        </p>
      )}
    </div>
  );
}
