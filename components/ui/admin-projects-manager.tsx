"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { ImageField } from "@/components/ui/image-field";
import type { Project, Testimonial } from "@/lib/project-store";

const FIELD =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100";
const LABEL =
  "block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400";

const EMPTY_TESTIMONIAL: Testimonial = { quote: "", author: "", role: "" };

/**
 * Selected-work editor.
 *
 * Same shape as the FAQ manager, deliberately — edits held locally and saved
 * per row, drag-to-reorder with arrow buttons beside it as the keyboard path,
 * and the whole id sequence written on every reorder. Two editors on one
 * dashboard that behave differently is a worse cost than a little repetition.
 */
export function AdminProjectsManager({
  initial,
  initialFootnote,
}: {
  initial: Project[];
  initialFootnote: string;
}) {
  const [projects, setProjects] = useState<Project[]>(initial);
  const [footnote, setFootnote] = useState(initialFootnote);
  const [footnoteDirty, setFootnoteDirty] = useState(false);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  function patchLocal(id: string, patch: Partial<Project>) {
    setProjects((current) =>
      current.map((project) =>
        project.id === id ? { ...project, ...patch } : project,
      ),
    );
    setDirty((current) => ({ ...current, [id]: true }));
  }

  async function send(url: string, init: RequestInit) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      setError(
        typeof data.message === "string" ? data.message : "Something went wrong.",
      );
      return { ok: false, data };
    }
    setError(null);
    return { ok: true, data };
  }

  async function save(project: Project) {
    setBusy(project.id);
    const { ok, data } = await send(`/api/admin/projects/${project.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        clientName: project.clientName,
        description: project.description,
        url: project.url,
        screenshot: project.screenshot,
        tags: project.tags,
        year: project.year,
        featured: project.featured,
        visible: project.visible,
        testimonial: project.testimonial,
      }),
    });
    if (ok) {
      // The server's copy: the URL was normalised (a missing scheme added, or
      // a non-http one dropped), and a testimonial missing its author was
      // discarded rather than stored half-filled.
      setProjects((current) =>
        current.map((p) => (p.id === project.id ? (data.project as Project) : p)),
      );
      setDirty((current) => ({ ...current, [project.id]: false }));
    }
    setBusy(null);
  }

  async function addProject() {
    setBusy("new");
    const { ok, data } = await send("/api/admin/projects", {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (ok) setProjects((current) => [...current, data.project as Project]);
    setBusy(null);
  }

  async function remove(project: Project) {
    if (
      !window.confirm(`Delete "${project.clientName}"? This cannot be undone.`)
    ) {
      return;
    }
    setBusy(project.id);
    const { ok } = await send(`/api/admin/projects/${project.id}`, {
      method: "DELETE",
    });
    if (ok) setProjects((current) => current.filter((p) => p.id !== project.id));
    setBusy(null);
  }

  async function persistOrder(next: Project[]) {
    setProjects(next);
    setBusy("order");
    await send("/api/admin/projects/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: next.map((project) => project.id) }),
    });
    setBusy(null);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= projects.length) return;
    const next = [...projects];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;

    const from = projects.findIndex((p) => p.id === dragId);
    const to = projects.findIndex((p) => p.id === targetId);
    if (from === -1 || to === -1) return;

    const next = [...projects];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    void persistOrder(next);
  }

  async function saveFootnote() {
    setBusy("footnote");
    const { ok, data } = await send("/api/admin/projects", {
      method: "PATCH",
      body: JSON.stringify({ footnote }),
    });
    if (ok) {
      setFootnote(data.footnote as string);
      setFootnoteDirty(false);
    }
    setBusy(null);
  }

  const visibleCount = projects.filter((p) => p.visible).length;

  return (
    <div className="max-w-4xl">
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300"
        >
          {error}
        </p>
      )}

      <div className="space-y-4">
        {projects.map((project, index) => (
          <div
            key={project.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => onDrop(project.id)}
            className={`rounded-xl border bg-white p-5 shadow-sm transition-colors dark:bg-gray-900 ${
              dragId === project.id
                ? "border-blue-400 opacity-60"
                : "border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {/* Only the handle is draggable, so selecting text in the fields
                  does not start a drag. */}
              <span
                draggable
                onDragStart={() => setDragId(project.id)}
                onDragEnd={() => setDragId(null)}
                aria-hidden
                title="Drag to reorder"
                className="cursor-grab rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-800"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="mr-auto font-mono text-xs text-gray-400">
                {String(index + 1).padStart(2, "0")}
              </span>

              <button
                type="button"
                onClick={() => patchLocal(project.id, { featured: !project.featured })}
                aria-pressed={project.featured}
                title={project.featured ? "Featured" : "Not featured"}
                aria-label={project.featured ? "Featured" : "Not featured"}
                className={`rounded-lg border p-2 transition-colors ${
                  project.featured
                    ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-400"
                    : "border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <Star
                  className={`h-4 w-4 ${project.featured ? "fill-current" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() => patchLocal(project.id, { visible: !project.visible })}
                aria-pressed={project.visible}
                title={project.visible ? "Visible on the site" : "Hidden from the site"}
                aria-label={project.visible ? "Visible on the site" : "Hidden from the site"}
                className={`rounded-lg border p-2 transition-colors ${
                  project.visible
                    ? "border-green-300 bg-green-50 text-green-600 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-400"
                    : "border-gray-200 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                {project.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0 || busy !== null}
                aria-label="Move up"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === projects.length - 1 || busy !== null}
                aria-label="Move down"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(project)}
                disabled={busy !== null}
                aria-label={`Delete ${project.clientName}`}
                className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor={`name-${project.id}`}>
                  Client name
                </label>
                <input
                  id={`name-${project.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  value={project.clientName}
                  onChange={(e) =>
                    patchLocal(project.id, { clientName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={LABEL} htmlFor={`url-${project.id}`}>
                  Live URL
                </label>
                <input
                  id={`url-${project.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  placeholder="newstartoys.com"
                  value={project.url}
                  onChange={(e) => patchLocal(project.id, { url: e.target.value })}
                />
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <code>https://</code> is added on save if you leave it off.
                  Anything that is not a web address is discarded rather than
                  stored.
                </p>
              </div>
            </div>

            <label className={`mt-4 ${LABEL}`} htmlFor={`desc-${project.id}`}>
              One-line description
            </label>
            <textarea
              id={`desc-${project.id}`}
              rows={2}
              className={`mt-1.5 ${FIELD} resize-y`}
              value={project.description}
              onChange={(e) =>
                patchLocal(project.id, { description: e.target.value })
              }
            />

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <div>
                <label className={LABEL} htmlFor={`tags-${project.id}`}>
                  Tags
                </label>
                <input
                  id={`tags-${project.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  placeholder="E-commerce, Manufacturing, Custom build"
                  list="project-tags"
                  value={project.tags.join(", ")}
                  onChange={(e) =>
                    patchLocal(project.id, {
                      tags: e.target.value.split(",").map((tag) => tag.trim()),
                    })
                  }
                />
              </div>
              <div>
                <label className={LABEL} htmlFor={`year-${project.id}`}>
                  Year
                </label>
                <input
                  id={`year-${project.id}`}
                  className={`mt-1.5 ${FIELD}`}
                  placeholder="2025"
                  value={project.year}
                  onChange={(e) => patchLocal(project.id, { year: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <ImageField
                label="Screenshot"
                value={project.screenshot}
                onChange={(url) => patchLocal(project.id, { screenshot: url })}
                hint="Shown inside a browser frame, cropped to 16:10 from the top — capture the full page, the header is what matters."
              />
            </div>

            <details className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Testimonial {project.testimonial ? "· set" : "· none"}
              </summary>

              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                A quote needs an author to be worth printing — an unattributed
                one is you praising your own work. Leave either blank and the
                card renders without a quote block rather than with an empty
                one.
              </p>

              <label className={`mt-4 ${LABEL}`} htmlFor={`quote-${project.id}`}>
                Quote
              </label>
              <textarea
                id={`quote-${project.id}`}
                rows={3}
                className={`mt-1.5 ${FIELD} resize-y`}
                value={project.testimonial?.quote ?? ""}
                onChange={(e) =>
                  patchLocal(project.id, {
                    testimonial: {
                      ...(project.testimonial ?? EMPTY_TESTIMONIAL),
                      quote: e.target.value,
                    },
                  })
                }
              />

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor={`qauthor-${project.id}`}>
                    Author
                  </label>
                  <input
                    id={`qauthor-${project.id}`}
                    className={`mt-1.5 ${FIELD}`}
                    value={project.testimonial?.author ?? ""}
                    onChange={(e) =>
                      patchLocal(project.id, {
                        testimonial: {
                          ...(project.testimonial ?? EMPTY_TESTIMONIAL),
                          author: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor={`qrole-${project.id}`}>
                    Role
                  </label>
                  <input
                    id={`qrole-${project.id}`}
                    className={`mt-1.5 ${FIELD}`}
                    placeholder="Director, New Star Toys"
                    value={project.testimonial?.role ?? ""}
                    onChange={(e) =>
                      patchLocal(project.id, {
                        testimonial: {
                          ...(project.testimonial ?? EMPTY_TESTIMONIAL),
                          role: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </details>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => save(project)}
                disabled={!dirty[project.id] || busy !== null}
                className="flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === project.id && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                )}
                Save
              </button>
              {dirty[project.id] && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  Unsaved changes
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Existing tags offered as suggestions, so they stay consistent without
          being a fixed list. */}
      <datalist id="project-tags">
        {[...new Set(projects.flatMap((p) => p.tags))].map((tag) => (
          <option key={tag} value={tag} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={addProject}
        disabled={busy !== null}
        className="mt-4 flex h-11 items-center gap-2 rounded-lg border border-dashed border-gray-300 px-5 text-sm font-medium text-gray-600 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
      >
        <Plus className="h-4 w-4" /> Add project
      </button>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <label className={LABEL} htmlFor="projects-footnote">
          Caption under the cards
        </label>
        <input
          id="projects-footnote"
          className={`mt-1.5 ${FIELD}`}
          value={footnote}
          onChange={(e) => {
            setFootnote(e.target.value);
            setFootnoteDirty(true);
          }}
        />
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          Write <code>{"{count}"}</code> and it is replaced with the number of
          visible projects — spelled out up to twelve. Currently{" "}
          <strong>{visibleCount}</strong>. The default copy says &ldquo;Three&rdquo;,
          which stops being true the moment you add a fourth.
        </p>

        <button
          type="button"
          onClick={saveFootnote}
          disabled={!footnoteDirty || busy !== null}
          className="mt-4 flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "footnote" && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          )}
          Save caption
        </button>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        New projects start hidden. Drag the handle or use the arrows to
        reorder — both save immediately. The fields save when you press Save.
      </p>
    </div>
  );
}
