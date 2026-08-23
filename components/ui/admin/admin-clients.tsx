"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MailWarning,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import type { ClientRecord, ClientStatus } from "@/lib/client-auth";
import { AdminConfirmDialog } from "./confirm-dialog";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminField,
  AdminLoading,
  AdminSectionHeader,
  AdminToast,
  useToast,
} from "./primitives";

/**
 * Client management.
 *
 * The panel holds no authority of its own — every button is a request to a route
 * behind `requireAdmin`, and a client who somehow rendered this component would
 * get a 401 from all of them. That is the point of putting authorisation on the
 * server: the UI is a convenience over the API, never the thing protecting it.
 *
 * Nothing here can reveal a password, because none is ever generated. Creating a
 * client emails them a single-use setup link, and the only thing this panel is
 * ever told is *whether* one is outstanding.
 */

type Filter = ClientStatus | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "invited", label: "Invited" },
  { key: "suspended", label: "Suspended" },
];

type ListResponse = {
  ok?: boolean;
  message?: string;
  clients?: ClientRecord[];
  total?: number;
  page?: number;
  pageCount?: number;
  counts?: { total: number; active: number; invited: number; suspended: number };
  mailConfigured?: boolean;
};

export function AdminClients({
  onInvitedChange,
}: {
  /** Keeps the overview's count honest while this panel is open. */
  onInvitedChange?: (count: number) => void;
}) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    invited: 0,
    suspended: 0,
  });
  const [mailConfigured, setMailConfigured] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ClientRecord | null>(null);
  const toast = useToast();

  // `search` is debounced into this, and only this is fetched on. Fetching per
  // keystroke means a request per character, and the slowest response wins
  // rather than the one matching what is now in the box.
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [search]);

  // Bumped to force a refetch after a mutation. A counter rather than calling a
  // `load()` function, because the effect below is the only thing that fetches —
  // one code path, so there is no second one to forget to cancel.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  // Identifies the request the displayed data belongs to. `loading` is derived
  // from comparing this against what has been fetched, rather than stored: a
  // stored flag has to be set synchronously at the top of the effect, which is
  // what this repo's `set-state-in-effect` rule blocks — and the rule is right,
  // because the two can disagree. Derived, they cannot.
  const requestKey = `${page}|${query}|${filter}|${reloadKey}`;
  const [settled, setSettled] = useState<string | null>(null);
  const loading = settled !== requestKey;

  // Held in a ref so the fetch effect does not depend on it. A parent that
  // passes a fresh closure each render would otherwise retrigger the effect on
  // every render — a polling loop caused by a prop that never changed meaning.
  const notifyInvited = useRef(onInvitedChange);
  useEffect(() => {
    notifyInvited.current = onInvitedChange;
  }, [onInvitedChange]);

  useEffect(() => {
    // Guards against out-of-order responses. Typing quickly enough to overlap
    // two requests otherwise leaves whichever returned last on screen, which is
    // not necessarily the one that matches the query.
    let cancelled = false;

    const params = new URLSearchParams({ page: String(page), perPage: "20" });
    if (query) params.set("q", query);
    if (filter !== "all") params.set("status", filter);

    void (async () => {
      try {
        const response = await fetch(`/api/admin/clients?${params}`);
        const data: ListResponse = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError(data.message ?? "Could not load the clients.");
        } else {
          setError(null);
          setClients(data.clients ?? []);
          setPageCount(data.pageCount ?? 1);
          setMailConfigured(data.mailConfigured ?? true);

          if (data.counts) {
            setCounts(data.counts);
            notifyInvited.current?.(data.counts.invited);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the server. Check your connection.");
        }
      }

      // Marked settled either way, or a failed request leaves the panel showing
      // a spinner forever instead of the error it just recorded.
      if (!cancelled) setSettled(requestKey);
    })();

    return () => {
      cancelled = true;
    };
  }, [page, query, filter, requestKey]);

  async function act(
    id: string,
    request: () => Promise<Response>,
    successMessage: string,
  ) {
    setBusyId(id);

    try {
      const response = await request();
      const data: { ok?: boolean; message?: string } = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !data.ok) {
        toast.failure(data.message ?? "That did not work. Try again.");
      } else {
        toast.success(successMessage);
        reload();
      }
    } catch {
      toast.failure("Could not reach the server. Check your connection.");
    }

    setBusyId(null);
  }

  const setStatus = (client: ClientRecord, status: "active" | "suspended") =>
    act(
      client.id,
      () =>
        fetch(`/api/admin/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }),
      status === "active"
        ? `${client.name} can sign in again.`
        : `${client.name} has been deactivated and signed out.`,
    );

  const resendInvite = (client: ClientRecord) =>
    act(
      client.id,
      () =>
        fetch(`/api/admin/clients/${client.id}/invite`, { method: "POST" }),
      `New setup link sent to ${client.email}.`,
    );

  async function remove(client: ClientRecord) {
    await act(
      client.id,
      () => fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" }),
      `${client.name} has been deleted.`,
    );
    setConfirming(null);
  }

  const isFiltered = query !== "" || filter !== "all";

  return (
    <div className="space-y-5">
      {!mailConfigured ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10">
          <MailWarning
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <p className="text-[0.8125rem] leading-relaxed text-amber-900 dark:text-amber-200">
            Outgoing mail is not configured, so setup invitations cannot be sent.
            You can still create clients — their records are saved, and{" "}
            <strong className="font-semibold">Resend invite</strong> will deliver
            the link once SMTP is set up.
          </p>
        </div>
      ) : null}

      {creating ? (
        <CreateClientForm
          onCancel={() => setCreating(false)}
          onCreated={(message, sent) => {
            setCreating(false);
            if (sent) toast.success(message);
            else toast.failure(message);
            reload();
          }}
        />
      ) : null}

      <AdminCard padded={false}>
        <div className="border-b border-gray-200 p-5 sm:p-6 dark:border-gray-800">
          <AdminSectionHeader
            title="Clients"
            description={
              counts.total === 0
                ? "Nobody yet."
                : `${counts.total} ${
                    counts.total === 1 ? "client" : "clients"
                  } · ${counts.active} active${
                    counts.invited > 0 ? ` · ${counts.invited} invited` : ""
                  }${counts.suspended > 0 ? ` · ${counts.suspended} suspended` : ""}`
            }
            action={
              !creating ? (
                <AdminButton
                  variant="primary"
                  icon={Plus}
                  onClick={() => setCreating(true)}
                >
                  Add client
                </AdminButton>
              ) : undefined
            }
          />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email or company"
                aria-label="Search clients"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition-[border-color,box-shadow] placeholder:text-gray-400 focus:border-electric focus:ring-2 focus:ring-electric/20 motion-reduce:transition-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            {/* A radio group, not a row of buttons: these are four mutually
                exclusive views of one list, and that is what the roles say. */}
            <div
              role="radiogroup"
              aria-label="Filter by status"
              className="flex gap-1 overflow-y-hidden overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
            >
              {FILTERS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={filter === option.key}
                  onClick={() => {
                    setFilter(option.key);
                    setPage(1);
                  }}
                  className={`h-8 shrink-0 rounded-md px-3 text-[0.8125rem] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric motion-reduce:transition-none ${
                    filter === option.key
                      ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-100"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <AdminLoading label="Loading clients…" />
        ) : error ? (
          <AdminErrorState message={error} onRetry={reload} />
        ) : clients.length === 0 ? (
          isFiltered ? (
            <AdminEmptyState
              icon={Search}
              title="No clients match that"
              description="Try a different search, or clear the filter."
              action={
                <AdminButton
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </AdminButton>
              }
            />
          ) : (
            <AdminEmptyState
              icon={Users}
              title="No clients yet"
              description="Add one and we will email them a link to set their own password. You never see or handle it."
              action={
                <AdminButton
                  variant="primary"
                  icon={UserPlus}
                  onClick={() => setCreating(true)}
                >
                  Add your first client
                </AdminButton>
              }
            />
          )
        ) : (
          <ClientTable
            clients={clients}
            busyId={busyId}
            onSetStatus={setStatus}
            onResend={resendInvite}
            onDelete={setConfirming}
          />
        )}

        {pageCount > 1 && !loading && !error ? (
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3.5 sm:px-6 dark:border-gray-800">
            <p className="text-[0.8125rem] tabular-nums text-gray-500 dark:text-gray-400">
              Page {page} of {pageCount}
            </p>
            <div className="flex gap-2">
              <AdminButton
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </AdminButton>
              <AdminButton
                size="sm"
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((current) => Math.min(pageCount, current + 1))
                }
              >
                Next
              </AdminButton>
            </div>
          </div>
        ) : null}
      </AdminCard>

      <AdminConfirmDialog
        open={confirming !== null}
        title="Delete this client?"
        description={
          <>
            <strong className="font-semibold text-gray-900 dark:text-gray-100">
              {confirming?.name}
            </strong>{" "}
            will be removed permanently, along with their sign-in access. This
            cannot be undone.
            <br />
            <br />
            To keep the record but block access, deactivate them instead.
          </>
        }
        confirmLabel="Delete client"
        confirmWord={confirming?.email}
        confirmWordLabel={`Type ${confirming?.email} to confirm`}
        destructive
        pending={busyId === confirming?.id}
        onConfirm={() => confirming && void remove(confirming)}
        onCancel={() => setConfirming(null)}
      />

      {toast.toast ? (
        <AdminToast
          message={toast.toast.message}
          tone={toast.toast.tone}
          onDismiss={toast.dismiss}
        />
      ) : null}
    </div>
  );
}

const STATUS_LABELS: Record<
  ClientStatus,
  { label: string; tone: "positive" | "warning" | "danger" }
> = {
  active: { label: "Active", tone: "positive" },
  invited: { label: "Invited", tone: "warning" },
  suspended: { label: "Suspended", tone: "danger" },
};

/**
 * The list.
 *
 * A real `<table>` on wide screens and stacked cards on narrow ones, rather than
 * one horizontally-scrolling table for both. A table narrower than its columns
 * hides the actions off the right edge, which on a phone means the primary thing
 * this panel exists for is behind a swipe nobody knows is there.
 */
function ClientTable({
  clients,
  busyId,
  onSetStatus,
  onResend,
  onDelete,
}: {
  clients: ClientRecord[];
  busyId: string | null;
  onSetStatus: (client: ClientRecord, status: "active" | "suspended") => void;
  onResend: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}) {
  return (
    <>
      <table className="hidden w-full text-left md:table">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-800">
            <Th>Client</Th>
            <Th>Company</Th>
            <Th>Status</Th>
            <Th>Last seen</Th>
            <th className="px-3 py-2.5">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {clients.map((client) => (
            <tr
              key={client.id}
              className="transition-colors hover:bg-gray-50 motion-reduce:transition-none dark:hover:bg-gray-800/40"
            >
              <td className="px-5 py-3.5 sm:px-6">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {client.name}
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-gray-500 dark:text-gray-400">
                  {client.email}
                </p>
              </td>
              <td className="px-3 py-3.5 text-[0.8125rem] text-gray-600 dark:text-gray-400">
                {client.company || "—"}
              </td>
              <td className="px-3 py-3.5">
                <StatusCell client={client} />
              </td>
              <td className="px-3 py-3.5 text-[0.8125rem] tabular-nums text-gray-500 dark:text-gray-400">
                {formatLastSeen(client.lastLoginAt)}
              </td>
              <td className="px-3 py-3.5 pr-5 sm:pr-6">
                <div className="flex justify-end gap-1.5">
                  <RowActions
                    client={client}
                    busy={busyId === client.id}
                    onSetStatus={onSetStatus}
                    onResend={onResend}
                    onDelete={onDelete}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-gray-200 md:hidden dark:divide-gray-800">
        {clients.map((client) => (
          <li key={client.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {client.name}
                </p>
                <p className="mt-0.5 break-words text-[0.8125rem] text-gray-500 dark:text-gray-400">
                  {client.email}
                </p>
                {client.company ? (
                  <p className="mt-0.5 text-[0.8125rem] text-gray-500 dark:text-gray-400">
                    {client.company}
                  </p>
                ) : null}
              </div>
              <StatusCell client={client} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <RowActions
                client={client}
                busy={busyId === client.id}
                onSetStatus={onSetStatus}
                onResend={onResend}
                onDelete={onDelete}
                withLabels
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-gray-400 first:px-5 sm:first:px-6 dark:text-gray-500">
      {children}
    </th>
  );
}

function StatusCell({ client }: { client: ClientRecord }) {
  const status = STATUS_LABELS[client.status];

  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
      {/* Shown only when it is actionable. An expired invitation looks identical
          to a live one in the status column, and it is the difference between
          waiting and resending. */}
      {client.status === "invited" && !client.invitePending ? (
        <span className="text-[0.6875rem] text-gray-400 dark:text-gray-500">
          Link expired
        </span>
      ) : null}
    </div>
  );
}

function RowActions({
  client,
  busy,
  onSetStatus,
  onResend,
  onDelete,
  withLabels = false,
}: {
  client: ClientRecord;
  busy: boolean;
  onSetStatus: (client: ClientRecord, status: "active" | "suspended") => void;
  onResend: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
  withLabels?: boolean;
}) {
  // Offered whenever a password has not been set, expired or not — "they never
  // got the email" is the same request as "the link lapsed", and both are this
  // button.
  const canInvite = !client.hasPassword;

  return (
    <>
      {canInvite ? (
        <AdminButton
          size="sm"
          icon={RotateCcw}
          pending={busy}
          onClick={() => onResend(client)}
          title="Send a new setup link"
        >
          {withLabels ? "Resend invite" : undefined}
        </AdminButton>
      ) : null}

      {client.status === "suspended" ? (
        <AdminButton
          size="sm"
          icon={UserCheck}
          pending={busy}
          onClick={() => onSetStatus(client, "active")}
          title="Let this client sign in again"
        >
          {withLabels ? "Activate" : undefined}
        </AdminButton>
      ) : (
        <AdminButton
          size="sm"
          icon={UserX}
          pending={busy}
          onClick={() => onSetStatus(client, "suspended")}
          title="Block access and sign them out"
        >
          {withLabels ? "Deactivate" : undefined}
        </AdminButton>
      )}

      <AdminButton
        size="sm"
        variant="ghost"
        icon={Trash2}
        disabled={busy}
        onClick={() => onDelete(client)}
        title="Delete permanently"
      >
        {withLabels ? "Delete" : undefined}
      </AdminButton>
    </>
  );
}

/**
 * Relative for the recent past, absolute once it stops being useful.
 *
 * "3 days ago" answers "are they using it"; beyond a week the date is what
 * anyone actually wants, and "47 days ago" is arithmetic nobody asked for.
 */
function formatLastSeen(iso: string | null): string {
  if (!iso) return "Never";

  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  return then.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The create form.
 *
 * Field errors come from the server's Zod schema rather than being duplicated
 * here. The browser's own validation is a courtesy — this posts and renders
 * whatever the server says, so the rules live in exactly one place and cannot
 * disagree.
 */
function CreateClientForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (message: string, sent: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setMessage(null);

    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, phone }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        errors?: Record<string, string>;
        invited?: boolean;
      } = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        setErrors(data.errors ?? {});
        setMessage(data.message ?? "Could not create the client.");
        setPending(false);
        return;
      }

      // Reports what actually happened rather than assuming. The record is saved
      // either way, but "we have emailed them" and "saved, nothing was sent" are
      // different facts, and guessing turns the second into a client who is
      // never heard from and nobody knows why.
      onCreated(
        data.invited
          ? `${name} has been added. Setup link sent to ${email}.`
          : `${name} has been added, but the invitation could not be sent. Use Resend invite once mail is working.`,
        data.invited ?? false,
      );
    } catch {
      setMessage("Could not reach the server. Check your connection.");
      setPending(false);
    }
  }

  return (
    <AdminCard>
      <AdminSectionHeader
        title="Add a client"
        description="They will get an email with a single-use link to set their own password. No password is created here."
      />

      <form onSubmit={submit} className="mt-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminField
            label="Name"
            value={name}
            onChange={setName}
            error={errors.name}
            placeholder="Amina Rashid"
            required
            disabled={pending}
            autoFocus
          />
          <AdminField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
            placeholder="amina@company.com"
            hint="Where the setup link goes."
            required
            disabled={pending}
          />
          <AdminField
            label="Company"
            value={company}
            onChange={setCompany}
            error={errors.company}
            placeholder="Optional"
            disabled={pending}
          />
          <AdminField
            label="Phone"
            type="tel"
            value={phone}
            onChange={setPhone}
            error={errors.phone}
            placeholder="Optional, with country code"
            disabled={pending}
          />
        </div>

        <p
          role="alert"
          aria-live="polite"
          className={
            message
              ? "mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[0.8125rem] text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300"
              : "sr-only"
          }
        >
          {message}
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AdminButton onClick={onCancel} disabled={pending}>
            Cancel
          </AdminButton>
          <AdminButton
            type="submit"
            variant="primary"
            icon={UserPlus}
            pending={pending}
          >
            Add client and send invite
          </AdminButton>
        </div>
      </form>
    </AdminCard>
  );
}
