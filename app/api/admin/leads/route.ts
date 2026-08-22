import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isConfigured } from "@/lib/elevenlabs";
import { needsAttentionCount, listLeads, type LeadFilter } from "@/lib/lead-store";

/** Anything else is treated as "all" rather than rejected — it is a view. */
function parseFilter(value: string | null): LeadFilter {
  return value === "attention" || value === "completed" ? value : "all";
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

  const filter = parseFilter(new URL(request.url).searchParams.get("filter"));

  try {
    const [leads, attention] = await Promise.all([
      listLeads({ filter }),
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
