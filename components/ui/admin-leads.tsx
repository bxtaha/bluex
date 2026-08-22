"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CircleAlert,
  Loader2,
  Mail,
  Phone,
  PhoneCall,
  RefreshCw,
} from "lucide-react";
import type { CallStatus, Lead, LeadFilter } from "@/lib/lead-store";
import type { LeadSource } from "@/lib/lead";

/**
 * Callback leads and what the agent did with them.
 *
 * Split view on a wide screen, one pane at a time on a narrow one, matching the
 * inbox — the same reasoning applies, and two panels in one dashboard behaving
 * differently is worse than either behaviour.
 *
 * Everything is fetched rather than server-rendered into props. Leads arrive
 * and calls finish while the tab is open, so a snapshot taken when the page
 * loaded would be wrong by the time anyone read it.
 */

const FILTERS: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "completed", label: "Called" },
];

/** Written out in full — Tailwind never sees a class name built by template. */
const STATUS_STYLES: Record<CallStatus, { label: string; className: string }> = {
  pending: {
    label: "Not called",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  },
  dispatched: {
    label: "Calling",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  completed: {
    label: "Called",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  not_configured: {
    label: "No agent",
    className:
      "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

/**
 * Which form on the site this came from.
 *
 * Named rather than interpolated. `{lead.source} form` rendered "form form" for
 * the main path, and the fix is not to special-case the word — the two sources
 * differ in what they collect (the inline widget skips the business name), so
 * an admin reading a lead with no business wants to know whether that field was
 * skipped or left blank.
 *
 * "Callback", not "contact": this site has a separate contact form, and its
 * submissions live in the Inbox rather than here.
 */
function sourceLabel(source: LeadSource): string {
  return source === "inline" ? "inline widget" : "callback form";
}

export function AdminLeads({
  onAttentionChange,
}: {
  /** Lifted so the sidebar badge and this view cannot disagree about the count. */
  onAttentionChange?: (count: number) => void;
}) {
  const [filter, setFilter] = useState<LeadFilter>("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);

  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Bumped to ask for a refetch. The fetch lives inside the effect and the
   * effect owns every `setState` after it — this repo's react-hooks lint
   * rejects a `setState` reached synchronously from an effect body, which is
   * what calling a loader that flips a spinner before awaiting amounts to.
   * Turning the spinner on is the caller's job; turning it off is the effect's.
   */
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/admin/leads?filter=${filter}`);
        const data = await response.json();
        // The filter changed while this was in flight: writing the answer now
        // would replace a newer list with an older one.
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError(data.message ?? "Could not load the leads.");
          return;
        }
        setLeads(data.leads);
        setConfigured(data.configured);
        onAttentionChange?.(data.attention);
        setError(null);
      } catch {
        // A dead network must not take the rest of the dashboard with it.
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey, onAttentionChange]);

  // Derived rather than stored. Holding the selected lead in its own state
  // means the detail pane keeps showing pre-call data after a refetch brings
  // the outcome in — the id is the durable thing, the lead is a snapshot.
  const selected = leads.find((lead) => lead.id === selectedId) ?? null;

  async function callNow(lead: Lead) {
    setCalling(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/leads/${lead.id}/call`, {
        method: "POST",
      });
      const data = await response.json();
      setNotice(
        data.ok
          ? `Calling ${lead.name} on ${lead.phone}.`
          : (data.message ?? "Could not place the call."),
      );
      reload();
    } catch {
      setNotice("Could not reach the server.");
    } finally {
      setCalling(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                setSelectedId(null);
              }}
              aria-pressed={filter === option.value}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                filter === option.value
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </button>
      </div>

      {/* Said plainly, for the same reason the inbox reports IMAP: a list of
          uncalled leads looks like a broken agent when it is really an unset
          key, and only one of those is fixed by waiting. */}
      {!configured && (
        <Banner tone="warn">
          The voice agent is not configured, so nothing is being called
          automatically. Leads are still being recorded. Set{" "}
          <code>ELEVENLABS_API_KEY</code>, <code>ELEVENLABS_AGENT_ID</code> and{" "}
          <code>ELEVENLABS_AGENT_PHONE_NUMBER_ID</code> to connect it.
        </Banner>
      )}
      {notice && <Banner tone="info">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* On a phone the list steps aside once a lead is open. */}
        <div className={selected ? "hidden lg:block" : ""}>
          <LeadList
            leads={leads}
            loading={loading}
            selectedId={selectedId}
            onOpen={(lead) => setSelectedId(lead.id)}
          />
        </div>

        <div className={selected ? "" : "hidden lg:block"}>
          {selected ? (
            <LeadDetail
              lead={selected}
              calling={calling}
              canCall={configured}
              onBack={() => setSelectedId(null)}
              onCall={() => callNow(selected)}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Pick a lead to see the call.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "info" | "warn" | "error";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300",
    warn: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300",
    error:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300",
  } as const;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${tones[tone]}`}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function LeadList({
  leads,
  loading,
  selectedId,
  onOpen,
}: {
  leads: Lead[];
  loading: boolean;
  selectedId: string | null;
  onOpen: (lead: Lead) => void;
}) {
  if (loading && leads.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden />
        <span className="sr-only">Loading leads</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Nothing here yet.
      </div>
    );
  }

  return (
    <ul className="max-h-[70vh] divide-y divide-gray-200 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {leads.map((lead) => (
        <li key={lead.id}>
          <button
            type="button"
            onClick={() => onOpen(lead)}
            aria-current={selectedId === lead.id ? "true" : undefined}
            className={`w-full px-4 py-3 text-left transition-colors ${
              selectedId === lead.id
                ? "bg-blue-50 dark:bg-blue-900/30"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {lead.name}
              </span>
              <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatWhen(lead.createdAt)}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {lead.phone}
            </p>
            {lead.business && (
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {lead.business}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <StatusBadge status={lead.callStatus} />
              {lead.attempts > 1 && (
                <span className="text-[0.65rem] text-gray-400 dark:text-gray-500">
                  {lead.attempts} attempts
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function LeadDetail({
  lead,
  calling,
  canCall,
  onBack,
  onCall,
}: {
  lead: Lead;
  calling: boolean;
  canCall: boolean;
  onBack: () => void;
  onCall: () => void;
}) {
  return (
    <div className="flex max-h-[70vh] flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to leads"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {lead.name}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            Submitted {formatFull(lead.createdAt)} · {sourceLabel(lead.source)}
          </p>
        </div>

        <StatusBadge status={lead.callStatus} />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field Icon={Phone} label="Phone" value={lead.phone} />
          <Field Icon={Mail} label="Email" value={lead.email || "—"} />
          <Field
            Icon={Building2}
            label="Business"
            value={lead.business || "—"}
          />
          <Field
            Icon={PhoneCall}
            label="Call attempts"
            value={
              lead.attempts === 0
                ? "None yet"
                : `${lead.attempts} · last ${formatFull(lead.lastAttemptAt ?? lead.createdAt)}`
            }
          />
        </dl>

        {lead.failureReason && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
          >
            {lead.failureReason}
          </p>
        )}

        {lead.callStatus === "completed" && (
          <div className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Outcome
            </p>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {formatDuration(lead.durationSeconds)}
              {lead.callSuccessful !== "unknown" &&
                ` · agent reported ${lead.callSuccessful}`}
            </p>
            {lead.summary && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {lead.summary}
              </p>
            )}
          </div>
        )}

        {lead.transcript.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Transcript
            </p>
            <ol className="space-y-2">
              {lead.transcript.map((turn, index) => (
                <li
                  // The turn index is the key because a transcript is an ordered
                  // log that is written once and never reordered — there is no
                  // identity to preserve across renders.
                  key={index}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    turn.role === "agent"
                      ? "bg-blue-50 text-blue-950 dark:bg-blue-900/20 dark:text-blue-50"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                  }`}
                >
                  {/* The speaker label tints with its own bubble. Grey on the
                      blue one reads as washed-out rather than secondary — a
                      muted shade of the background colour keeps the hierarchy
                      without losing the contrast. */}
                  <span
                    className={`mr-2 text-[0.65rem] font-medium uppercase tracking-wide ${
                      turn.role === "agent"
                        ? "text-blue-700 dark:text-blue-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {turn.role === "agent" ? "Agent" : lead.name}
                  </span>
                  {turn.message}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onCall}
          disabled={calling || !canCall}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {calling ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <PhoneCall className="h-4 w-4" aria-hidden />
          )}
          {calling
            ? "Placing the call…"
            : lead.attempts > 0
              ? "Call again"
              : "Call now"}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Rings {lead.phone} straight away.
        </span>
      </div>
    </div>
  );
}

function Field({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="truncate text-sm text-gray-900 dark:text-gray-100">
          {value}
        </dd>
      </div>
    </div>
  );
}

/* ── Dates ───────────────────────────────────────────────────────────────────
   Formatted from the value each time rather than cached: these render in the
   browser's locale, and a value computed on the server would be the server's.
   Both helpers take the JSON string a fetch returns as readily as a Date. */

function formatWhen(value: Date | string): string {
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatFull(value: Date | string): string {
  return new Date(value).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "No duration recorded";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s on the call` : `${rest}s on the call`;
}
