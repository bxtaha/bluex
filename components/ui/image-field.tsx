"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

/**
 * Compresses an image in the browser before it is uploaded.
 *
 * Client-side rather than on the server, and the reason is bandwidth rather
 * than CPU: a 6MB phone photo re-encoded here goes over the wire once, at
 * 400KB. Compressing it server-side would mean uploading the 6MB first, then
 * pulling in `sharp` — a native binary that has to match the deployment's libc,
 * and this ships in a container — to save nothing that had not already been
 * spent.
 *
 * Two formats are passed through untouched. A GIF loses its animation the
 * moment it is drawn onto a canvas, and an SVG is already the smallest it will
 * be. Anything else becomes WebP.
 */
const MAX_WIDTH = 1600;
const QUALITY = 0.82;
const PASSTHROUGH = new Set(["image/gif", "image/svg+xml"]);

async function compress(file: File): Promise<File> {
  if (PASSTHROUGH.has(file.type)) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    // A small, already-optimised PNG can come out *larger* as WebP. Keeping
    // whichever is smaller means this can never make things worse.
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
    });
  } catch {
    // Canvas is unavailable, or the file is not decodable here. Upload the
    // original and let the server decide.
    return file;
  }
}

/**
 * An image URL, filled either by uploading or by pasting.
 *
 * Both, deliberately. Uploading needs Cloudinary configured; pasting needs
 * nothing. Without the second path the whole editor is unusable on any
 * deployment where the image host has not been set up yet, which is this one.
 */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", await compress(file));

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.message ?? "Upload failed.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
      // Cleared so choosing the same file twice in a row fires `change` again.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </span>

      {value && (
        <div className="relative mt-2 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element -- an arbitrary
              admin-supplied URL, which `next/image` refuses unless the host is
              allow-listed at build time. */}
          <img
            src={value}
            alt=""
            className="block max-h-56 w-full bg-gray-100 object-contain dark:bg-gray-950"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Remove image"
            className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden />
          )}
          {busy ? "Uploading…" : "Upload"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />

        <input
          type="url"
          value={value}
          placeholder="…or paste an image URL"
          onChange={(event) => onChange(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        />
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
    </div>
  );
}
