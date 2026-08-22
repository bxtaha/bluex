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
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
} from "lucide-react";
import type { CallStatus, Lead, LeadFilter, LeadStage } from "@/lib/lead-store";
import type { LeadSource } from "@/lib/lead";
import type { Call } from "@/lib/call-store";
import type { CallDirection } from "@/lib/call-payload";

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
 *
 * Beyond the read-only list, this is where the pipeline actually lives: a
 * stage, a follow-up date and notes on the lead, plus every call the calls
 * collection has recorded for them — a person with three conversations shows
 * three, with transcripts, rather than the single set of fields a lead used
 * to carry.
 */

const FILTERS: { value: LeadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs you" },
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

/** Written out in full — Tailwind never sees a class name built by template. */
const STAGE_STYLES = {
  new: { label: "New", className: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  contacted: { label: "Contacted", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  qualified: { label: "Qualified", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  won: { label: "Won", className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  lost: { label: "Lost", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
} as const;

const STAGES: LeadStage[] = ["new", "contacted", "qualified", "won", "lost"];

/** Same pattern as `STAGE_STYLES`: no templated Tailwind classes. */
const DIRECTION_STYLES: Record<CallDirection, { label: string; className: string }> = {
  inbound: {
    label: "Inbound",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  outbound: {
    label: "Outbound",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
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

  // The selected lead's conversations. Fetched separately from the lead list
  // itself — the list answers "who", this answers "what happened when we
  // talked to them" — and cleared the moment nothing is selected so a closed
  // detail pane cannot leave a stale transcript sitting in memory.
  const [calls, setCalls] = useState<Call[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);

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

  // Keyed on `selectedId` alone, not on `reloadKey` — a note or a stage change
  // reloads the lead list, but it does not change what was already said on a
  // call, so there is nothing there worth refetching.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (!selectedId) {
        if (!cancelled) {
          setCalls([]);
          setLoadingCalls(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/admin/calls?lead=${selectedId}`);
        const data = await response.json();
        // A lead switched while this was in flight must not paint the
        // previous lead's calls into the newly selected one.
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError(data.message ?? "Could not load this lead's calls.");
          setCalls([]);
          return;
        }
        setCalls(data.calls);
        setError(null);
      } catch {
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoadingCalls(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

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

  /**
   * Stage and follow-up date share one endpoint, so they share one function.
   * Both callers reload the list afterwards — a stage change can move a lead
   * out of the current filter, and the badge count can move with it.
   */
  async function patchLead(
    id: string,
    patch: { stage?: LeadStage; followUpAt?: string | null },
  ) {
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setNotice(data.message ?? "Could not save that.");
        return;
      }
      reload();
    } catch {
      setNotice("Could not reach the server.");
    }
  }

  /** Returns whether it worked, so the note form only clears on success. */
  async function addNote(id: string, body: string): Promise<boolean> {
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/leads/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setNotice(data.message ?? "Could not save that note.");
        return false;
      }
      reload();
      return true;
    } catch {
      setNotice("Could not reach the server.");
      return false;
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
            onOpen={(lead) => {
              setSelectedId(lead.id);
              setLoadingCalls(true);
            }}
          />
        </div>

        <div className={selected ? "" : "hidden lg:block"}>
          {selected ? (
            <LeadDetail
              key={selected.id}
              lead={selected}
              calls={calls}
              loadingCalls={loadingCalls}
              calling={calling}
              canCall={configured}
              onBack={() => setSelectedId(null)}
              onCall={() => callNow(selected)}
              onPatch={(patch) => patchLead(selected.id, patch)}
              onAddNote={(body) => addNote(selected.id, body)}
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

function StageBadge({ stage }: { stage: LeadStage }) {
  const style = STAGE_STYLES[stage];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: CallDirection }) {
  const style = DIRECTION_STYLES[direction];
  const Icon = direction === "inbound" ? PhoneIncoming : PhoneOutgoing;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${style.className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
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
    <ul className="max-h-[70vh] divide-y divide-gray-200 overflow-hidden overflow-y-auto rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
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
              <StageBadge stage={lead.stage} />
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
  calls,
  loadingCalls,
  calling,
  canCall,
  onBack,
  onCall,
  onPatch,
  onAddNote,
}: {
  lead: Lead;
  calls: Call[];
  loadingCalls: boolean;
  calling: boolean;
  canCall: boolean;
  onBack: () => void;
  onCall: () => void;
  onPatch: (patch: { stage?: LeadStage; followUpAt?: string | null }) => void;
  onAddNote: (body: string) => Promise<boolean>;
}) {
  // Local to this instance and reset by the parent's `key={lead.id}` when the
  // selection changes — a draft note typed for one lead must not leak onto
  // the next one opened.
  const [noteDraft, setNoteDraft] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const overdue = lead.followUpAt !== null && isOverdue(lead.followUpAt);

  async function submitNote() {
    const text = noteDraft.trim();
    if (!text) return;
    setSubmittingNote(true);
    try {
      const ok = await onAddNote(text);
      if (ok) setNoteDraft("");
    } finally {
      setSubmittingNote(false);
    }
  }

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
        <StageBadge stage={lead.stage} />
      </div>

      <div className="flex-1 overflow-hidden overflow-y-auto p-4">
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

        {/* Pipeline: where this person is commercially, distinct from
            whether we've dialled them. */}
        <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <label
            htmlFor="lead-stage"
            className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Stage
          </label>
          <select
            id="lead-stage"
            value={lead.stage}
            onChange={(event) =>
              onPatch({ stage: event.target.value as LeadStage })
            }
            className="mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_STYLES[stage].label}
              </option>
            ))}
          </select>

          <label
            htmlFor="lead-followup"
            className="mt-4 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Follow up
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              id="lead-followup"
              type="date"
              value={toDateInputValue(lead.followUpAt)}
              onChange={(event) => onPatch({ followUpAt: event.target.value })}
              className="h-10 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => onPatch({ followUpAt: "" })}
              disabled={!lead.followUpAt}
              className="h-10 shrink-0 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Clear
            </button>
          </div>
          {lead.followUpAt && overdue && (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
              Overdue — this follow-up was due {formatFull(lead.followUpAt)}.
            </p>
          )}
        </div>

        {/* Notes: append-only, so the box beneath it says so before anyone
            goes looking for an edit or delete control that isn't there. */}
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Notes
          </h3>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add a note about this lead…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={submitNote}
              disabled={submittingNote || !noteDraft.trim()}
              className="flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submittingNote && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Add note
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Notes cannot be edited or deleted once added.
            </span>
          </div>

          {lead.notes.length > 0 ? (
            // Stored oldest-first (`$push` appends); rendered newest first.
            // `.slice()` first — never `.reverse()` the prop array in place.
            <ul className="mt-3 space-y-2">
              {lead.notes
                .slice()
                .reverse()
                .map((note, index) => (
                  <li
                    key={index}
                    className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    <p className="whitespace-pre-wrap">{note.body}</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {note.author} · {formatFull(note.at)}
                    </p>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No notes yet.
            </p>
          )}
        </div>

        {/* Call history: every conversation the calls collection has for this
            lead, not the single set of fields a lead used to carry. */}
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Call history
          </h3>
          {loadingCalls ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden />
              <span className="sr-only">Loading calls</span>
            </div>
          ) : calls.length > 0 ? (
            <div className="space-y-2">
              {calls.map((call) => (
                <CallHistoryItem key={call.id} call={call} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No calls yet.
            </p>
          )}
        </div>
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

/**
 * One conversation, collapsed by default. `<details>` rather than component
 * state — a transcript that's open or closed is exactly what that element is
 * for, and it costs nothing to keep in step with strict effect lint.
 */
function CallHistoryItem({ call }: { call: Call }) {
  return (
    <details className="rounded-lg border border-gray-200 dark:border-gray-800">
      <summary className="cursor-pointer px-4 py-3">
        <div className="flex items-center gap-2">
          <DirectionBadge direction={call.direction} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatFull(call.startedAt)}
          </span>
          <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-gray-500">
            {formatDuration(call.durationSeconds)}
          </span>
        </div>
        {call.summary && (
          <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
            {call.summary}
          </p>
        )}
      </summary>

      <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Transcript
        </h4>
        {call.transcript.length > 0 ? (
          /* Turn index as the key — a transcript is an ordered log written
             once and never reordered, so there is no identity to preserve. */
          <ul className="space-y-2">
            {call.transcript.map((turn, index) => (
              <li
                key={index}
                className={`rounded-lg px-3 py-2 text-sm ${
                  turn.role === "agent"
                    ? "bg-blue-50 text-blue-950 dark:bg-blue-900/20 dark:text-blue-50"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}
              >
                <span
                  className={`mr-2 text-[0.65rem] font-medium uppercase tracking-wide ${
                    turn.role === "agent"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {turn.role === "agent" ? "Agent" : "Caller"}
                </span>
                {turn.message}
              </li>
            ))}
          </ul>
        ) : (
          // No transcript is a fact worth stating, not a section worth
          // hiding — otherwise it reads identically to "still loading" or
          // "this call predates transcripts," and only one of those is true.
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No transcript was recorded for this call.
          </p>
        )}
      </div>
    </details>
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

/* ── Dates & duration ───────────────────────────────────────────────────────
   Formatted from the value each time rather than cached: these render in the
   browser's locale, and a value computed on the server would be the server's.
   All helpers take the JSON string a fetch returns as readily as a Date. */

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

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

/**
 * A full ISO string, as `followUpAt` arrives over JSON, down to what a
 * `<input type="date">` accepts. Sliced from `toISOString()` rather than
 * built from local getters — the server parses a bare `YYYY-MM-DD` as UTC
 * midnight, and reading it back with local-timezone getters would show the
 * previous day west of Greenwich.
 */
function toDateInputValue(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isOverdue(value: Date | string): boolean {
  return new Date(value).getTime() < Date.now();
}
