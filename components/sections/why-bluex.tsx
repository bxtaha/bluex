/* Server Component: it renders client children (Reveal, SplitText) but has
   no state, effects or handlers of its own, so none of it needs to ship to
   the browser. */
import { Reveal } from "@/components/motion/reveal";
import { SplitText } from "@/components/motion/split-text";

const REASONS = [
  {
    title: "Speed is the product",
    body: "Not a feature we added. The whole system is built around reaching a lead before anyone else does, because that is what decides who wins the job.",
    icon: (
      <path
        d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Written, not assembled",
    body: "No templates, no page builders, no theme you share with a thousand other businesses. Your site is built for your offer and nobody else's.",
    icon: (
      <path
        d="m8 6-6 6 6 6m8-12 6 6-6 6"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "You talk to the developer",
    body: "Not an account manager relaying messages to a subcontractor. The person who builds it is the person you brief, which is why changes take hours instead of weeks.",
    icon: (
      <path
        d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm8 9a8 8 0 0 0-16 0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Markets nobody is serving properly",
    body: "The Gulf, Canada and Australia have serious businesses running on software that does not match their ambition. That gap is the entire opportunity.",
    icon: (
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.5-2.4 3.75-5.4 3.75-9S14.5 5.4 12 3M12 21c-2.5-2.4-3.75-5.4-3.75-9S9.5 5.4 12 3M3.4 9h17.2M3.4 15h17.2"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function WhyBluex() {
  return (
    <section
      id="why-bluex"
      className="relative mx-auto max-w-[100rem] px-6 py-24 sm:px-10 md:py-32 lg:px-16"
    >
      <div className="max-w-2xl">
        <Reveal as="p" className="bx-eyebrow">
          Why BlueX
        </Reveal>
        <SplitText
          as="h2"
          className="bx-display mt-3 text-[clamp(2rem,5vw,3.75rem)] text-ink"
        >
          Four reasons this works.
        </SplitText>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {REASONS.map((reason, i) => (
          <Reveal
            as="div"
            key={reason.title}
            index={i + 1}
            className="bx-card bx-hairline bx-lift flex flex-col p-7"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl bg-electric/12 text-electric ring-1 ring-electric/20"
              aria-hidden
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5">
                {reason.icon}
              </svg>
            </span>
            {/* Card label rather than a subsection — see `outcomes.tsx`. */}
            <p className="bx-display mt-5 text-lg text-ink sm:text-xl">
              {reason.title}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              {reason.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
