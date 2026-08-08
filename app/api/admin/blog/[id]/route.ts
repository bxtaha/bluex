import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { deletePost, publishBlog, readPostById, updatePost } from "@/lib/blog";

/** Route params are a promise in this App Router version. */
type Context = { params: Promise<{ id: string }> };

/** One post, body included — this is what the editor loads. */
export async function GET(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    const post = await readPostById(id);
    if (!post) {
      return NextResponse.json(
        { ok: false, message: "No such post." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("[blog] read failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load the post." },
      { status: 503 },
    );
  }
}

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
    // Read first, for the slug it had before this edit. A rename leaves the old
    // URL cached and serving a page that has moved, and only the pre-edit value
    // knows which URL that is.
    const before = await readPostById(id);
    if (!before) {
      return NextResponse.json(
        { ok: false, message: "No such post." },
        { status: 404 },
      );
    }

    const post = await updatePost(id, body);
    if (!post) {
      return NextResponse.json(
        { ok: false, message: "No such post." },
        { status: 404 },
      );
    }

    publishBlog(post.slug, before.slug);
    return NextResponse.json({ ok: true, post });
  } catch (error) {
    console.error("[blog] update failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not save the post." },
      { status: 503 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;

  try {
    const before = await readPostById(id);
    if (!before || !(await deletePost(id))) {
      return NextResponse.json(
        { ok: false, message: "No such post." },
        { status: 404 },
      );
    }

    publishBlog(before.slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[blog] delete failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not delete the post." },
      { status: 503 },
    );
  }
}
