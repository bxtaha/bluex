import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { requireAdmin } from "@/lib/admin-guard";

/**
 * Image upload, via Cloudinary.
 *
 * Images do not go in MongoDB. A document store is a poor CDN — every read
 * pulls the bytes through the app server, the 16MB document ceiling is a real
 * limit for a cover image, and none of it can be cached at an edge or resized
 * on delivery. Cloudinary does all three, and `coverImageUrl` in
 * `lib/blog-format.ts` uses its transformation segment to ask for the right
 * width per slot.
 *
 * The compression happens in the browser before the bytes get here — see
 * `components/ui/image-field.tsx`. Doing it server-side would mean `sharp`, a
 * native dependency, to save bandwidth that has already been spent.
 *
 * Signed rather than unsigned. An unsigned upload preset is a public write
 * endpoint on your Cloudinary account: anyone who reads the preset name out of
 * the page can fill the bucket. The signature is computed here, from a secret
 * that never leaves the server.
 */

/** Cloudinary's own limit for a single unchunked upload is 100MB; this is ours. */
const MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

function cloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: process.env.CLOUDINARY_FOLDER || "bluex/blog",
  };
}

/**
 * Cloudinary's signature: the signed parameters, sorted by key, joined as a
 * query string, with the API secret appended, then SHA-1.
 *
 * Only the parameters actually sent may be included, and every one of them must
 * be — a mismatch either way is rejected as an invalid signature with no
 * indication of which key was wrong.
 */
function sign(params: Record<string, string>, apiSecret: string): string {
  const canonical = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(canonical + apiSecret).digest("hex");
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const config = cloudinaryConfig();
  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Image hosting is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET — or paste an image URL instead.",
      },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Malformed upload." },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json(
      { ok: false, message: "No file was sent." },
      { status: 400 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { ok: false, message: "That file type is not an image we accept." },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "That image is over 10MB even after compression." },
      { status: 413 },
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signed = { folder: config.folder, timestamp };

  const body = new FormData();
  body.set("file", file);
  body.set("api_key", config.apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", config.folder);
  body.set("signature", sign(signed, config.apiSecret));

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      { method: "POST", body, signal: AbortSignal.timeout(60_000) },
    );
    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      console.error("[upload] cloudinary rejected:", data?.error ?? response.status);
      return NextResponse.json(
        { ok: false, message: "The image host rejected that upload." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: data.secure_url as string,
      width: data.width as number,
      height: data.height as number,
    });
  } catch (error) {
    console.error("[upload] failed:", error);
    return NextResponse.json(
      { ok: false, message: "Could not reach the image host." },
      { status: 502 },
    );
  }
}
