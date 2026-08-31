"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  ExternalLink,
  Globe,
  Loader2,
  MapPin,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  RefreshCw,
  RotateCw,
  Search,
  Settings,
} from "lucide-react";
import type { Call } from "@/lib/call-store";
import type { CallChannel, CallDirection } from "@/lib/call-payload";
import { formatLocation } from "@/lib/visitor-location";

/**
 * The call archive: every conversation the agent has had, read straight from
 * the store the webhook and the reconciliation cron both write to.
 *
 * One instance of this per direction — the sidebar has separate "Inbound" and
 * "Outbound" entries rather than a single "Calls" entry with a filter inside
 * it, so `direction` is a fixed prop, not user-editable state. Splitting at
 * the sidebar rather than in-panel is what makes the two counts visible
 * without opening anything.
 *
 * Split view on a wide screen, one pane at a time on a narrow one, matching
 * the Leads panel — the same reasoning applies, and two panels in one
 * dashboard behaving differently is worse than either behaviour.
 *
 * The "view this lead" link cannot switch the sidebar's own tab itself — that
 * state lives two components up, in `AdminDashboard` — so it is handed an
 * `onViewLeads` callback the same way `AdminInbox` and `AdminLeads` are
 * handed `onUnreadChange` and `onAttentionChange`.
 */

/** Written out in full — Tailwind never sees a class name built by template. */
const DIRECTION_STYLES = {
  inbound: {
    label: "Inbound",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  outbound: {
    label: "Outbound",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
} as const;

/** Same pattern as `DIRECTION_STYLES`: no templated Tailwind classes. */
const OUTCOME_STYLES: Record<Call["callSuccessful"], { label: string; className: string }> = {
  success: {
    label: "Successful",
    className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  },
  failure: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  unknown: {
    label: "Unclear",
    className: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

type SyncState = {
  lastRunAt: string | null;
  lastError: string | null;
  configured: boolean;
};

/**
 * Which slice of the archive a panel shows.
 *
 * A discriminated union rather than two optional props, so a caller states
 * exactly one thing and cannot ask for a direction *and* a channel and get
 * whichever the query string happened to win.
 *
 * Inbound and Outbound pass a direction; Supports passes `channel: "web"`.
 */
export type CallScope =
  | { kind: "direction"; direction: CallDirection }
  | { kind: "channel"; channel: CallChannel };

export function AdminCalls({
  scope,
  onViewLeads,
  onOpenSettings,
}: {
  scope: CallScope;
  onViewLeads?: () => void;
  /** Renders the gear only when given — not every panel has settings. */
  onOpenSettings?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [calls, setCalls] = useState<Call[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncState>({
    lastRunAt: null,
    lastError: null,
    // Optimistic, same as the Leads panel's `configured` default: a warning
    // banner flashing on for the first frame of every load is worse noise
    // than a one-request delay before it appears when it's actually true.
    configured: true,
  });

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Bumped to ask for a refetch. The fetch lives inside the effect and the
   * effect owns every `setState` after it — this repo's react-hooks lint
   * rejects a `setState` reached synchronously from an effect body. Turning
   * the spinner on is the caller's job; turning it off is the effect's.
   */
  const [reloadKey, setReloadKey] = useState(0);

  /*
   * The scope, flattened to a query string before the effect ever sees it.
   *
   * `scope` is an object literal at every call site, so it is a new reference
   * on every render of the dashboard: listing it in the dependencies would
   * refetch the archive continuously, and listing nothing would leave the panel
   * showing the previous slice after a switch. Reducing it to a string here
   * means the effect depends on the *value* and refetches exactly when the
   * slice actually changes — and it keeps `scope` out of the effect entirely,
   * so the dependency list is honest rather than suppressed.
   */
  const scopeQuery =
    scope.kind === "direction" ? `direction=${scope.direction}` : `channel=${scope.channel}`;
  const scopeValue = scope.kind === "direction" ? scope.direction : scope.channel;

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }, []);

  // Debounce the query text only — not Refresh, not a reload. A Refresh click
  // is deliberate and must feel instant; only typing needs 300ms to keep from
  // firing a request per keystroke. Comparing against the *previous* query
  // (not reloadKey) is what makes that distinction, so don't reach for
  // reloadKey here again: that was tried before and it debounced the first
  // mount right along with typing.
  const previousQuery = useRef(query);

  useEffect(() => {
    let cancelled = false;
    const isTyping = previousQuery.current !== query;
    previousQuery.current = query;

    const timer = setTimeout(
      () => {
        if (cancelled) return;
        setLoading(true);

        void (async () => {
          try {
            const params = new URLSearchParams(scopeQuery);
            const trimmed = query.trim();
            if (trimmed) params.set("q", trimmed);

            const response = await fetch(`/api/admin/calls?${params.toString()}`);
            const data = await response.json();
            // The query or filter changed while this was in flight: writing
            // the answer now would replace a newer list with an older one.
            if (cancelled) return;

            if (!response.ok || !data.ok) {
              setError(data.message ?? "Could not load the calls.");
              return;
            }
            setCalls(data.calls);
            setSync(data.sync);
            setError(null);
          } catch {
            // A dead network must not take the rest of the dashboard with it.
            if (!cancelled) setError("Could not reach the server.");
          } finally {
            if (!cancelled) setLoading(false);
          }
        })();
      },
      isTyping ? 300 : 0,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, scopeQuery, reloadKey]);

  // Derived rather than stored. Holding the selected call in its own state
  // means the detail pane keeps showing stale data after a refetch.
  const selected = calls.find((call) => call.id === selectedId) ?? null;

  async function callBack(call: Call) {
    if (!call.leadId) return;
    setCalling(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/leads/${call.leadId}/call`, {
        method: "POST",
      });
      const data = await response.json();
      setNotice(
        data.ok
          ? `Calling ${call.name || call.counterpartyNumber} back.`
          : (data.message ?? "Could not place the call."),
      );
    } catch {
      setNotice("Could not reach the server.");
    } finally {
      setCalling(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/calls/sync", { method: "POST" });
      const data = await response.json();
      setNotice(
        data.ok
          ? `Synced ${data.imported} new call${data.imported === 1 ? "" : "s"}.`
          : (data.message ?? "Could not sync the calls."),
      );
      reload();
    } catch {
      setNotice("Could not reach the server.");
    } finally {
      setSyncing(false);
    }
  }

  const isFiltered = query.trim().length > 0;

  return (
    <div className="max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            reload();
          }}
          className="relative min-w-[12rem] flex-1 sm:max-w-xs"
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <label htmlFor="call-search" className="sr-only">
            Search calls
          </label>
          <input
            id="call-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedId(null);
            }}
            placeholder="Search name, number or transcript"
            className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </form>

        <button
          type="button"
          onClick={syncNow}
          disabled={syncing || !sync.configured}
          className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <RotateCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden />
          Sync now
        </button>
        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>

        {/* Only when the panel has settings to open. Rendering a disabled gear
            on the panels that do not would be a control that teaches people it
            does nothing. */}
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            title="Settings for this channel"
            aria-label="Settings for this channel"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Settings className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Said plainly, for the same reason the Leads panel reports it: an
          empty archive looks like a broken agent when it is really an unset
          key, and only one of those is fixed by waiting. */}
      {!sync.configured && (
        <Banner tone="warn">
          The voice agent is not configured, so calls are not being synced
          automatically. Anything the webhook already delivered is still
          shown here. Set the API key and the outbound agent and phone
          number ID under Settings to connect it.
        </Banner>
      )}
      {sync.lastError && (
        <Banner tone="error">
          The last reconciliation run failed: {sync.lastError}
        </Banner>
      )}
      {notice && <Banner tone="info">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        {sync.lastRunAt
          ? `Reconciliation last ran ${formatFull(sync.lastRunAt)}.`
          : "Reconciliation has never run."}
      </p>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* On a phone the list steps aside once a call is open. */}
        <div className={selected ? "hidden lg:block" : ""}>
          <CallList
            calls={calls}
            loading={loading}
            selectedId={selectedId}
            isFiltered={isFiltered}
            scopeLabel={scopeValue}
            onOpen={(call) => setSelectedId(call.id)}
          />
        </div>

        <div className={selected ? "" : "hidden lg:block"}>
          {selected ? (
            <CallDetail
              call={selected}
              calling={calling}
              onBack={() => setSelectedId(null)}
              onCallBack={() => callBack(selected)}
              onViewLead={() => onViewLeads?.()}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Pick a call to see the transcript.
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

/**
 * Shown only on browser conversations.
 *
 * A badge reading "phone" on every other row would be noise — the archive is
 * overwhelmingly telephone, and the useful signal is the exception. Web
 * conversations arrive under Inbound (the visitor came to us, so that is
 * genuinely their direction), and without this they would be indistinguishable
 * from a call that actually rang.
 */
function ChannelBadge({ channel }: { channel: Call["channel"] }) {
  if (channel !== "web") return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-electric/30 bg-electric/10 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-electric dark:text-electric-glow"
      title="Held through the website, not over the phone"
    >
      <Globe className="h-3 w-3" aria-hidden />
      Web
    </span>
  );
}

/**
 * Roughly where a web visitor was.
 *
 * Only rendered for the web channel, and only when a location was actually
 * recorded. A phone call has a number rather than an address, and a web
 * conversation from before this existed has nothing to show — printing
 * "Unknown" against either would be inventing a fact about them rather than
 * reporting one. `formatLocation` is what guarantees a country with no city
 * renders as "BD" and not ", BD".
 */
function LocationTag({ call }: { call: Call }) {
  if (call.channel !== "web" || !call.location) return null;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300"
      title="Approximate, from the visitor's connection. No address is stored."
    >
      <MapPin className="h-3 w-3" aria-hidden />
      {formatLocation(call.location)}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: Call["callSuccessful"] }) {
  const style = OUTCOME_STYLES[outcome];
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function CallList({
  calls,
  loading,
  selectedId,
  isFiltered,
  scopeLabel,
  onOpen,
}: {
  calls: Call[];
  loading: boolean;
  selectedId: string | null;
  /** Distinguishes "no calls yet" from "nothing matched that search." */
  isFiltered: boolean;
  /** "inbound", "outbound" or "web" — only ever used in the empty-state line. */
  scopeLabel: string;
  onOpen: (call: Call) => void;
}) {
  if (loading && calls.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden />
        <span className="sr-only">Loading calls</span>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {isFiltered
          ? "Nothing matched that search."
          : `No ${scopeLabel} conversations yet.`}
      </div>
    );
  }

  return (
    <ul className="max-h-[70vh] divide-y divide-gray-200 overflow-hidden overflow-y-auto rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {calls.map((call) => (
        <li key={call.id}>
          <button
            type="button"
            onClick={() => onOpen(call)}
            aria-current={selectedId === call.id ? "true" : undefined}
            className={`w-full px-4 py-3 text-left transition-colors ${
              selectedId === call.id
                ? "bg-blue-50 dark:bg-blue-900/30"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {call.name || call.counterpartyNumber || "Unknown caller"}
              </span>
              <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatWhen(call.startedAt)}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {call.counterpartyNumber || "Number withheld"}
            </p>
            {call.summary && (
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {call.summary}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <DirectionBadge direction={call.direction} />
              <ChannelBadge channel={call.channel} />
              <LocationTag call={call} />
              <OutcomeBadge outcome={call.callSuccessful} />
              <span className="text-[0.65rem] text-gray-400 dark:text-gray-500">
                {formatDuration(call.durationSeconds)}
              </span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CallDetail({
  call,
  calling,
  onBack,
  onCallBack,
  onViewLead,
}: {
  call: Call;
  calling: boolean;
  onBack: () => void;
  onCallBack: () => void;
  onViewLead: () => void;
}) {
  const hasLead = call.leadId !== "";

  return (
    <div className="flex max-h-[70vh] flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to calls"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {call.name || call.counterpartyNumber || "Unknown caller"}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {formatFull(call.startedAt)} · {formatDuration(call.durationSeconds)}
          </p>
        </div>

        <DirectionBadge direction={call.direction} />
              <ChannelBadge channel={call.channel} />
        <OutcomeBadge outcome={call.callSuccessful} />
      </div>

      <div className="flex-1 overflow-hidden overflow-y-auto p-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field
            Icon={PhoneCall}
            label="Number"
            value={call.counterpartyNumber || "Withheld"}
          />
          <Field
            Icon={call.direction === "inbound" ? PhoneIncoming : PhoneOutgoing}
            label="Direction"
            value={DIRECTION_STYLES[call.direction].label}
          />
        </dl>

        {call.summary && (
          <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {call.summary}
          </p>
        )}

        <div className="mt-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Transcript
          </h3>
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
                  {/* A gutter, not content — quiet enough to ignore, there
                      when someone wants to know when in the call this was
                      said. `tabular-nums` keeps the colon from drifting as
                      the digits change width down a whole transcript. */}
                  <span className="mr-2 tabular-nums text-[0.65rem] text-gray-400 dark:text-gray-500">
                    {formatDuration(turn.at)}
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
      </div>

      <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
        {hasLead ? (
          <>
            <button
              type="button"
              onClick={onCallBack}
              disabled={calling}
              className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calling ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <PhoneCall className="h-4 w-4" aria-hidden />
              )}
              {calling ? "Placing the call…" : "Call back"}
            </button>
            <button
              type="button"
              onClick={onViewLead}
              className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              View lead
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            No number was recorded for this conversation, so there is no lead
            to call back.
          </span>
        )}
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

/* ── Dates & duration ───────────────────────────────────────────────────────
   Formatted from the value each time rather than cached: these render in the
   browser's locale, and a value computed on the server would be the server's.
   Both date helpers take the JSON string a fetch returns as readily as a
   Date. */

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
