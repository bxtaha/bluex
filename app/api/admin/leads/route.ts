import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isConfigured } from "@/lib/elevenlabs";
import {
  needsAttentionCount,
  listLeads,
  type LeadFilter,
  type LeadStage,
} from "@/lib/lead-store";

/** Anything else is treated as "all" rather than rejected — it is a view. */
function parseFilter(value: string | null): LeadFilter {
  return value === "attention" || value === "completed" ? value : "all";
}

/**
 * The closed set of stages, exactly as `app/api/admin/leads/[id]/route.ts`
 * enforces on write. An unvalidated value here would reach `leadFilterFor`
 * and, from there, a Mongo query built from a query string. Unlike the PATCH
 * route this is a read, not a write, so a bad value is treated the same way
 * `parseFilter` treats one — silently ignored rather than rejected — since
 * the worst case is showing the unfiltered list, not writing anything wrong.
 */
const STAGES: LeadStage[] = ["new", "contacted", "qualified", "won", "lost"];

function parseStage(value: string | null): LeadStage | undefined {
  return value && STAGES.includes(value as LeadStage) ? (value as LeadStage) : undefined;
}

/**
 * The lead list, the badge count, and whether the voice agent is wired up.
 *
 * All three together, like the inbox does, because the panel needs all three to
 * render one screen — and the third is what lets an empty list explain itself.
 * "No leads yet" and "leads arrived but nothing could call them" look identical
 * without it.
 */
export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const filter = parseFilter(params.get("filter"));
  const stage = parseStage(params.get("stage"));

  try {
    const [leads, attention] = await Promise.all([
      listLeads({ filter, stage }),
      needsAttentionCount(),
    ]);

    return NextResponse.json({
      ok: true,
      leads,
      attention,
      configured: isConfigured(),
    });
  } catch (error) {
    console.error("[leads] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the leads." },
      { status: 503 },
    );
  }
}
