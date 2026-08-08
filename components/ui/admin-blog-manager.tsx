"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ImageField } from "@/components/ui/image-field";
import type { Post, PostCard } from "@/lib/blog-store";

const FIELD =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const LABEL =
  "block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

/**
 * The blog admin.
 *
 * Two screens in one component: a list, and an editor for whichever post is
 * open. They are not separate routes because the editor holds unsaved work —
 * a route change would drop it, and the "are you sure?" dialog that usually
 * papers over that is a worse answer than not navigating.
 */
export function AdminBlogManager({ initial }: { initial: PostCard[] }) {
  const [posts, setPosts] = useState<PostCard[]>(initial);
  const [editing, setEditing] = useState<Post | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/admin/blog");
    const data = await response.json();
    if (response.ok && data.ok) setPosts(data.posts);
  }, []);

  async function open(id: string) {
    setLoadingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/blog/${id}`);
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not open that post.");
        return;
      }
      setEditing(data.post);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoadingId(null);
    }
  }

  async function create() {
    setLoadingId("new");
    setError(null);
    try {
      const response = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled post" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not create a post.");
        return;
      }
      setEditing(data.post);
      await refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoadingId(null);
    }
  }

  async function remove(post: PostCard) {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    setLoadingId(post.id);
    try {
      const response = await fetch(`/api/admin/blog/${post.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.message ?? "Could not delete that post.");
        return;
      }
      setPosts((current) => current.filter((p) => p.id !== post.id));
    } finally {
      setLoadingId(null);
    }
  }

  if (editing) {
    return (
      <PostEditor
        // Keyed on the post, so opening a different one remounts the editor
        // and its state starts from that post. The alternative — resetting
        // `draft` from an effect when the prop changes — is a setState in an
        // effect body, which this repo's lint rejects and which renders once
        // with the wrong post before correcting itself.
        key={editing.id}
        post={editing}
        onClose={() => {
          setEditing(null);
          void refresh();
        }}
        onSaved={(saved) => {
          setEditing(saved);
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="max-w-5xl">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={create}
        disabled={loadingId !== null}
        className="mb-6 flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loadingId === "new" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="h-4 w-4" aria-hidden />
        )}
        New post
      </button>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
          No posts yet. The homepage teaser stays hidden until three are
          published.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge post={post} />
                  {post.featured && (
                    <span
                      title="Featured"
                      className="text-amber-500 dark:text-amber-400"
                    >
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                      <span className="sr-only">Featured</span>
                    </span>
                  )}
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {post.title}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-gray-400">
                  /blog/{post.slug}
                  {post.category ? ` · ${post.category}` : ""} · {post.readTime}{" "}
                  min
                </p>
              </div>

              <a
                href={`/api/admin/blog/preview?id=${post.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Preview on the site"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Preview {post.title}</span>
              </a>
              <button
                type="button"
                onClick={() => open(post.id)}
                disabled={loadingId !== null}
                className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {loadingId === post.id && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                )}
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(post)}
                disabled={loadingId !== null}
                aria-label={`Delete ${post.title}`}
                className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Draft / Scheduled / Live.
 *
 * "Scheduled" is not a stored status — it is `published` with a `publishedAt`
 * in the future. Showing it as "Live" would be a lie the admin only discovers
 * by visiting the site and not finding the post.
 */
function StatusBadge({ post }: { post: Pick<PostCard, "status" | "publishedAt"> }) {
  const now = useNow();

  // `now === 0` is the server pass and the first client render, where there is
  // no clock — see `useNow`. A post is only ever shown as scheduled once its
  // publication date can actually be compared against something.
  const scheduled =
    now > 0 &&
    post.status === "published" &&
    post.publishedAt != null &&
    new Date(post.publishedAt).getTime() > now;

  const [text, tone] = scheduled
    ? ["Scheduled", "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"]
    : post.status === "published"
      ? ["Live", "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"]
      : ["Draft", "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"];

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide ${tone}`}
    >
      {text}
    </span>
  );
}

/**
 * The current time, as an external store.
 *
 * `Date.now()` called during render is an impure read, which this repo's
 * react-hooks lint rejects — and rightly: it makes the render's output depend
 * on when it happened, so two renders of identical props can disagree and
 * React is free to assume they cannot. The clock is genuinely an external
 * mutable source, which is exactly what `useSyncExternalStore` is for. The
 * snapshot is cached between ticks, so `getSnapshot` returns a stable value and
 * does not loop, and the server snapshot is 0 — no clock — so the server pass
 * and the first client render agree.
 *
 * Same shape as `useMediaQuery` in `section-nav.tsx`, for the same reason.
 */
let clock = 0;
const clockListeners = new Set<() => void>();

function subscribeToClock(onChange: () => void): () => void {
  clockListeners.add(onChange);
  if (clockListeners.size === 1) {
    clock = Date.now();
    clockTimer = window.setInterval(() => {
      clock = Date.now();
      for (const listener of clockListeners) listener();
    }, 30_000);
    // The value was 0 until this instant; tell the first subscriber so it
    // re-renders with a real time rather than waiting half a minute.
    queueMicrotask(onChange);
  }
  return () => {
    clockListeners.delete(onChange);
    if (clockListeners.size === 0) window.clearInterval(clockTimer);
  };
}

let clockTimer = 0;

function useNow(): number {
  return useSyncExternalStore(
    subscribeToClock,
    () => clock,
    () => 0,
  );
}

/** `<input type="datetime-local">` wants local wall-clock time, not an ISO Z. */
function toLocalInput(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function PostEditor({
  post,
  onClose,
  onSaved,
}: {
  post: Post;
  onClose: () => void;
  onSaved: (post: Post) => void;
}) {
  const [draft, setDraft] = useState<Post>(post);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function update<K extends keyof Post>(key: K, value: Post[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setSavedAt(null);
  }

  async function save(overrides: Partial<Post> = {}) {
    const next = { ...draft, ...overrides };
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/blog/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: next.title,
          slug: next.slug,
          // Sent even when blank: the server reads an empty string as "work it
          // out from the body", which is where the auto-excerpt happens.
          excerpt: next.excerpt,
          content: next.content,
          coverImage: next.coverImage,
          category: next.category,
          tags: next.tags,
          author: next.author,
          status: next.status,
          featured: next.featured,
          publishedAt: next.publishedAt,
          seo: next.seo,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Could not save.");
        return;
      }
      // The server's copy, not the local one: the slug may have been
      // de-duplicated, and the excerpt and read time were recomputed.
      setDraft(data.post);
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString());
      onSaved(data.post);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All posts
        </button>

        <StatusBadge post={draft} />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
          {savedAt && !dirty && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Saved at {savedAt}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            aria-pressed={showPreview}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Eye className="h-4 w-4" aria-hidden />
            {showPreview ? "Hide preview" : "Preview"}
          </button>

          <button
            type="button"
            onClick={() => save()}
            disabled={saving}
            className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save
          </button>

          {draft.status === "published" ? (
            <button
              type="button"
              onClick={() => save({ status: "draft" })}
              disabled={saving}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save({ status: "published" })}
              disabled={saving}
              className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <div>
            <label className={LABEL} htmlFor="post-title">
              Title
            </label>
            <input
              id="post-title"
              className={`mt-1.5 ${FIELD} text-base font-medium`}
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="post-slug">
              Slug
            </label>
            <input
              id="post-slug"
              className={`mt-1.5 ${FIELD} font-mono`}
              value={draft.slug}
              onChange={(event) => update("slug", event.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Generated from the title when a post is created, and editable
              after. Changing it on a published post changes its URL — anything
              already linking to the old one will 404.
            </p>
          </div>

          <div>
            <label className={LABEL} htmlFor="post-excerpt">
              Excerpt
            </label>
            <textarea
              id="post-excerpt"
              rows={2}
              className={`mt-1.5 ${FIELD} resize-y`}
              value={draft.excerpt}
              onChange={(event) => update("excerpt", event.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Leave blank and the first ~160 characters of the body are used,
              cut at a word boundary. Also the fallback meta description.
            </p>
          </div>

          <div>
            <span className={LABEL}>Content</span>
            <div className="mt-1.5">
              <RichTextEditor
                value={post.content}
                onChange={(html) => update("content", html)}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Read time is recalculated from the word count every time you save.
              Code blocks are highlighted on the server, so the post page ships
              no highlighter.
            </p>
          </div>

          {showPreview && (
            <div>
              <span className={LABEL}>Live preview</span>
              {/* On the site's own background, with the site's own prose
                  styles, because a preview against a white admin panel tells
                  you nothing about how it will actually read.

                  The HTML goes in unsanitised, which is safe *here* and only
                  here: it is the editor's current output, and ProseMirror can
                  only emit nodes its schema declares. The copy that gets stored
                  and rendered publicly is sanitised twice on the way. */}
              <div className="mt-1.5 overflow-hidden rounded-lg border border-gray-200 bg-void p-6 dark:border-gray-700">
                <h1 className="bx-display text-3xl text-ink">{draft.title}</h1>
                <div
                  className="bx-prose"
                  dangerouslySetInnerHTML={{ __html: draft.content }}
                />
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <ImageField
            label="Cover image"
            value={draft.coverImage}
            onChange={(url) => update("coverImage", url)}
            hint="16:9 works best — the cards crop to it."
          />

          <div>
            <label className={LABEL} htmlFor="post-category">
              Category
            </label>
            <input
              id="post-category"
              className={`mt-1.5 ${FIELD}`}
              value={draft.category}
              onChange={(event) => update("category", event.target.value)}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="post-tags">
              Tags
            </label>
            <input
              id="post-tags"
              className={`mt-1.5 ${FIELD}`}
              placeholder="comma, separated"
              value={draft.tags.join(", ")}
              onChange={(event) =>
                update(
                  "tags",
                  event.target.value.split(",").map((tag) => tag.trim()),
                )
              }
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="post-author">
              Author
            </label>
            <input
              id="post-author"
              className={`mt-1.5 ${FIELD}`}
              value={draft.author}
              onChange={(event) => update("author", event.target.value)}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="post-published">
              Publish date
            </label>
            <input
              id="post-published"
              type="datetime-local"
              className={`mt-1.5 ${FIELD}`}
              value={toLocalInput(draft.publishedAt)}
              onChange={(event) =>
                update(
                  "publishedAt",
                  event.target.value ? new Date(event.target.value) : null,
                )
              }
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              A future date schedules the post: it stays off the site until then
              and appears within a minute of it, with no deploy.
            </p>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => update("featured", event.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Featured — leads the blog index
          </label>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              SEO
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              All three fall back to the post itself — title, excerpt and cover
              image — so leaving them blank is a valid choice, not an omission.
            </p>

            <label className={`mt-4 ${LABEL}`} htmlFor="seo-title">
              Meta title
            </label>
            <input
              id="seo-title"
              className={`mt-1.5 ${FIELD}`}
              placeholder={draft.title}
              value={draft.seo.metaTitle}
              onChange={(event) =>
                update("seo", { ...draft.seo, metaTitle: event.target.value })
              }
            />

            <label className={`mt-4 ${LABEL}`} htmlFor="seo-description">
              Meta description
            </label>
            <textarea
              id="seo-description"
              rows={3}
              className={`mt-1.5 ${FIELD} resize-y`}
              placeholder={draft.excerpt}
              value={draft.seo.metaDescription}
              onChange={(event) =>
                update("seo", {
                  ...draft.seo,
                  metaDescription: event.target.value,
                })
              }
            />

            <div className="mt-4">
              <ImageField
                label="Social image"
                value={draft.seo.ogImage}
                onChange={(url) => update("seo", { ...draft.seo, ogImage: url })}
                hint="Falls back to the cover image."
              />
            </div>
          </div>

          <a
            href={`/api/admin/blog/preview?id=${post.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Open the real page
          </a>
          <p className="-mt-3 text-xs text-gray-500 dark:text-gray-400">
            Shows the saved version on the site itself, drafts included. Save
            first.
          </p>
        </aside>
      </div>
    </div>
  );
}
