import Image from "next/image";
import { StardustButton } from "@/components/ui/stardust-button";

export function TopBar() {
  return (
    <header className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
      <Image
        src="/bluex-logo.png"
        alt="BlueX"
        width={525}
        height={271}
        priority
        className="h-16 w-auto sm:h-20"
      />

      <StardustButton>Get a free Call within 5 minutes</StardustButton>
    </header>
  );
}
