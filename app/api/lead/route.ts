import { NextResponse } from "next/server";
import { validateLead, type LeadInput } from "@/lib/lead";

/**
 * Lead intake. Validates server-side, then hands off to the Hermes voice agent
 * which places the call.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO: set HERMES_WEBHOOK_URL in .env.local to go live.
 *
 * Until it is set the endpoint validates and returns success without
 * dispatching, so the form is fully testable. Nothing else needs changing when
 * the URL arrives — the dispatch below is already wired.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const HERMES_WEBHOOK_URL = process.env.HERMES_WEBHOOK_URL;

export async function POST(request: Request) {
  let body: Partial<LeadInput>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const errors = validateLead(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const lead = {
    name: body.name!.trim(),
    business: body.business!.trim(),
    phone: body.phone!.trim(),
    email: body.email?.trim() ?? "",
    submittedAt: new Date().toISOString(),
  };

  if (!HERMES_WEBHOOK_URL) {
    console.warn("[lead] HERMES_WEBHOOK_URL unset — not dispatched:", lead.phone);
    return NextResponse.json({ ok: true, dispatched: false });
  }

  try {
    const response = await fetch(HERMES_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      // The lead is far too valuable to drop silently if Hermes is down.
      console.error("[lead] dispatch failed", response.status, lead);
      return NextResponse.json(
        { ok: false, message: "We couldn't start the call. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, dispatched: true });
  } catch (error) {
    console.error("[lead] dispatch threw", error, lead);
    return NextResponse.json(
      { ok: false, message: "We couldn't start the call. Please try again." },
      { status: 502 },
    );
  }
}
