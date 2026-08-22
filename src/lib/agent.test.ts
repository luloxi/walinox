import { describe, expect, it } from "vitest";
import {
  heuristicComplete,
  naturalLanguageToPermit,
  parseAgentOutput,
  toBaseUnits,
} from "@/lib/agent";
import { PERMIT2_ADDRESS } from "@/lib/permit2";
import { USDT } from "@/lib/tokens";

const OWNER = "0x2222222222222222222222222222222222222222";
const SPENDER = "0x3333333333333333333333333333333333333333";

describe("QVAC-shaped agent path", () => {
  it("parses an injected completion into an ERC-2612 USDC permit", async () => {
    const result = await naturalLanguageToPermit(`allow ${SPENDER} to spend 100 USDC`, {
      owner: OWNER,
      complete: async () =>
        JSON.stringify({
          token: "USDC",
          permit: {
            owner: OWNER,
            spender: SPENDER,
            value: "100000000",
            nonce: "0",
            deadline: "2000000000",
          },
          explanation: "Allow the named spender to pull 100 USDC later.",
          complianceNote: "ERC-2612 permit().",
        }),
    });

    expect(result.kind).toBe("erc2612");
    expect(result.typed.primaryType).toBe("Permit");
    expect(result.owner).toBe(OWNER);
    expect(result.spender).toBe(SPENDER);
    expect(result.value).toBe("100000000");
    expect(result.explanation).toMatch(/100 USDC/);
    expect(result.source).toBe("model");
  });

  it("routes USDT through Permit2 via the same parser", async () => {
    const raw = heuristicComplete(`allow ${SPENDER} to spend 50 USDT`, OWNER);
    const draft = parseAgentOutput(raw);
    const result = await naturalLanguageToPermit(`allow ${SPENDER} to spend 50 USDT`, {
      owner: OWNER,
      complete: async () => raw,
    });

    expect(draft).toMatchObject({
      token: "USDT",
      permit: { owner: OWNER, spender: SPENDER, value: "50000000" },
    });
    expect(result.kind).toBe("permit2");
    expect(result.token.address).toBe(USDT.address);
    expect(result.typed.domain.verifyingContract).toBe(PERMIT2_ADDRESS);
    expect(result.value).toBe(toBaseUnits("50", 6));
  });
});
