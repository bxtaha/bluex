import type { CSSProperties } from "react";
import { ArrowUpRight, Quote } from "lucide-react";
import { PortfolioSlider } from "@/components/sections/portfolio-slider";
import { coverImageUrl } from "@/lib/blog-format";
import type { Project } from "@/lib/project-store";

/**
 * The project cards.
 *
 * These used to be full-width editorial rows alternating down the page. They
 * are now panels on a horizontal track that the pinned section scrubs sideways,
 * which is the same treatment "What we build" gets — with the direction
 * reversed, so the cards travel left to right.
 *
 * The argument for rows was that they survive any project count where a grid
 * does not: three items leave a hole in a grid, five leave two, and every fix
 * for that is a placeholder card. A track keeps that property for the same
 * reason — it has no columns to leave holes in — so three projects work, four
 * work, twenty work. The count only changes how far the track travels.
 *
 * Still a server component. Every interaction here — the lift, the glow, the
 * slow zoom on the screenshot — is CSS on `:hover`, and the only JavaScript the
 * section ships is the scrub itself, which lives in the client shell these
 * cards are passed into.
 */
export function PortfolioCards({
  projects,
  footnote,
}: {
  projects: Project[];
  footnote: string;
}) {
  return (
    <PortfolioSlider footnote={footnote}>
      {projects.map((project, i) => (
        <article
          key={project.id}
          className="bx-work bx-work--card bx-card bx-hairline"
          /* Lays the track out back to front so a rightward-travelling track
             still meets project 1 first. A custom property rather than the
             `order` property itself, because `.bx-track--mirror` only applies
             it while the scrub is live — without the pin the natural order is
             the correct one. */
          style={{ "--track-order": projects.length - i } as CSSProperties}
        >
          <ProjectCard project={project} />
        </article>
      ))}
    </PortfolioSlider>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const shot = coverImageUrl(project.screenshot, 1400);
  const host = hostOf(project.url);

  return (
    <div className="bx-work__inner">
      <div className="bx-work__media">
        {/* The browser frame. Decorative, and `aria-hidden` for that reason —
            a screen reader announcing "three circles" before every project
            would be noise, and the frame carries no information the client
            name and the link do not. */}
        <div className="bx-work__frame">
          <div className="bx-work__chrome" aria-hidden>
            <span className="bx-work__dot" />
            <span className="bx-work__dot" />
            <span className="bx-work__dot" />
            {host && <span className="bx-work__url">{host}</span>}
          </div>

          <div className="bx-work__shot">
            {shot ? (
              /* eslint-disable-next-line @next/next/no-img-element -- an
                 admin-supplied URL that may point at any host, which
                 `next/image` refuses unless it is allow-listed at build time.
                 See `coverImageUrl`: Cloudinary resizes on delivery. */
              <img
                src={shot}
                alt={`Screenshot of the ${project.clientName} website`}
                loading="lazy"
                decoding="async"
                className="bx-work__image"
              />
            ) : (
              // A project with no screenshot yet still holds the frame's shape,
              // so a half-filled admin panel does not collapse the layout.
              <div className="bx-work__placeholder" aria-hidden />
            )}
          </div>
        </div>
      </div>

      <div className="bx-work__body">
        {project.year && <p className="bx-eyebrow">{project.year}</p>}

        <h3 className="bx-display mt-2 text-[clamp(1.35rem,2.4vw,2.25rem)] text-ink">
          {project.clientName}
        </h3>

        {project.description && (
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            {project.description}
          </p>
        )}

        {project.tags.length > 0 && (
          <ul className="bx-work__tags">
            {project.tags.map((tag) => (
              <li key={tag} className="bx-work__tag">
                {tag}
              </li>
            ))}
          </ul>
        )}

        {/* Rendered only when there is a quote *and* someone who said it — see
            `toTestimonial`. No empty quote blocks. */}
        {project.testimonial && (
          <figure className="bx-work__quote">
            <Quote className="bx-work__quote-mark" aria-hidden />
            <blockquote>
              <p>{project.testimonial.quote}</p>
            </blockquote>
            <figcaption>
              <span className="bx-work__quote-author">
                {project.testimonial.author}
              </span>
              {project.testimonial.role && (
                <span className="bx-work__quote-role">
                  {project.testimonial.role}
                </span>
              )}
            </figcaption>
          </figure>
        )}

        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bx-work__cta"
          >
            Visit site
            <ArrowUpRight className="size-4" strokeWidth={1.8} aria-hidden />
            <span className="sr-only">
              — {project.clientName} (opens in a new tab)
            </span>
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * The address as a browser would show it in a URL bar: host only, no scheme,
 * no `www.`. Falls back to nothing rather than to the raw string — a malformed
 * URL printed into the frame would look like a typo on our side.
 */
function hostOf(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
