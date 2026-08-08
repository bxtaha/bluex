import { ArrowUpRight, Quote } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { coverImageUrl } from "@/lib/blog-format";
import type { Project } from "@/lib/project-store";

/**
 * The portfolio rows.
 *
 * Editorial, not a grid: each project is a full-width row that alternates
 * image-left / image-right down the page. The alternation is decided by index
 * parity in CSS-friendly markup rather than by two different components, which
 * is what makes it survive an odd number of projects — with a grid, three
 * items leave a hole and five leave two, and every "fix" for that is a
 * placeholder card. Rows have no such failure mode: three works, four works,
 * twenty works.
 *
 * Still a server component. Every interaction here — the lift, the glow, the
 * slow zoom on the screenshot — is CSS on `:hover`, and the reveal is the
 * site's shared observer setting one attribute. Nothing about this section
 * needs to ship JavaScript, and the section that exists to prove the sites are
 * fast should not be the one that slows the page down.
 */
export function PortfolioRows({
  projects,
  footnote,
}: {
  projects: Project[];
  footnote: string;
}) {
  return (
    <section
      id="work"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <Reveal as="p" className="bx-eyebrow">
          Selected work
        </Reveal>
        <SplitText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          Sites that are live right now.
        </SplitText>
        <Reveal
          as="p"
          index={1}
          className="mt-5 text-base leading-relaxed text-ink-muted sm:text-lg"
        >
          Every one of these is in production. Click through and see for
          yourself.
        </Reveal>
      </div>

      <div className="mt-16 space-y-8 md:mt-20 md:space-y-16">
        {projects.map((project, i) => (
          <Reveal
            as="div"
            key={project.id}
            index={i + 2}
            className="bx-work"
            // Parity drives the column order in CSS. An attribute rather than a
            // class so the rule reads as "every other row" instead of the
            // component having to know what "flipped" means.
            data-flip={i % 2 === 1}
          >
            <ProjectRow project={project} />
          </Reveal>
        ))}
      </div>

      <Reveal
        as="p"
        index={projects.length + 2}
        className="mt-14 text-sm text-ink-muted"
      >
        {footnote}
      </Reveal>
    </section>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const shot = coverImageUrl(project.screenshot, 1400);
  const host = hostOf(project.url);

  return (
    <article className="bx-work__inner">
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

        <h3 className="bx-display mt-2 text-[clamp(1.75rem,3.5vw,2.75rem)] text-ink">
          {project.clientName}
        </h3>

        {project.description && (
          <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
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
    </article>
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
