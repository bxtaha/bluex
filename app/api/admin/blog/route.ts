import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createPost, listAllPosts, publishBlog } from "@/lib/blog";

/** Every post: drafts, scheduled and published. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json({ ok: true, posts: await listAllPosts() });
  } catch (error) {
    console.error("[blog] list failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not load posts." },
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
    // A create with no body is a blank draft, which is what "New post" means.
  }

  try {
    const post = await createPost(body);
    // A new post is a draft, so nothing public changed — but `publishBlog` is
    // cheap and calling it unconditionally is what keeps "did I remember to
    // revalidate?" from being a question anyone has to answer per branch.
    publishBlog(post.slug);
    return NextResponse.json({ ok: true, post }, { status: 201 });
  } catch (error) {
    console.error("[blog] create failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not create the post." },
      { status: 503 },
    );
  }
}
