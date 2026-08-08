"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import type { Faq } from "@/lib/faq";

const FIELD =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const LABEL =
  "block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

/**
 * FAQ editor.
 *
 * Edits are held locally and saved per row: a request per keystroke would
 * hammer the database, and every save invalidates the public page's cache.
 *
 * Reordering is drag-and-drop *and* a pair of arrow buttons. The arrows are not
 * a fallback for old browsers — dragging is unusable with a keyboard and
 * awkward with a screen reader, so the buttons are the accessible path to the
 * same operation and both write the whole sequence.
 */
export function AdminFaqManager({ initial }: { initial: Faq[] }) {
  const [faqs, setFaqs] = useState<Faq[]>(initial);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function patchLocal(id: string, patch: Partial<Faq>) {
    setFaqs((current) =>
      current.map((faq) => (faq.id === id ? { ...faq, ...patch } : faq)),
    );
    setDirty((current) => ({ ...current, [id]: true }));
  }

  async function send(url: string, init: RequestInit) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setError(
        typeof data.message === "string" ? data.message : "Something went wrong.",
      );
      return { ok: false, data };
    }
    setError(null);
    return { ok: true, data };
  }

  async function save(faq: Faq) {
    setBusy(faq.id);
    const { ok } = await send(`/api/admin/faq/${faq.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        visible: faq.visible,
      }),
    });
    if (ok) setDirty((current) => ({ ...current, [faq.id]: false }));
    setBusy(null);
  }

  async function addFaq() {
    setBusy("new");
    const { ok, data } = await send("/api/admin/faq", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (ok) setFaqs((current) => [...current, data.faq as Faq]);
    setBusy(null);
  }

  async function remove(faq: Faq) {
    if (!window.confirm(`Delete "${faq.question}"? This cannot be undone.`)) return;
    setBusy(faq.id);
    const { ok } = await send(`/api/admin/faq/${faq.id}`, { method: "DELETE" });
    if (ok) setFaqs((current) => current.filter((f) => f.id !== faq.id));
    setBusy(null);
  }

  async function persistOrder(next: Faq[]) {
    setFaqs(next);
    setBusy("order");
    await send("/api/admin/faq/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: next.map((faq) => faq.id) }),
    });
    setBusy(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= faqs.length) return;
    const next = [...faqs];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;

    const from = faqs.findIndex((faq) => faq.id === dragId);
    const to = faqs.findIndex((faq) => faq.id === targetId);
    if (from === -1 || to === -1) return;

    const next = [...faqs];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    void persistOrder(next);
  }

  return (
    <div className="max-w-4xl">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={faq.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(faq.id)}
            className={`rounded-xl border bg-white p-5 shadow-sm transition-colors dark:bg-gray-900 ${
              dragId === faq.id
                ? "border-blue-400 opacity-60"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {/* Only the handle is draggable, so selecting text in the fields
                  does not start a drag. */}
              <span
                draggable
                onDragStart={() => setDragId(faq.id)}
                onDragEnd={() => setDragId(null)}
                aria-hidden
                title="Drag to reorder"
                className="cursor-grab rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-800"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="mr-auto font-mono text-xs text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>

              <button
                type="button"
                onClick={() => patchLocal(faq.id, { visible: !faq.visible })}
                aria-pressed={faq.visible}
                aria-label={faq.visible ? "Visible on the site" : "Hidden from the site"}
                title={faq.visible ? "Visible on the site" : "Hidden from the site"}
                className={`rounded-lg border p-2 transition-colors ${
                  faq.visible
                    ? "border-green-300 bg-green-50 text-green-600 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-400"
                    : "border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                {faq.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0 || busy !== null}
                aria-label="Move up"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === faqs.length - 1 || busy !== null}
                aria-label="Move down"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(faq)}
                disabled={busy !== null}
                aria-label={`Delete question ${index + 1}`}
                className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <label className={LABEL} htmlFor={`q-${faq.id}`}>
              Question
            </label>
            <input
              id={`q-${faq.id}`}
              className={`mt-1.5 ${FIELD}`}
              value={faq.question}
              onChange={(e) => patchLocal(faq.id, { question: e.target.value })}
            />

            <label className={`mt-4 ${LABEL}`} htmlFor={`a-${faq.id}`}>
              Answer
            </label>
            <textarea
              id={`a-${faq.id}`}
              rows={4}
              className={`mt-1.5 ${FIELD} resize-y`}
              value={faq.answer}
              onChange={(e) => patchLocal(faq.id, { answer: e.target.value })}
            />

            <label className={`mt-4 ${LABEL}`} htmlFor={`c-${faq.id}`}>
              Category
            </label>
            <input
              id={`c-${faq.id}`}
              className={`mt-1.5 ${FIELD}`}
              placeholder="AI Voice Agent"
              list="faq-categories"
              value={faq.category}
              onChange={(e) => patchLocal(faq.id, { category: e.target.value })}
            />

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => save(faq)}
                disabled={!dirty[faq.id] || busy !== null}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === faq.id && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                Save
              </button>
              {dirty[faq.id] && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Existing categories offered as suggestions, so they stay consistent
          without being a fixed list. */}
      <datalist id="faq-categories">
        {[...new Set(faqs.map((faq) => faq.category).filter(Boolean))].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={addFaq}
        disabled={busy !== null}
        className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-dashed border-gray-300 px-5 text-sm font-medium text-gray-600 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
      >
        <Plus className="h-4 w-4" /> Add question
      </button>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        New questions start hidden. Drag the handle or use the arrows to
        reorder — both save immediately. The fields save when you press Save.
        Category is stored for future filtering; the site renders one flat list.
      </p>
    </div>
  );
}
