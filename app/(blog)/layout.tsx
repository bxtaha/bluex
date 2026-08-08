import { LeadFormProvider } from "@/components/providers/lead-form-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { BackToTop } from "@/components/ui/back-to-top";
import { BlogHeader } from "@/components/blog/blog-header";
import { BlogFooter } from "@/components/blog/blog-footer";

/**
 * Blog chrome.
 *
 * A third route group beside `(site)` and `(admin)`, contributing no path
 * segment — `/blog` is still `/blog`. It exists because the marketing layout
 * carries three things a blog cannot use: `SectionProvider`'s observer, which
 * watches homepage section ids that are not on this page; `SectionNav`, the
 * right-edge dock built from those same ids; and `SiteHeader`, whose links are
 * anchors into them. Sharing that layout would give every post a navigation
 * where nothing goes anywhere.
 *
 * What is shared is what should be: Lenis, so scrolling feels the same;
 * `LeadFormProvider`, so the CTA at the end of a post opens the same single
 * dialog the rest of the site opens; and the glass tokens the header is built
 * from.
 *
 * The fluid cursor is left out. It is a 60fps WebGL simulation over the whole
 * viewport, and a page whose job is to be read for six minutes is the one page
 * on this site where that is a cost with no matching benefit.
 */
export default function BlogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="bx-atmosphere" aria-hidden />

      <SmoothScroll />

      <LeadFormProvider>
        <BlogHeader />
        <main className="relative z-10">{children}</main>
        <BlogFooter />
      </LeadFormProvider>

      <BackToTop />
    </>
  );
}
