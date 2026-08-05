import Image from "next/image";
import { GlassButton } from "@/components/ui/glass-button";

export function TopBar() {
  return (
    <header className="w-full pt-14 pb-3 sm:py-3">
      {/* stacked on mobile (CTA first, then a centred logo); single row from sm
          up. `flex-col-reverse` flips the visual order only, so the logo stays
          first in the DOM for reading/tab order. */}
      <div className="mx-auto flex flex-col-reverse items-center gap-12 px-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-10 lg:px-20">
        <Image
          src="/bluex-logo.png"
          alt="BlueX"
          width={525}
          height={271}
          priority
          className="h-20 w-auto sm:h-16"
        />

        <GlassButton className="w-full [&>button]:w-full sm:w-auto sm:[&>button]:w-auto">
          Get a Call Within 5 Minutes
        </GlassButton>
      </div>
    </header>
  );
}
