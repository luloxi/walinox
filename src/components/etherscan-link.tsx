import { ExternalLink } from "lucide-react";
import { etherscanAddressUrl, etherscanTxUrl, isTxHash } from "@/lib/etherscan";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EtherscanTxLink({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  if (!isTxHash(hash)) return null;
  return (
    <a
      href={etherscanTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 text-teal-300 hover:underline",
        className,
      )}
    >
      Ver en Etherscan
      <ExternalLink className="size-3.5" />
    </a>
  );
}

export function EtherscanAddressLink({
  address,
  className,
}: {
  address: string;
  className?: string;
}) {
  return (
    <a
      href={etherscanAddressUrl(address)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("cursor-pointer font-mono hover:text-teal-300 hover:underline", className)}
    >
      {shortAddress(address)}
    </a>
  );
}
