import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  createProject,
  getFootnote,
  listAllProjects,
  publishProjects,
  updateFootnote,
} from "@/lib/projects";

/** Every project, hidden ones included, plus the line under the cards. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [projects, footnote] = await Promise.all([
      listAllProjects(),
      getFootnote(),
    ]);
    return NextResponse.json({ ok: true, projects, footnote });
  } catch (error) {
    console.error("[projects] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load projects." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // A create with no body is a blank project, which is what "Add project"
    // means.
  }

  try {
    const project = await createProject(body);
    publishProjects();
    return NextResponse.json({ ok: true, project }, { status: 201 });
  } catch (error) {
    console.error("[projects] create failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not create the project." },
      { status: 503 },
    );
  }
}

/** The caption under the cards. Its own verb because it is not a project. */
export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let body: { footnote?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  if (typeof body.footnote !== "string") {
    return NextResponse.json(
      { ok: false, message: "Expected a footnote." },
      { status: 400 },
    );
  }

  try {
    const footnote = await updateFootnote(body.footnote);
    publishProjects();
    return NextResponse.json({ ok: true, footnote });
  } catch (error) {
    console.error("[projects] footnote save failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the caption." },
      { status: 503 },
    );
  }
}
