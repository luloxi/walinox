import { describe, expect, it } from "vitest";
import {
  heuristicComplete,
  heuristicIntent,
  naturalLanguageToIntent,
  naturalLanguageToPermit,
  parseAgentOutput,
  toBaseUnits,
} from "@/lib/agent";
import { PERMIT2_ADDRESS } from "@/lib/permit2";
import { USDT } from "@/lib/tokens";

const OWNER = "0x2222222222222222222222222222222222222222";
const SPENDER = "0x3333333333333333333333333333333333333333";

describe("QVAC-shaped agent path", () => {
  it("maps a USDC-shaped model reply onto USDT Permit2", async () => {
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

    expect(result.kind).toBe("permit2");
    expect(result.token.address).toBe(USDT.address);
    expect(result.typed.primaryType).toBe("PermitTransferFrom");
    expect(result.owner).toBe(OWNER);
    expect(result.spender).toBe(SPENDER);
    expect(result.value).toBe("100000000");
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

describe("form-fill intent", () => {
  it("fills a Spanish send from a sentence", () => {
    const intent = heuristicIntent(`mandale 10 USDT a ${SPENDER}`, "send");
    expect(intent.task).toBe("send");
    expect(intent.to?.toLowerCase()).toBe(SPENDER.toLowerCase());
    expect(intent.amount).toBe("10");
  });

  it("fills a send to an ENS or Basename", () => {
    const ens = heuristicIntent("mandale 10 USDT a vitalik.eth", "send");
    expect(ens.to).toBe("vitalik.eth");
    expect(ens.amount).toBe("10");
    const base = heuristicIntent("enviale 3.5 a alice.base.eth", "send");
    expect(base.to).toBe("alice.base.eth");
    expect(base.amount).toBe("3.5");
  });

  it("asks for a recipient when the send has no address or ENS", () => {
    expect(() => heuristicIntent("mandale 10 USDT", "send")).toThrow(/ENS o un Basename/);
  });

  it("fills an ENS send without inventing an amount", () => {
    const intent = heuristicIntent("mandale a vitalik.eth", "send");
    expect(intent.to).toBe("vitalik.eth");
    expect(intent.amount).toBeUndefined();
  });

  it("fills a contact name and address", () => {
    const intent = heuristicIntent(`guardá a María ${SPENDER}`, "contact");
    expect(intent.task).toBe("contact");
    expect(intent.to?.toLowerCase()).toBe(SPENDER.toLowerCase());
    expect(intent.name).toBe("María");
  });

  it("fills a contact from an ENS name", () => {
    const intent = heuristicIntent("guardá a Nacho lulox.eth", "contact");
    expect(intent.to).toBe("lulox.eth");
    expect(intent.name).toBe("Nacho");
  });

  it("fills a product listing", () => {
    const intent = heuristicIntent("vendo café a 3 USDT, retiro en San Martín 100", "product");
    expect(intent.task).toBe("product");
    expect(intent.price).toBe("3");
    expect(intent.place).toMatch(/San Martín 100/);
    expect(intent.title?.toLowerCase()).toContain("café");
  });

  it("maps a model JSON onto send intent", async () => {
    const result = await naturalLanguageToIntent("whatever", {
      task: "send",
      owner: OWNER,
      complete: async () =>
        JSON.stringify({
          task: "send",
          to: SPENDER,
          amount: "25",
        }),
    });
    expect(result.source).toBe("model");
    expect(result.to).toBe(SPENDER);
    expect(result.amount).toBe("25");
  });
});
