import Image from "next/image";
import { GlassButton } from "@/components/ui/glass-button";

export function TopBar() {
  return (
    <header className="w-full pt-4 pb-3 sm:py-3 [@media(max-height:520px)]:py-2!">
      {/* stacked on mobile (CTA first, then a centred logo); single row from sm
          up. `flex-col-reverse` flips the visual order only, so the logo stays
          first in the DOM for reading/tab order. */}
      {/* short viewports (landscape phones) go back to a single row — a
          stacked header would eat most of a 320px-tall screen */}
      <div className="mx-auto flex flex-col-reverse items-center gap-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-10 lg:px-20 [@media(max-height:520px)]:flex-row! [@media(max-height:520px)]:justify-between! [@media(max-height:520px)]:gap-3!">
        <Image
          src="/bluex-logo.png"
          alt="BlueX"
          width={525}
          height={271}
          priority
          className="h-20 w-auto sm:h-16 [@media(max-height:520px)]:h-10!"
        />

        <GlassButton className="w-full [&>button]:w-full sm:w-auto sm:[&>button]:w-auto [@media(max-height:520px)]:w-auto! [@media(max-height:520px)]:[&>button]:w-auto! [@media(max-height:520px)]:[&_span]:px-4! [@media(max-height:520px)]:[&_span]:py-2! [@media(max-height:520px)]:[&_span]:text-sm!">
          Get a Call Within 5 Minutes
        </GlassButton>
      </div>
    </header>
  );
}
