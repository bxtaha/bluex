import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { deleteProject, publishProjects, updateProject } from "@/lib/projects";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed request." },
      { status: 400 },
    );
  }

  try {
    const project = await updateProject(id, body);
    if (!project) {
      return NextResponse.json(
        { ok: false, message: "No such project." },
        { status: 404 },
      );
    }

    publishProjects();
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    console.error("[projects] update failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the project." },
      { status: 503 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    if (!(await deleteProject(id))) {
      return NextResponse.json(
        { ok: false, message: "No such project." },
        { status: 404 },
      );
    }

    publishProjects();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[projects] delete failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not delete the project." },
      { status: 503 },
    );
  }
}
