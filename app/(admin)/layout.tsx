import type { Metadata } from "next";
import {
  ADMIN_THEME_SCRIPT,
  AdminThemeProvider,
} from "@/components/providers/admin-theme";

export const metadata: Metadata = {
  title: "Admin — BlueX",
  // An admin area has no business in an index. `nofollow` too, so a crawler
  // that reaches the login page does not walk into the rest of it.
  robots: { index: false, follow: false },
};

/**
 * The admin shell.
 *
 * Deliberately almost nothing: the root layout supplies `<html>` and `<body>`,
 * and everything that made the marketing site itself now lives in `(site)`, so
 * there is no header, no Lenis, no cursor and no dock to strip out here. The
 * only job left is to cover the body's near-black background, which is the
 * marketing palette and not this one.
 */
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Before paint, not in an effect — see ADMIN_THEME_SCRIPT. */}
      <script dangerouslySetInnerHTML={{ __html: ADMIN_THEME_SCRIPT }} />
      <AdminThemeProvider>
        {/* Not translatable, and this is load-bearing rather than a preference.
            Chrome's page translation rewrites text nodes in place — it wraps
            them in `<font>` elements of its own — and React still holds
            references to the originals. The next update that inserts a sibling
            before one of those nodes calls `insertBefore` against a node that is
            no longer a child of its parent, which throws and takes the whole
            dashboard down; uploading an image did exactly that. `translate="no"`
            is what Chrome reads, `notranslate` is what the Google Translate
            extension reads, and the admin area is staff-only English anyway. */}
        {/* `bx-admin` is the scoping hook for the scrollbar treatment in
            globals.css — every scroll container inside the admin area, plus the
            document's own bar, which the marketing site hides for Lenis and an
            admin tool has no reason to be without. */}
        <div
          translate="no"
          className="bx-admin notranslate min-h-screen bg-gray-50 dark:bg-gray-950"
        >
          {children}
        </div>
      </AdminThemeProvider>
    </>
  );
}
