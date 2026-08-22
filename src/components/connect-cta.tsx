"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/wallet-provider";
import { cn } from "@/lib/utils";

export function ConnectCta({
  stacked,
  label = "Iniciar sesión",
  className,
}: {
  stacked?: boolean;
  label?: string;
  className?: string;
}) {
  const { openConnectModal } = useConnectModal();
  const { unlockLocal } = useWallet();

  if (stacked) {
    return (
      <div className={cn("flex w-full flex-col items-stretch", className)}>
        <Button
          type="button"
          className="h-12 w-full"
          onClick={() => openConnectModal?.()}
          disabled={!openConnectModal}
        >
          {label}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-11 w-full text-muted-foreground"
          onClick={() => void unlockLocal()}
        >
          Usar billetera local
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <Button
        type="button"
        className="h-10"
        onClick={() => openConnectModal?.()}
        disabled={!openConnectModal}
      >
        {label}
      </Button>
      <Button type="button" variant="ghost" className="h-10 px-2 text-muted-foreground" onClick={() => void unlockLocal()}>
        Local
      </Button>
    </div>
  );
}
