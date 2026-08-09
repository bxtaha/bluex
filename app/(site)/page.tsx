import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { SpeedHook } from "@/components/sections/speed-hook";
import { Services } from "@/components/sections/services";
import { HowItWorks } from "@/components/sections/how-it-works";
import { ExperienceIt } from "@/components/sections/experience-it";
import { Process } from "@/components/sections/process";
import { Outcomes } from "@/components/sections/outcomes";
import { WhyBluex } from "@/components/sections/why-bluex";
import { Portfolio } from "@/components/sections/portfolio";
import { Pricing } from "@/components/sections/pricing";
import { Faq } from "@/components/sections/faq";
import { BlogTeaser } from "@/components/sections/blog-teaser";
import { Contact } from "@/components/sections/contact";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";

/**
 * The homepage revalidates on a timer as well as on demand.
 *
 * Pricing, FAQ and contact only change when an admin changes them, and each
 * invalidates its own cache on save. The blog teaser adds a second way for this
 * page to go stale: a post scheduled for Tuesday becomes public on Tuesday with
 * nobody touching anything. A minute is the ceiling on how long the homepage
 * can disagree with the blog about what exists.
 */
export const revalidate = 60;

/**
 * Order follows the brief, with one deliberate departure: "Why BlueX" now sits
 * after "What you get" rather than before the process. The four reasons read as
 * an answer to the outcome the reader has just been shown, instead of a claim
 * they have to take on trust.
 *
 * `SECTIONS` in `section-provider.tsx` mirrors this order and must be changed
 * with it — the observer picks the topmost section in its band by index, so a
 * list out of document order makes both navigations point at the wrong place.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <SpeedHook />
      <Services />
      <HowItWorks />
      <ExperienceIt />
      <Process />
      <Outcomes />
      <WhyBluex />
      <Portfolio />
      <Pricing />
      <Faq />
      <BlogTeaser />
      <Contact />
      <FinalCta />
      <SiteFooter />
    </>
  );
}
