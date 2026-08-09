import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import {
  DEFAULT_FOOTNOTE,
  DEFAULT_PROJECTS,
  readFootnoteUncached,
  readVisibleProjectsUncached,
  withFallbackIds,
  type Project,
} from "./project-store.ts";

/**
 * The Next-facing half of the portfolio.
 *
 * Tag-cached with no expiry, like pricing and unlike the blog: a
 * project becomes visible when an admin makes it visible and at no other time,
 * so invalidating on save is a complete answer and the homepage keeps being
 * served from a prerender.
 */

export const PROJECTS_TAG = "projects";

export {
  DEFAULT_FOOTNOTE,
  DEFAULT_PROJECTS,
  createProject,
  deleteProject,
  listAllProjects,
  normaliseUrl,
  renderFootnote,
  reorderProjects,
  seedProjects,
  updateFootnote,
  updateProject,
  type Project,
  type ProjectInput,
  type Testimonial,
} from "./project-store.ts";

const readVisibleProjects = unstable_cache(
  readVisibleProjectsUncached,
  ["projects-visible"],
  { tags: [PROJECTS_TAG] },
);

const readFootnote = unstable_cache(readFootnoteUncached, ["projects-footnote"], {
  tags: [PROJECTS_TAG],
});

/**
 * Both calls, for the reason written up in `lib/pricing.ts`: the tag drops the
 * cached read, `revalidatePath` marks the prerendered `/` stale. Either alone
 * looks like it works and does not.
 */
export function publishProjects(): void {
  revalidateTag(PROJECTS_TAG, "max");
  revalidatePath("/");
}

/** What the public section renders. Never throws — see DEFAULT_PROJECTS. */
export async function getVisibleProjects(): Promise<Project[]> {
  try {
    const projects = await readVisibleProjects();
    return projects.length > 0 ? projects : withFallbackIds(DEFAULT_PROJECTS);
  } catch (error) {
    console.error("[projects] falling back to defaults:", error);
    return withFallbackIds(DEFAULT_PROJECTS);
  }
}

export async function getFootnote(): Promise<string> {
  try {
    return await readFootnote();
  } catch {
    return DEFAULT_FOOTNOTE;
  }
}
