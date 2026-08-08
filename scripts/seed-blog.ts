/**
 * Seeds three starter posts.
 *
 * Run with:  npm run seed:blog
 *
 * Three because the homepage teaser hides itself below three published posts —
 * seeding fewer would leave the section invisible and look like a bug.
 *
 * Only writes when `posts` is empty, so re-running it never overwrites anything
 * edited since. To start over, drop the collection first.
 *
 * The content is deliberately real writing rather than lorem ipsum: it is the
 * only way to see whether the measure, the code-block frame and the read-time
 * estimate are right.
 */

import { readFileSync } from "node:fs";
import sanitizeHtml from "sanitize-html";
import { seedPosts, type PostInput } from "../lib/blog-store.ts";

function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value.trim().replace(/^["']|["']$/g, "");
  }
}

/**
 * The same allow-list `lib/blog-content.ts` uses, minimally restated.
 *
 * Importing that module would pull Shiki — and its grammars — into a script
 * whose entire job is three inserts. The store takes the sanitiser as an
 * argument precisely so this can be the cheap one.
 */
function sanitise(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "blockquote", "pre", "code", "a", "img",
      "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading"],
      code: ["class"],
      pre: ["class"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
  });
}

/** Backdated so the three are in a sensible order rather than all "just now". */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

const POSTS: PostInput[] = [
  {
    title: "The fastest way to lose a lead is to answer tomorrow",
    category: "Conversion",
    tags: ["speed to lead", "voice agents"],
    author: "BlueX",
    status: "published",
    featured: true,
    publishedAt: daysAgo(3),
    excerpt: "",
    content: `
<p>Every enquiry form on the internet is a promise: <em>somebody will get back to you</em>. The interesting question is when, and the answer decides whether the enquiry was worth anything.</p>
<h2>The five-minute cliff</h2>
<p>The research on this is unusually consistent. Contact a lead within five minutes and the odds of a real conversation are dramatically better than at thirty. Not a little better — a different business.</p>
<blockquote><p>The curve does not decay gently. It falls off a cliff and then flattens, which is why "we usually reply the same day" and "we usually reply within a week" convert almost identically.</p></blockquote>
<p>What makes this hard is not the intent. Nobody plans to answer slowly. It is that five minutes is shorter than a meeting, a commute, or lunch, and a human rota that covers it costs more than the leads are worth.</p>
<h2>What we actually built</h2>
<p>An agent that places the call itself. The form submits, a webhook fires, and the phone rings while the person is still on the page.</p>
<pre><code class="language-typescript">const lead = await intake(request);

// The call is placed before the thank-you message renders.
await dispatch(lead, { within: minutes(5) });</code></pre>
<p>It qualifies against criteria you set, books into your calendar, and hands over the transcript. When it cannot help, it says so and takes a message — which is still faster than tomorrow.</p>
<h3>The part people ask about</h3>
<p>Yes, callers can tell. No, it does not matter as much as you would expect: being called back in four minutes reads as competence, and competence is most of what an enquiry is shopping for.</p>
`,
    seo: {
      metaTitle: "Speed to lead: why five minutes decides the sale",
      metaDescription:
        "Contact a lead inside five minutes and the odds of a real conversation change completely. Here is why, and what we built to do it automatically.",
      ogImage: "",
    },
  },
  {
    title: "We deleted 3KB of JavaScript and the page got 600ms faster",
    category: "Engineering",
    tags: ["performance", "lcp"],
    author: "BlueX",
    status: "published",
    publishedAt: daysAgo(9),
    excerpt: "",
    content: `
<p>We spent a week trying to make this site's largest contentful paint respectable on a throttled phone. Most of what we tried did nothing. One thing did almost all of it.</p>
<h2>What did not work</h2>
<p>Trimming the webfonts. We cut 44KB of unused weights, which is real bandwidth and exactly zero milliseconds of LCP — the faces are <code>display: swap</code>, so text paints in a fallback and the download never blocks anything.</p>
<h2>What did</h2>
<p>Deleting a GSAP plugin that was registered on every visit and never called.</p>
<pre><code class="language-javascript">// Registered at module scope. Never used.
gsap.registerPlugin(SplitText);</code></pre>
<p>Three kilobytes of transfer, and roughly 600 milliseconds of main-thread time on a mid-range phone at 4× CPU throttle. Parsing and executing JavaScript is expensive in a way that downloading it is not, and a plugin that does nothing still has to be parsed before the page can do anything.</p>
<h2>The lesson we keep relearning</h2>
<ul>
<li>Measure the previous commit, not your memory of it.</li>
<li>Five runs minimum. A single "after" number was 600ms off the median once.</li>
<li>Look for unused work before optimising used work.</li>
</ul>
<p>Median LCP went from 3028ms to 2500ms. Everything else we tried is still in the branch, unmerged.</p>
`,
    seo: { metaTitle: "", metaDescription: "", ogImage: "" },
  },
  {
    title: "A template is a decision somebody else made about your business",
    category: "Design",
    tags: ["websites", "process"],
    author: "BlueX",
    status: "published",
    publishedAt: daysAgo(18),
    excerpt: "",
    content: `
<p>Templates are not bad. They are opinionated, and the opinion belongs to somebody who has never met your customers.</p>
<h2>Where it shows</h2>
<p>Usually in the order of things. A template decides that testimonials come before pricing, that your services are a three-column grid, that the hero is a photograph with a sentence over it. Those are answers to questions about someone else's business.</p>
<p>The cost is rarely visible. Nothing looks broken. The page just asks people to care about the wrong thing first, and a small fraction of them leave.</p>
<h2>What we do instead</h2>
<ol>
<li>Work out what the visitor is actually deciding.</li>
<li>Put the thing that decides it above everything else.</li>
<li>Cut whatever is left that does not help.</li>
</ol>
<p>It takes longer than picking a theme. It takes considerably less time than rebuilding in a year.</p>
`,
    seo: { metaTitle: "", metaDescription: "", ogImage: "" },
  },
];

loadEnvLocal();

try {
  const inserted = await seedPosts(POSTS, sanitise);
  console.log(
    inserted > 0
      ? `Inserted ${inserted} posts.`
      : "posts already has documents — left untouched.",
  );
} catch (error) {
  console.error("Seeding failed:", error);
  process.exit(1);
}

process.exit(0);
