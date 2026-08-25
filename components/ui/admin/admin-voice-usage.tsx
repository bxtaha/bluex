"use client";

import { useCallback, useEffect, useState } from "react";
import { Gauge, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import {
  AdminBadge,
  AdminCard,
  AdminSectionHeader,
  AdminLoading,
} from "./primitives";

type Stats = {
  conversations: number;
  inbound: number;
  outbound: number;
  talkSeconds: number;
  inboundSeconds: number;
  outboundSeconds: number;
};

type Usage = {
  configured: boolean;
  windowDays: number;
  minutes: { ok: boolean; value?: number; reason?: string };
  archive: { window: Stats; total: Stats };
  plan:
    | { ok: true; tier: string; used: number; limit: number; resetsAt: string | null }
    | { ok: false; reason: string; needsPermission: boolean };
};

/** Minutes at one decimal below ten, whole above — 7.3 min reads; 143.2 min does not. */
function minutes(seconds: number): string {
  const m = seconds / 60;
  if (m < 10) return `${m.toFixed(1)}`;
  return `${Math.round(m)}`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

/**
 * What the voice agents have used, and what is left of the plan.
 *
 * Fetched by the client rather than passed down from the server page, and that
 * is the point: this needs two round trips to ElevenLabs, and the dashboard
 * must not wait on a third-party API to render the queue — the part someone
 * actually opened it for. The card fills in a beat later, or says why it
 * could not.
 *
 * Two different talk-time numbers are shown on purpose. "Billed" is the
 * provider's own figure, which is what the invoice will say. "In your archive"
 * is what this app holds in the `calls` collection. They should agree; when
 * they do not, the gap means conversations happened that the webhook never
 * delivered and the reconciliation cron has not recovered — which is exactly
 * the failure that is otherwise invisible. Collapsing them into one number
 * would hide the only signal that says so.
 */
export function AdminVoiceUsage() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/usage");
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data.ok) {
          setError(data.message ?? "Could not load usage.");
          return;
        }
        setUsage(data);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (loading) {
    return (
      <AdminCard>
        <AdminLoading label="Reading voice usage…" />
      </AdminCard>
    );
  }

  if (error || !usage) {
    return (
      <AdminCard>
        <AdminSectionHeader
          title="Voice usage"
          description={error ?? "Could not load usage."}
        />
        <button
          type="button"
          onClick={reload}
          className="mt-4 text-[0.8125rem] font-medium text-electric hover:text-electric-glow"
        >
          Try again
        </button>
      </AdminCard>
    );
  }

  const { archive, plan } = usage;
  const billed = usage.minutes.ok ? usage.minutes.value ?? 0 : null;
  const remaining = plan.ok ? Math.max(0, plan.limit - plan.used) : null;
  const pctUsed =
    plan.ok && plan.limit > 0
      ? Math.min(100, (plan.used / plan.limit) * 100)
      : null;

  return (
    <AdminCard>
      <AdminSectionHeader
        title="Voice usage"
        description={`Talk time over the last ${usage.windowDays} days, and what is left of the plan.`}
        action={
          <AdminBadge tone={usage.configured ? "positive" : "warning"}>
            <Gauge className="size-3 shrink-0" aria-hidden />
            {usage.configured ? "Connected" : "Not configured"}
          </AdminBadge>
        }
      />

      {/* Talk time. Two figures, deliberately — see the component note. */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-[0.6875rem] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Billed by ElevenLabs
          </p>
          {billed === null ? (
            <p className="mt-1.5 text-[0.8125rem] text-gray-500 dark:text-gray-400">
              {usage.minutes.reason ?? "Unavailable."}
            </p>
          ) : (
            <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {billed < 10 ? billed.toFixed(1) : Math.round(billed)}
              <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
                min
              </span>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-[0.6875rem] font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
            In your archive
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            {minutes(archive.window.talkSeconds)}
            <span className="ml-1 text-sm font-normal text-gray-500 dark:text-gray-400">
              min
            </span>
          </p>
          <p className="mt-1 text-xs text-gray-500 tabular-nums dark:text-gray-400">
            {archive.window.conversations} conversation
            {archive.window.conversations === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Direction split. Only from the archive — the provider's series does
          not distinguish inbound from outbound. */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-gray-600 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <PhoneIncoming className="size-3.5 text-emerald-500" aria-hidden />
          <span className="tabular-nums">{archive.window.inbound}</span> inbound
          <span className="text-gray-400 tabular-nums dark:text-gray-500">
            ({minutes(archive.window.inboundSeconds)} min)
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <PhoneOutgoing className="size-3.5 text-electric" aria-hidden />
          <span className="tabular-nums">{archive.window.outbound}</span> outbound
          <span className="text-gray-400 tabular-nums dark:text-gray-500">
            ({minutes(archive.window.outboundSeconds)} min)
          </span>
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          {archive.total.conversations} all time
        </span>
      </div>

      {/* The plan. */}
      <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
        {plan.ok ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
                Plan
                <span className="ml-2 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-normal text-gray-600 capitalize dark:bg-gray-800 dark:text-gray-300">
                  {plan.tier}
                </span>
              </p>
              <p className="text-[0.8125rem] tabular-nums text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {compact(remaining ?? 0)}
                </span>{" "}
                of {compact(plan.limit)} credits left
              </p>
            </div>

            {/* `role="img"` with a label, not a bare div: the bar is the only
                place the ratio is stated visually. */}
            <div
              role="img"
              aria-label={`${Math.round(pctUsed ?? 0)}% of the plan used`}
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                  (pctUsed ?? 0) >= 90
                    ? "bg-red-500"
                    : (pctUsed ?? 0) >= 75
                      ? "bg-amber-500"
                      : "bg-electric"
                }`}
                style={{ width: `${pctUsed ?? 0}%` }}
              />
            </div>

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {compact(plan.used)} used
              {plan.resetsAt
                ? ` · resets ${new Date(plan.resetsAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}`
                : ""}
            </p>
          </>
        ) : (
          /* Says which permission is missing rather than showing an empty bar.
             The key is valid — dispatch and the usage figure above both work
             with it — it is simply scoped without `user_read`, which is a
             reasonable way to hold an API key and not a fault to hide. */
          <div>
            <p className="text-[0.8125rem] font-medium text-gray-700 dark:text-gray-300">
              Plan usage unavailable
            </p>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-gray-500 dark:text-gray-400">
              {plan.needsPermission ? (
                <>
                  The API key works for calls and for the talk time above, but
                  reading the plan quota needs the{" "}
                  <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-800">
                    user_read
                  </code>{" "}
                  permission. Add it to the key in the ElevenLabs dashboard
                  under Developers → API Keys, or leave it off — nothing else
                  here depends on it.
                </>
              ) : (
                plan.reason
              )}
            </p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
