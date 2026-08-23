/* Server Component: it renders client children (Reveal, SplitText) but has
   no state, effects or handlers of its own, so none of it needs to ship to
   the browser. */
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";

/**
 * Outcome framing rather than performance claims.
 *
 * Deliberately no percentages or client counts: inventing them on an agency's
 * own site is a liability, and unsourced numbers are the first thing a serious
 * buyer checks. Each entry is written so a real figure can replace the `stat`
 * line as soon as there is one to report.
 */
const OUTCOMES = [
  {
    stat: "Never again",
    title: "A lead goes unanswered",
    body: "Every enquiry gets a call, including the ones that arrive at 2am on a Sunday. Nothing sits in an inbox until Monday.",
  },
  {
    stat: "First",
    title: "Voice they hear is yours",
    body: "Most businesses reply in hours. Reaching someone while they are still comparing options is the difference between a conversation and a voicemail.",
  },
  {
    stat: "Every call",
    title: "Written down and scored",
    body: "Transcript, qualification and outcome for each one. You stop guessing which leads are worth chasing.",
  },
  {
    stat: "Zero",
    title: "Hours spent chasing",
    body: "Your calendar fills with meetings that are already qualified, so your time goes to the pitch instead of the follow-up.",
  },
];

export function Outcomes() {
  return (
    <section
      id="outcomes"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <Reveal as="p" className="bx-eyebrow">
          What you get
        </Reveal>
        <SplitText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          Your site stops being a brochure.
        </SplitText>
        <Reveal
          as="p"
          index={1}
          className="mt-5 text-base leading-relaxed text-ink-muted"
        >
          It becomes the thing that answers, qualifies and books — the best
          salesperson you have, working every hour you are not.
        </Reveal>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {OUTCOMES.map((outcome, i) => (
          <Reveal
            as="div"
            key={outcome.title}
            index={i + 2}
            className="bx-card bx-hairline bx-lift p-7 sm:p-8"
          >
            <p className="bx-display text-2xl text-electric sm:text-3xl">
              {outcome.stat}
            </p>
            {/* Styled text, not a heading. Four card labels under one section
                title are not four subsections — marking them up as `h3` put
                them in the document outline as if they were, which is how the
                page ended up with 46 headings and no legible structure. */}
            <p className="bx-display mt-2 text-lg text-ink sm:text-xl">
              {outcome.title}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              {outcome.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
