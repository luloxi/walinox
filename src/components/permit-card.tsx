"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Price } from "@/components/price";
import { formatDeadline, fromBaseUnits, shortAddress } from "@/lib/format";
import type { PermitKind } from "@/lib/tokens";

export function PermitCard({
  kind,
  owner,
  spender,
  value,
  tokenLabel,
  nonce,
  deadline,
  chainId,
  explanation,
  complianceNote,
}: {
  kind: PermitKind;
  owner: string;
  spender: string;
  value: string;
  tokenLabel: string;
  nonce: string;
  deadline: string;
  chainId: number;
  explanation?: string;
  complianceNote?: string;
}) {
  const rows = [
    ["De", shortAddress(owner)],
    ["Para", shortAddress(spender)],
    ["Vence", formatDeadline(deadline)],
    ["Token", tokenLabel],
    ["Red", String(chainId)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{kind === "permit2" ? "Permiso firmado" : "Permit ERC-2612"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-xs">
          <div className="contents">
            <dt className="text-muted-foreground">Monto</dt>
            <dd className="flex justify-end font-sans">
              <Price usdt={fromBaseUnits(value)} size="sm" className="items-end" />
            </dd>
          </div>
          {rows.map(([label, cell]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right break-all">{cell}</dd>
            </div>
          ))}
        </dl>
        {explanation ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{explanation}</p>
        ) : null}
        {complianceNote ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{complianceNote}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
