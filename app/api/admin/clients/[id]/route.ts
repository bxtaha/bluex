import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  deleteClient,
  getClientById,
  setClientStatus,
  updateClient,
} from "@/lib/client-auth";
import {
  clientStatusSchema,
  fieldErrors,
  updateClientSchema,
} from "@/lib/client-schema";

/**
 * One client: read, edit, activate/deactivate, delete.
 *
 * The id arrives from the URL, so every handler treats it as untrusted input.
 * `getClientById` and friends return null for anything that is not a valid
 * ObjectId rather than throwing, which is why a junk id here is a 404 and not a
 * 500 with a stack trace in it.
 */

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    const client = await getClientById(id);
    if (!client) {
      return NextResponse.json(
        { ok: false, message: "No such client." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, client });
  } catch (error) {
    console.error("[clients] read failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the client." },
      { status: 503 },
    );
  }
}

/**
 * Edits fields, or changes status — never both in one request.
 *
 * Two shapes through one method because they are both "modify this client", but
 * they are parsed by two different schemas and dispatched on which one matches.
 * A status change revokes sessions and an edit does not, so letting a single
 * permissive schema accept either would mean a name change could quietly carry a
 * `status` key and take someone's access away as a side effect.
 */
export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  const statusChange = clientStatusSchema.safeParse(body);
  if (statusChange.success) {
    try {
      const client = await setClientStatus(id, statusChange.data.status);
      if (!client) {
        return NextResponse.json(
          { ok: false, message: "No such client." },
          { status: 404 },
        );
      }

      return NextResponse.json({ ok: true, client });
    } catch (error) {
      console.error("[clients] status change failed:", error);
      return NextResponse.json(
        { ok: false, message: "Could not update the client." },
        { status: 503 },
      );
    }
  }

  const parsed = updateClientSchema.safeParse(body);
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

  try {
    const client = await updateClient(id, parsed.data);
    if (!client) {
      return NextResponse.json(
        { ok: false, message: "No such client." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, client });
  } catch (error) {
    console.error("[clients] update failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not update the client." },
      { status: 503 },
    );
  }
}

/**
 * Hard delete.
 *
 * Deactivation is the reversible option and the one the dashboard leads with;
 * this exists for a record that should genuinely not be retained. The
 * confirmation is a typed email in the UI rather than a second parameter here —
 * a server-side "are you sure" flag is something a script skips, so it protects
 * nobody who is not already being careful.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    const removed = await deleteClient(id);
    if (!removed) {
      return NextResponse.json(
        { ok: false, message: "No such client." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[clients] delete failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not delete the client." },
      { status: 503 },
    );
  }
}
