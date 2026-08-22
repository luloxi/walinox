"use client";

import { useEffect, useState } from "react";
import { blo } from "blo";
import { isAddress } from "ethers";
import { Input } from "@/components/ui/input";
import { ensAvatar, isEnsName, lookupEns, resolveEns } from "@/lib/ens";
import { cn } from "@/lib/utils";

/**
 * Scaffold-ETH AddressInput: ENS / Basename + blo identicon.
 * Same behavior as @scaffold-ui/components AddressInput.
 */
export function AddressInput({
  value,
  onChange,
  placeholder = "vitalik.eth, alice.base.eth o 0x…",
  disabled,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [ensName, setEnsName] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enteredName, setEnteredName] = useState<string>();

  useEffect(() => {
    const text = value.trim();
    if (!text) {
      setEnsName(null);
      setAvatar(null);
      setEnteredName(undefined);
      setLoading(false);
      return;
    }

    let live = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          if (isEnsName(text)) {
            const resolved = await resolveEns(text);
            if (!live) return;
            if (resolved) {
              setEnteredName(text);
              setEnsName(text);
              if (resolved !== text) onChange(resolved);
              setAvatar(await ensAvatar(text));
            } else {
              setEnsName(null);
              setAvatar(null);
            }
            return;
          }
          if (isAddress(text)) {
            const name = await lookupEns(text);
            if (!live) return;
            setEnsName(name);
            setEnteredName(undefined);
            setAvatar(name ? await ensAvatar(name) : null);
            return;
          }
          if (!live) return;
          setEnsName(null);
          setAvatar(null);
        } finally {
          if (live) setLoading(false);
        }
      })();
    }, 350);

    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // onChange is stable enough from setState; avoid retrigger loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const bloAddress = isAddress(value) ? value : undefined;

  return (
    <div
      className={cn(
        "flex h-11 min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-inset focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      {ensName ? (
        <div className="flex shrink-0 items-center bg-white/5">
          {loading && !avatar ? (
            <div className="size-9 shrink-0 animate-pulse bg-white/10" />
          ) : avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-9 object-cover" />
          ) : null}
          <span className="max-w-[7.5rem] truncate px-2 text-xs text-teal-300">
            {enteredName ?? ensName}
          </span>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 bg-white/5 px-2">
          <div className="size-9 shrink-0 animate-pulse bg-white/10" />
          <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
        </div>
      ) : null}
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-11 flex-1 rounded-none border-0 bg-transparent font-mono shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
      {bloAddress ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          src={blo(bloAddress as `0x${string}`)}
          width={35}
          height={35}
          className="size-9 shrink-0 self-center"
        />
      ) : null}
    </div>
  );
}
