"use client";

import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Mail,
  PhoneCall,
  UserPlus,
} from "lucide-react";
import { AdminCard, AdminSectionHeader } from "./primitives";
import { AdminVoiceUsage } from "./admin-voice-usage";

/**
 * The overview.
 *
 * This view was a dashed box reading "Nothing here yet". What replaced it is
 * deliberately **not** a row of stat cards, which is the reflex answer and the
 * wrong one for a two-person agency: total-leads-ever is a number nobody acts
 * on, and giving it a card teaches people to stop reading the screen.
 *
 * The organising question is "what is waiting on me". Anything needing a
 * decision is a row at the top, and every row is the control that takes you to
 * it — so noticing and acting are the same gesture rather than a notice followed
 * by a hunt through the sidebar. Configuration problems get their own block
 * because they are silent: nothing about a lead that was never called looks
 * wrong from the outside.
 *
 * There is deliberately **no** strip of totals. There was one — clients,
 * active, posts, projects — and it was removed for the reason stated above:
 * four numbers nobody acts on, which is precisely the row of stat cards this
 * view exists to avoid. Voice usage is the one standing figure that survived,
 * because it moves, it costs money, and it becomes a decision when the plan
 * runs low.
 *
 * When nothing is waiting the page says so plainly. An empty queue is good news
 * and should look like it, not like a screen that failed to load.
 */

export type OverviewData = {
  /** Leads nobody has reached yet. */
  attention: number;
  /** Unread conversations. */
  unread: number;
  /** Clients with an outstanding invitation. */
  invited: number;
  /** Whether the voice agent can actually place calls. */
  voiceConfigured: boolean;
  /** Whether outgoing mail works — invitations depend on it. */
  mailConfigured: boolean;
};

export function AdminOverview({
  data,
  onNavigate,
  name,
}: {
  data: OverviewData;
  onNavigate: (view: string) => void;
  name?: string;
}) {
  const queue = [
    data.attention > 0 && {
      key: "Leads",
      icon: PhoneCall,
      count: data.attention,
      label: data.attention === 1 ? "lead to call" : "leads to call",
      // Named as the consequence, not the record type. "Nobody has called them"
      // is what makes someone click; "status: attention" is what the database
      // calls it.
      detail: "Nobody has spoken to them yet.",
      tone: "warning" as const,
    },
    data.unread > 0 && {
      key: "Inbox",
      icon: Inbox,
      count: data.unread,
      label: data.unread === 1 ? "unread conversation" : "unread conversations",
      detail: "Waiting for a reply.",
      tone: "accent" as const,
    },
    data.invited > 0 && {
      key: "Clients",
      icon: UserPlus,
      count: data.invited,
      label: data.invited === 1 ? "invitation outstanding" : "invitations outstanding",
      detail: "They have not set a password yet.",
      tone: "neutral" as const,
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    label: string;
    detail: string;
    tone: "warning" | "accent" | "neutral";
  }[];

  const problems = [
    !data.voiceConfigured && {
      key: "voice",
      icon: PhoneCall,
      title: "The voice agent is not configured",
      detail:
        "Leads are still being stored, but none of them are being called. Set the ElevenLabs keys under Settings to start dialling.",
    },
    !data.mailConfigured && {
      key: "mail",
      icon: Mail,
      title: "Outgoing mail is not configured",
      detail:
        "New clients can be created, but their setup invitations cannot be sent. Set the SMTP credentials, then use Resend invite.",
    },
  ].filter(Boolean) as {
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    detail: string;
  }[];

  return (
    <div className="space-y-5">
      <AdminCard padded={false}>
        <div className="border-b border-gray-200 p-5 sm:p-6 dark:border-gray-800">
          <AdminSectionHeader
            title={queue.length > 0 ? "Needs you" : "Nothing waiting"}
            description={
              queue.length > 0
                ? "Everything below is someone waiting on a reply."
                : `Every lead has been called and every message answered${
                    name ? `, ${name.split(" ")[0]}` : ""
                  }.`
            }
          />
        </div>

        {queue.length === 0 ? (
          <div className="flex items-center gap-3 p-5 sm:p-6">
            <CheckCircle2
              className="size-5 shrink-0 text-emerald-500"
              aria-hidden
            />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You are all caught up.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {queue.map((row) => (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(row.key)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-electric motion-reduce:transition-none sm:px-6 dark:hover:bg-gray-800/50"
                >
                  <span className="grid size-9 shrink-0 place-content-center rounded-lg bg-gray-100 dark:bg-gray-800">
                    <row.icon
                      className="size-4 text-gray-500 dark:text-gray-400"
                      aria-hidden
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="text-base font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                        {row.count}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {row.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[0.8125rem] text-gray-500 dark:text-gray-400">
                      {row.detail}
                    </span>
                  </span>

                  <ArrowRight
                    className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>

      {problems.length > 0 ? (
        <AdminCard>
          <AdminSectionHeader
            title="Needs setting up"
            description="These fail quietly, so they are worth stating."
          />

          <ul className="mt-4 space-y-3">
            {problems.map((problem) => (
              <li
                key={problem.key}
                className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/25 dark:bg-amber-500/10"
              >
                <problem.icon
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-[0.8125rem] font-medium text-amber-900 dark:text-amber-200">
                    {problem.title}
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-amber-800/90 dark:text-amber-200/70">
                    {problem.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </AdminCard>
      ) : null}

      {/* Last, and the only standing figure on this view.
          The "At a glance" strip that used to sit below — clients, active,
          posts, projects — was removed: it was four totals nobody acts on, and
          the doc comment above already argues that giving such a number a card
          teaches people to stop reading the screen. It had drifted into being
          exactly the row of stat cards this view was written to avoid. Talk
          time earns its place because it moves, costs money, and turns into a
          decision when the plan bar goes amber. */}
      <AdminVoiceUsage />
    </div>
  );
}

