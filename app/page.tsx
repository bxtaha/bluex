import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { SpeedHook } from "@/components/sections/speed-hook";
import { Services } from "@/components/sections/services";
import { HowItWorks } from "@/components/sections/how-it-works";
import { ExperienceIt } from "@/components/sections/experience-it";
import { WhyBluex } from "@/components/sections/why-bluex";
import { Process } from "@/components/sections/process";
import { Outcomes } from "@/components/sections/outcomes";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";

// Order follows the brief.
export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <SpeedHook />
      <Services />
      <HowItWorks />
      <ExperienceIt />
      <WhyBluex />
      <Process />
      <Outcomes />
      <FinalCta />
      <SiteFooter />
    </>
  );
}
