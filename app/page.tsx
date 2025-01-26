import { Metadata } from "next";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import AboutSectionOne from "@/components/About1/AboutSectionOne";
import AboutSectionTwo from "@/components/About1/AboutSectionTwo";
import Blog from "@/components/Blog";
import Brands from "@/components/Brands";
import ScrollUp from "@/components/Common/ScrollUp";
import Contact from "@/components/Contact";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import Portfolio from "@/components/Portfolio";

export const metadata: Metadata = {
  title: "BlueX",
  description: "This is Home for Startup Nextjs Template",
  // other metadata
};

export default function Home() {
  return (
    <>
      <ScrollUp />
      <Hero />
      <About />
      <Services />
      <Brands />
      <Portfolio />
      <AboutSectionOne />
      <AboutSectionTwo />
      <Testimonials />
      <Pricing />
      <Blog />
      <Contact />
    </>
  );
}
