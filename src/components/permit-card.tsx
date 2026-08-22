import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDeadline, formatTokenAmount, shortAddress } from "@/lib/format";
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
    ["Owner", shortAddress(owner)],
    ["Spender", shortAddress(spender)],
    ["Value", formatTokenAmount(value)],
    ["Nonce", nonce],
    ["Deadline", formatDeadline(deadline)],
    ["Token", tokenLabel],
    ["Chain", String(chainId)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{kind === "permit2" ? "Permit2 transfer" : "ERC-2612 Permit"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-mono text-xs">
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
          <p className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-xs leading-relaxed text-teal-100">
            {complianceNote}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
