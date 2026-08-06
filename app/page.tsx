import { Hero } from "@/components/sections/hero";
import { TrustStrip } from "@/components/sections/trust-strip";
import { Services } from "@/components/sections/services";
import { HowItWorks } from "@/components/sections/how-it-works";
import { WhyBluex } from "@/components/sections/why-bluex";
import { Process } from "@/components/sections/process";
import { Outcomes } from "@/components/sections/outcomes";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";

// Order follows the brief. Sections 3 (speed hook) and 6 ("experience it")
// are not built yet and slot in after TrustStrip and HowItWorks respectively.
export default function Home() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Services />
      <HowItWorks />
      <WhyBluex />
      <Process />
      <Outcomes />
      <FinalCta />
      <SiteFooter />
    </>
  );
}
