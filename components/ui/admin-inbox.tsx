"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Building2,
  CircleAlert,
  Loader2,
  Mail,
  MailOpen,
  Phone,
  RefreshCw,
  Send,
  Tag,
} from "lucide-react";
import type { Message, ThreadFilter, ThreadSummary } from "@/lib/message-store";

/**
 * The unified inbox.
 *
 * Split view on a wide screen, one pane at a time on a narrow one — `selected`
 * doubles as "which pane is showing", because on a phone a list and a
 * conversation side by side means neither is readable.
 *
 * Everything is fetched rather than passed in from the server page. Unlike the
 * pricing editor, this data goes stale on its own: mail arrives while
 * the tab is open. A server-rendered snapshot would be wrong within minutes and
 * would have to be refetched anyway.
 */

const FILTERS: { value: ThreadFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "contact_form", label: "Contact form" },
  { value: "email", label: "Email" },
];

type SyncState = {
  lastRunAt: string | null;
  lastError: string | null;
  configured: boolean;
};

export function AdminInbox({
  onUnreadChange,
}: {
  /** Lifted so the sidebar badge and this view cannot disagree about the count. */
  onUnreadChange?: (count: number) => void;
}) {
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [selected, setSelected] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sync, setSync] = useState<SyncState | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Bumped to ask for a refetch after something changed the data.
   *
   * The fetch lives entirely inside the effect below and the effect owns every
   * `setState` that follows it. That shape is not a stylistic preference: this
   * repo's react-hooks lint rejects a `setState` reached synchronously from an
   * effect body, and calling a loader function from the effect is exactly that
   * once the loader flips a spinner on before awaiting. Turning the spinner on
   * is the caller's job — it happens in an event handler, where it belongs —
   * and turning it off is the effect's, after the await.
   */
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setLoadingList(true);
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/inbox?filter=${filter}&archived=${showArchived}`,
        );
        const data = await response.json();
        // A filter switched while this was in flight: the answer is for a
        // question nobody is asking any more, and writing it would overwrite
        // the newer list with an older one.
        if (cancelled) return;

        if (!response.ok || !data.ok) {
          setError(data.message ?? "Could not load the inbox.");
          return;
        }
        setThreads(data.threads);
        setSync(data.sync);
        onUnreadChange?.(data.unread);
        setError(null);
      } catch {
        // A dead network must not take the dashboard down with it — the rest
        // of the admin panel is still usable, so this is an error *state*, not
        // a thrown one.
        if (!cancelled) setError("Could not reach the server.");
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, showArchived, reloadKey, onUnreadChange]);

  async function openThread(thread: ThreadSummary) {
    setSelected(thread);
    setMessages([]);
    setLoadingThread(true);
    try {
      const response = await fetch(`/api/admin/inbox/${thread.id}`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not open that conversation.");
        return;
      }
      setMessages(data.messages);
      // The GET marked it read on the server; mirror that here rather than
      // refetching the whole list to find out.
      setThreads((current) =>
        current.map((t) => (t.id === thread.id ? { ...t, unread: 0 } : t)),
      );
      setSelected({ ...thread, unread: 0 });
      setError(null);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoadingThread(false);
    }
  }

  async function patchThread(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    reload();
  }

  async function markUnread(thread: ThreadSummary) {
    setSelected(null);
    await patchThread(thread.id, { status: "unread" });
  }

  async function toggleArchive(thread: ThreadSummary) {
    setSelected(null);
    await patchThread(thread.id, { archived: !thread.archived });
  }

  async function refresh() {
    setSyncing(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/inbox/sync", { method: "POST" });
      const data = await response.json();
      setNotice(
        data.ok
          ? `Checked the mailbox — ${data.imported} new.`
          : (data.message ?? "Could not reach the mailbox."),
      );
      reload();
    } catch {
      setNotice("Could not reach the server.");
    } finally {
      setSyncing(false);
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
                setSelected(null);
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
          onClick={() => {
            setShowArchived((current) => !current);
            setSelected(null);
          }}
          aria-pressed={showArchived}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            showArchived
              ? "bg-gray-800 text-white dark:bg-gray-700"
              : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          }`}
        >
          Archived
        </button>

        <button
          type="button"
          onClick={refresh}
          disabled={syncing}
          className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            aria-hidden
          />
          {syncing ? "Checking…" : "Refresh"}
        </button>
      </div>

      {/* Mail configuration and the last sync are reported plainly. An inbox
          that is empty because IMAP was never configured looks exactly like an
          inbox that is empty because nobody wrote — and only one of those is
          something to fix. */}
      {sync && !sync.configured && (
        <Banner tone="warn">
          IMAP is not configured, so no email is being pulled in. Contact-form
          submissions still arrive. Set <code>IMAP_USER</code> and{" "}
          <code>IMAP_PASS</code> to connect the mailbox.
        </Banner>
      )}
      {sync?.configured && sync.lastError && (
        <Banner tone="error">
          Last mailbox check failed: {sync.lastError}
        </Banner>
      )}
      {notice && <Banner tone="info">{notice}</Banner>}
      {error && <Banner tone="error">{error}</Banner>}

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* On a phone the list steps aside once a conversation is open. */}
        <div className={selected ? "hidden lg:block" : ""}>
          <ThreadList
            threads={threads}
            loading={loadingList}
            selectedId={selected?.id ?? null}
            onOpen={openThread}
          />
        </div>

        <div className={selected ? "" : "hidden lg:block"}>
          {selected ? (
            <Conversation
              thread={selected}
              messages={messages}
              loading={loadingThread}
              canSend={sync?.configured !== false}
              onBack={() => setSelected(null)}
              onMarkUnread={() => markUnread(selected)}
              onToggleArchive={() => toggleArchive(selected)}
              onReplied={() => {
                void openThread(selected);
                reload();
              }}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Pick a conversation to read it.
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

function SourceBadge({ source }: { source: ThreadSummary["source"] }) {
  const isForm = source === "contact_form";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${
        isForm
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
      }`}
    >
      {isForm ? "Contact form" : "Email"}
    </span>
  );
}

function ThreadList({
  threads,
  loading,
  selectedId,
  onOpen,
}: {
  threads: ThreadSummary[];
  loading: boolean;
  selectedId: string | null;
  onOpen: (thread: ThreadSummary) => void;
}) {
  if (loading && threads.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden />
        <span className="sr-only">Loading conversations</span>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 px-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        Nothing here yet.
      </div>
    );
  }

  return (
    <ul className="max-h-[70vh] divide-y divide-gray-200 overflow-y-auto rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
      {threads.map((thread) => (
        <li key={thread.id}>
          <button
            type="button"
            onClick={() => onOpen(thread)}
            aria-current={selectedId === thread.id ? "true" : undefined}
            className={`w-full px-4 py-3 text-left transition-colors ${
              selectedId === thread.id
                ? "bg-blue-50 dark:bg-blue-900/30"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {/* The unread dot carries meaning, so it also carries text. */}
              {thread.unread > 0 && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-blue-500"
                  aria-hidden
                />
              )}
              <span
                className={`truncate text-sm ${
                  thread.unread > 0
                    ? "font-semibold text-gray-900 dark:text-gray-100"
                    : "font-medium text-gray-700 dark:text-gray-300"
                }`}
              >
                {thread.name}
              </span>
              {thread.unread > 0 && <span className="sr-only">(unread)</span>}
              <span className="ml-auto shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {formatWhen(thread.lastAt)}
              </span>
            </div>

            <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {thread.subject}
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {thread.snippet}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <SourceBadge source={thread.source} />
              {thread.count > 1 && (
                <span className="text-[0.65rem] text-gray-400 dark:text-gray-500">
                  {thread.count} messages
                </span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Conversation({
  thread,
  messages,
  loading,
  canSend,
  onBack,
  onMarkUnread,
  onToggleArchive,
  onReplied,
}: {
  thread: ThreadSummary;
  messages: Message[];
  loading: boolean;
  canSend: boolean;
  onBack: () => void;
  onMarkUnread: () => void;
  onToggleArchive: () => void;
  onReplied: () => void;
}) {
  return (
    <div className="flex max-h-[70vh] flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {thread.subject}
          </p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {thread.name} · {thread.email}
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkUnread}
          title="Mark unread"
          aria-label="Mark unread"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <Mail className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleArchive}
          title={thread.archived ? "Move back to the inbox" : "Archive"}
          aria-label={thread.archived ? "Move back to the inbox" : "Archive"}
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {thread.archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* `min-h-0` so this scrolls instead of pushing the composer off the
          bottom — a flex child defaults to `min-height: auto` and refuses to
          shrink below its content. Same trap as the Harvard modal. */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" aria-hidden />
          </div>
        ) : (
          messages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))
        )}
      </div>

      <ReplyComposer
        threadId={thread.id}
        subject={thread.subject}
        canSend={canSend}
        onSent={onReplied}
      />
    </div>
  );
}

function MessageCard({ message }: { message: Message }) {
  const outgoing = message.direction === "out";

  return (
    <article
      className={`rounded-lg border p-4 ${
        outgoing
          ? "border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-900/20"
          : "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950"
      }`}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {outgoing ? "You" : message.name || message.email}
        </span>
        {!outgoing && message.email && <span>· {message.email}</span>}
        <span className="ml-auto">{formatFull(message.createdAt)}</span>
      </header>

      {/* Contact-form submissions carry structured fields. They go above the
          body because they are what you decide from — someone asking about a
          voice agent with a company name attached is a different reply from an
          anonymous "something else". */}
      {message.source === "contact_form" && !outgoing && (
        <dl className="mb-3 flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-white px-3 py-2 text-xs dark:bg-gray-900">
          {message.company && (
            <Detail Icon={Building2} label="Company" value={message.company} />
          )}
          {message.need && (
            <Detail Icon={Tag} label="Needs" value={message.need} />
          )}
          {message.phone && (
            <Detail Icon={Phone} label="Phone" value={message.phone} />
          )}
        </dl>
      )}

      {/* The stored HTML was sanitised at ingest — see `lib/sanitise-mail.ts`.
          Plain text is preferred whenever it exists, because it cannot carry a
          payload at all and it reads better in this narrow column. */}
      {message.message ? (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {message.message}
        </p>
      ) : message.html ? (
        <div
          className="prose-sm max-w-none break-words text-sm leading-relaxed text-gray-800 dark:text-gray-200"
          dangerouslySetInnerHTML={{ __html: message.html }}
        />
      ) : (
        <p className="text-sm italic text-gray-400">(empty message)</p>
      )}
    </article>
  );
}

function Detail({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-gray-400" aria-hidden />
      <dt className="sr-only">{label}</dt>
      <dd className="text-gray-700 dark:text-gray-300">{value}</dd>
    </div>
  );
}

function ReplyComposer({
  threadId,
  subject,
  canSend,
  onSent,
}: {
  threadId: string;
  subject: string;
  canSend: boolean;
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function send() {
    if (!text.trim()) return;
    setSending(true);
    setFailure(null);
    try {
      const response = await fetch("/api/admin/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: text }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setFailure(data.message ?? "Could not send that.");
        return;
      }
      // Only cleared once it actually went. A composer that empties itself on
      // a failed send loses the reply someone just wrote.
      setText("");
      onSent();
    } catch {
      setFailure("Could not reach the server.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-gray-200 p-4 dark:border-gray-800">
      <label htmlFor={`reply-${threadId}`} className="sr-only">
        Reply to {subject}
      </label>
      <textarea
        id={`reply-${threadId}`}
        rows={3}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={
          canSend ? "Write a reply…" : "Sending is not configured (SMTP)."
        }
        disabled={!canSend}
        className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      />

      {failure && (
        <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
          {failure}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={sending || !text.trim() || !canSend}
          className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Send className="h-4 w-4" aria-hidden />
          )}
          {sending ? "Sending…" : "Send reply"}
        </button>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <MailOpen className="h-3.5 w-3.5" aria-hidden />
          Threads onto the original message.
        </span>
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
