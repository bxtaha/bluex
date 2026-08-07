import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin-auth";

/**
 * Sign out. POST rather than GET so a link or an image on another site cannot
 * trigger it just by being loaded.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
