import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { readRecentPosts, TEASER_MINIMUM } from "@/lib/blog";
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";
import { PostCard } from "@/components/blog/post-card";

/**
 * The homepage teaser.
 *
 * Hides itself entirely below three published posts, which is the brief and is
 * also the right call: a marketing homepage with a "Writing" heading and one
 * lonely card under it advertises that nobody writes here. A section that is
 * absent says nothing; a section that is empty says something bad.
 *
 * The threshold is three rather than one because the layout is a three-column
 * grid — two cards leave a visible hole, and filling it with a placeholder is
 * the same problem wearing a costume.
 *
 * Never throws: this sits between two sections that always render, and a
 * database blip should cost the homepage a section, not the whole page.
 */
export async function BlogTeaser() {
  let posts;
  try {
    posts = await readRecentPosts(TEASER_MINIMUM);
  } catch (error) {
    console.error("[blog] teaser unavailable:", error);
    return null;
  }

  if (posts.length < TEASER_MINIMUM) return null;

  return (
    <section
      id="writing"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Reveal as="p" className="bx-eyebrow">
            Writing
          </Reveal>
          <SplitText
            as="h2"
            className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
          >
            What we&apos;ve learned building this.
          </SplitText>
        </div>

        <Reveal index={1}>
          <Link href="/blog" className="bx-btn bx-btn--ghost bx-btn--sm">
            Read everything
            <ArrowRight className="size-4" strokeWidth={1.8} aria-hidden />
          </Link>
        </Reveal>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          // The stagger travels as `--reveal-i` and is multiplied by a duration
          // in CSS, so three cards need no JS coordination between them.
          <Reveal key={post.id} index={i + 1}>
            <PostCard post={post} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
