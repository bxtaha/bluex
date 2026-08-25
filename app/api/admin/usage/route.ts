import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getPlanUsage, getUsageMinutes, isConfigured } from "@/lib/elevenlabs";
import { callUsageStats } from "@/lib/call-store";

/**
 * What the voice agents have used, and what is left of the plan.
 *
 * Three sources, deliberately kept apart rather than merged into one number:
 *
 * - **`minutes`** — the provider's own billable talk time for the window.
 * - **`archive`** — what this app actually holds, from the `calls` collection.
 *   Splits by direction and survives the provider being unreachable.
 * - **`plan`** — the subscription quota, which needs the `user_read`
 *   permission the Agents-scoped key does not carry. Reported as its own
 *   failure shape so the dashboard can say *which* permission is missing
 *   rather than rendering an empty progress bar.
 *
 * Every part degrades on its own. A provider outage costs the first and third
 * and leaves the archive figures intact, which is the half that matters when
 * someone is asking "did the calls happen".
 */

/** Rolling window for the headline number, in days. */
const WINDOW_DAYS = 30;

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const now = Date.now();
  const since = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Settled, not `all`: the provider being down must not take the archive
  // figures with it, and the plan is expected to fail on a scoped key.
  const [configured, windowMinutes, archiveWindow, archiveTotal, plan] =
    await Promise.allSettled([
      isConfigured(),
      getUsageMinutes(since.getTime(), now),
      callUsageStats(since),
      callUsageStats(),
      getPlanUsage(),
    ]);

  const value = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === "fulfilled" ? r.value : fallback;

  const minutesResult = value(windowMinutes, {
    ok: false as const,
    reason: "Could not read usage.",
  });

  const planResult = value(plan, {
    ok: false as const,
    reason: "Could not read the plan.",
    needsPermission: false,
  });

  if (archiveWindow.status === "rejected") {
    console.error("[usage] archive window failed:", archiveWindow.reason);
  }

  const emptyStats = {
    conversations: 0,
    inbound: 0,
    outbound: 0,
    talkSeconds: 0,
    inboundSeconds: 0,
    outboundSeconds: 0,
  };

  return NextResponse.json({
    ok: true,
    configured: value(configured, false),
    windowDays: WINDOW_DAYS,
    minutes: minutesResult.ok
      ? { ok: true, value: minutesResult.minutes }
      : { ok: false, reason: minutesResult.reason },
    archive: {
      window: value(archiveWindow, emptyStats),
      total: value(archiveTotal, emptyStats),
    },
    plan: planResult.ok
      ? { ok: true, ...planResult.plan }
      : {
          ok: false,
          reason: planResult.reason,
          needsPermission: planResult.needsPermission,
        },
  });
}
