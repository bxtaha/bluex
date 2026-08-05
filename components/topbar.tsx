import Image from "next/image";
import { GlassButton } from "@/components/ui/glass-button";

export function TopBar() {
  return (
    <header className="w-full py-3">
      <div className="mx-auto flex items-center justify-between gap-3 px-6 sm:gap-4 sm:px-10 lg:px-20">
        <Image
          src="/bluex-logo.png"
          alt="BlueX"
          width={525}
          height={271}
          priority
          className="h-16 w-auto sm:h-20"
        />

        <GlassButton>Get a Call Within 5 Minutes</GlassButton>
      </div>
    </header>
  );
}
