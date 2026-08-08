"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { CtaAction, PricingTier } from "@/lib/pricing";

const FIELD =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const LABEL =
  "block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

/**
 * Pricing tier editor.
 *
 * Edits are held locally and saved per card rather than on every keystroke: a
 * request per character would hammer both the database and the cache
 * invalidation, and every one of those invalidations re-renders the public
 * page. `dirty` tracks which cards have unsaved edits so Save is only offered
 * where there is something to save.
 */
export function AdminPricingManager({ initial }: { initial: PricingTier[] }) {
  const [tiers, setTiers] = useState<PricingTier[]>(initial);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function patchLocal(id: string, patch: Partial<PricingTier>) {
    setTiers((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, ...patch } : tier)),
    );
    setDirty((current) => ({ ...current, [id]: true }));
  }

  async function send(
    url: string,
    init: RequestInit,
  ): Promise<{ ok: boolean; data: Record<string, unknown> }> {
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

  async function save(tier: PricingTier) {
    setBusy(tier.id);
    const { ok } = await send(`/api/admin/pricing/${tier.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: tier.name,
        tagline: tier.tagline,
        priceAnchor: tier.priceAnchor,
        features: tier.features,
        ctaLabel: tier.ctaLabel,
        ctaAction: tier.ctaAction,
        featured: tier.featured,
        visible: tier.visible,
      }),
    });

    if (ok) {
      setDirty((current) => ({ ...current, [tier.id]: false }));
      // Featuring one tier un-features the others server-side, so the list is
      // re-read rather than guessed at locally.
      if (tier.featured) {
        setTiers((current) =>
          current.map((t) => (t.id === tier.id ? t : { ...t, featured: false })),
        );
      }
    }
    setBusy(null);
  }

  async function addTier() {
    setBusy("new");
    const { ok, data } = await send("/api/admin/pricing", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (ok) setTiers((current) => [...current, data.tier as PricingTier]);
    setBusy(null);
  }

  async function remove(tier: PricingTier) {
    // A tier is content someone wrote; deleting it on a single click is how it
    // gets deleted by accident.
    if (!window.confirm(`Delete the "${tier.name}" tier? This cannot be undone.`)) {
      return;
    }
    setBusy(tier.id);
    const { ok } = await send(`/api/admin/pricing/${tier.id}`, { method: "DELETE" });
    if (ok) setTiers((current) => current.filter((t) => t.id !== tier.id));
    setBusy(null);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= tiers.length) return;

    const next = [...tiers];
    [next[index], next[target]] = [next[target], next[index]];
    setTiers(next);

    setBusy("order");
    await send("/api/admin/pricing/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: next.map((tier) => tier.id) }),
    });
    setBusy(null);
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
        {tiers.map((tier, index) => (
          <div
            key={tier.id}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="mr-auto font-mono text-xs text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>

              <IconToggle
                on={tier.featured}
                onClick={() => patchLocal(tier.id, { featured: !tier.featured })}
                label={tier.featured ? "Featured tier" : "Mark as featured"}
                Icon={Star}
                tone="amber"
              />
              <IconToggle
                on={tier.visible}
                onClick={() => patchLocal(tier.id, { visible: !tier.visible })}
                label={tier.visible ? "Visible on the site" : "Hidden from the site"}
                Icon={tier.visible ? Eye : EyeOff}
                tone="green"
              />

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
                disabled={index === tiers.length - 1 || busy !== null}
                aria-label="Move down"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(tier)}
                disabled={busy !== null}
                aria-label={`Delete ${tier.name}`}
                className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={`name-${tier.id}`}>
                  Name
                </label>
                <input
                  id={`name-${tier.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  value={tier.name}
                  onChange={(e) => patchLocal(tier.id, { name: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`anchor-${tier.id}`}>
                  Price anchor (may be blank)
                </label>
                <input
                  id={`anchor-${tier.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  placeholder="From $4,000"
                  value={tier.priceAnchor}
                  onChange={(e) => patchLocal(tier.id, { priceAnchor: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className={LABEL} htmlFor={`tagline-${tier.id}`}>
                Who it&apos;s for
              </label>
              <input
                id={`tagline-${tier.id}`}
                className={`mt-1.5 ${FIELD}`}
                value={tier.tagline}
                onChange={(e) => patchLocal(tier.id, { tagline: e.target.value })}
              />
            </div>

            <div className="mt-4">
              <span className={LABEL}>Features</span>
              <div className="mt-1.5 space-y-2">
                {tier.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                    <input
                      className={FIELD}
                      value={feature}
                      aria-label={`Feature ${i + 1}`}
                      onChange={(e) => {
                        const features = [...tier.features];
                        features[i] = e.target.value;
                        patchLocal(tier.id, { features });
                      }}
                    />
                    <button
                      type="button"
                      aria-label={`Remove feature ${i + 1}`}
                      onClick={() =>
                        patchLocal(tier.id, {
                          features: tier.features.filter((_, j) => j !== i),
                        })
                      }
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-red-600 dark:hover:bg-gray-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    patchLocal(tier.id, { features: [...tier.features, ""] })
                  }
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  <Plus className="h-4 w-4" /> Add feature
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={`cta-${tier.id}`}>
                  Button label
                </label>
                <input
                  id={`cta-${tier.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  value={tier.ctaLabel}
                  onChange={(e) => patchLocal(tier.id, { ctaLabel: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`action-${tier.id}`}>
                  Button action
                </label>
                <select
                  id={`action-${tier.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  value={tier.ctaAction}
                  onChange={(e) =>
                    patchLocal(tier.id, { ctaAction: e.target.value as CtaAction })
                  }
                >
                  <option value="contact">Scroll to contact</option>
                  <option value="lead-form">Open the call-me-now form</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => save(tier)}
                disabled={!dirty[tier.id] || busy !== null}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === tier.id && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                Save
              </button>
              {dirty[tier.id] && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addTier}
        disabled={busy !== null}
        className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-dashed border-gray-300 px-5 text-sm font-medium text-gray-600 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
      >
        <Plus className="h-4 w-4" /> Add tier
      </button>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        New tiers start hidden, so nothing half-written appears on the site.
        Reordering and deleting save immediately; the fields above save when you
        press Save.
      </p>
    </div>
  );
}

function IconToggle({
  on,
  onClick,
  label,
  Icon,
  tone,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: "amber" | "green";
}) {
  const active =
    tone === "amber"
      ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-400"
      : "border-green-300 bg-green-50 text-green-600 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-400";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={label}
      aria-label={label}
      className={`rounded-lg border p-2 transition-colors ${
        on
          ? active
          : "border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
