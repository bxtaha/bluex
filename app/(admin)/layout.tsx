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
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
          {children}
        </div>
      </AdminThemeProvider>
    </>
  );
}
