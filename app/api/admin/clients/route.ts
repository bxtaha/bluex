import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin-guard";
import { SESSION_COOKIE, getSessionUser } from "@/lib/admin-auth";
import {
  SETUP_TOKEN_TTL_MS,
  countClients,
  createClient,
  listClients,
  type ClientStatus,
} from "@/lib/client-auth";
import { sendClientInvitation } from "@/lib/client-invite";
import { createClientSchema, fieldErrors } from "@/lib/client-schema";
import { isMailConfigured } from "@/lib/mailer";

/**
 * The client list, and creating one.
 *
 * Every handler here is behind `requireAdmin`. That guard is the only thing
 * standing between this route and the customer list, so it is the first
 * statement in both handlers rather than something further down after the query
 * has been parsed.
 */

function parseStatus(value: string | null): ClientStatus | "all" {
  return value === "active" || value === "invited" || value === "suspended"
    ? value
    : "all";
}

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  const perPage = Number.parseInt(params.get("perPage") ?? "20", 10);

  try {
    const [result, counts] = await Promise.all([
      listClients({
        search: params.get("q") ?? undefined,
        status: parseStatus(params.get("status")),
        // NaN from a junk query string falls back rather than reaching Mongo;
        // `listClients` clamps the rest.
        page: Number.isFinite(page) ? page : 1,
        perPage: Number.isFinite(perPage) ? perPage : 20,
      }),
      countClients(),
    ]);

    return NextResponse.json({
      ok: true,
      ...result,
      counts,
      // So an empty list can explain itself, and so the create form can warn
      // before it silently creates a client nobody can be told about.
      mailConfigured: isMailConfigured(),
    });
  } catch (error) {
    console.error("[clients] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the clients." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  // Which administrator created the record. Read from the session rather than
  // the body — an audit field the caller can set is not an audit field.
  const store = await cookies();
  const admin = await getSessionUser(store.get(SESSION_COOKIE)?.value);
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "Not signed in." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const parsed = createClientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Check the highlighted fields.",
        errors: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  let created;
  try {
    created = await createClient({ ...parsed.data, createdBy: admin.email });
  } catch (error) {
    console.error("[clients] create failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not create the client." },
      { status: 503 },
    );
  }

  if (!created.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "A client with that email already exists.",
        errors: { email: "Already in use." },
      },
      { status: 409 },
    );
  }

  // The record exists before the email is attempted, and the email is not
  // allowed to undo it. A client stored but not emailed can be invited again
  // from the dashboard; a client emailed but not stored is a link to nothing.
  // Same ordering, and the same reasoning, as the lead flow in `/api/lead`.
  const mail = await sendClientInvitation({
    to: created.client.email,
    name: created.client.name,
    token: created.setupToken,
    ttlMs: SETUP_TOKEN_TTL_MS,
  });

  if (!mail.sent) {
    console.error(
      `[clients] invitation not sent to ${created.client.email}: ${mail.reason}`,
    );
  }

  // `invited` is reported rather than assumed, because the dashboard's copy
  // depends on it — "we have emailed them" and "created, but nothing was sent"
  // are different things to tell an administrator, and guessing turns the second
  // into a client who is never heard from and nobody knows why.
  return NextResponse.json(
    {
      ok: true,
      client: created.client,
      invited: mail.sent,
      inviteError: mail.sent ? null : mail.reason,
    },
    { status: 201 },
  );
}
