"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { telHref, whatsappHref } from "@/lib/contact-fields";
import type { ContactSettings } from "@/lib/contact-store";

const FIELD =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const LABEL =
  "block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

/**
 * The three editable pieces of the contact section.
 *
 * The WhatsApp preview under the field is not decoration. The number is typed
 * for people to read — spaces, a leading `+` — and the link strips all of that;
 * showing the resulting `wa.me` URL is the only way to see, before saving, that
 * a number is missing its country code. A silently wrong link here costs
 * enquiries and nothing reports it.
 */
export function AdminContactManager({ initial }: { initial: ContactSettings }) {
  const [values, setValues] = useState<ContactSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update(key: keyof ContactSettings, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not save.");
        return;
      }
      setValues(data.settings);
      setDirty(false);
      setSaved(true);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const preview = whatsappHref(values.whatsapp);

  return (
    <div className="max-w-2xl">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <label className={LABEL} htmlFor="contact-intro">
          Intro paragraph
        </label>
        <textarea
          id="contact-intro"
          rows={3}
          className={`mt-1.5 ${FIELD} resize-y`}
          value={values.intro}
          onChange={(event) => update("intro", event.target.value)}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Shown above the contact methods, on the left of the section.
        </p>

        <label className={`mt-6 ${LABEL}`} htmlFor="contact-email">
          Email address
        </label>
        <input
          id="contact-email"
          type="email"
          className={`mt-1.5 ${FIELD}`}
          value={values.email}
          onChange={(event) => update("email", event.target.value)}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Used for the <code>mailto:</code> link on the site, and as the address
          new contact-form submissions are announced to.
        </p>

        <label className={`mt-6 ${LABEL}`} htmlFor="contact-phone">
          Phone number
        </label>
        <input
          id="contact-phone"
          type="tel"
          placeholder="+1 240 820 3149"
          className={`mt-1.5 ${FIELD}`}
          value={values.phone}
          onChange={(event) => update("phone", event.target.value)}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {values.phone.trim() === "" ? (
            "Leave blank to hide the phone row entirely."
          ) : telHref(values.phone) ? (
            <>
              Shown as typed, and dialled as{" "}
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {telHref(values.phone)}
              </span>
              . The flag beside the label is a fixed US one — changing to a
              number in another country needs a code change.
            </>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              Too short to dial — include the country code, or the row stays
              hidden.
            </span>
          )}
        </p>

        <label className={`mt-6 ${LABEL}`} htmlFor="contact-whatsapp">
          WhatsApp number
        </label>
        <input
          id="contact-whatsapp"
          type="tel"
          placeholder="+880 1712 345678"
          className={`mt-1.5 ${FIELD}`}
          value={values.whatsapp}
          onChange={(event) => update("whatsapp", event.target.value)}
        />
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {values.whatsapp.trim() === "" ? (
            "Leave blank to hide the WhatsApp row entirely."
          ) : preview ? (
            <>
              Links to
              <a
                href={preview}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-blue-600 hover:underline dark:text-blue-400"
              >
                {preview}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              Too short for an international number — include the country code,
              or the row stays hidden.
            </span>
          )}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save
          </button>
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
          {saved && !dirty && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Saved and published.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
