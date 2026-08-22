import { describe, expect, it } from "vitest";
import {
  inviteFromSeed,
  isPearWrap,
  topicFromInvite,
  topicHex,
  unwrapPears,
  wrapForPears,
} from "@/lib/pears";

describe("pears rooms", () => {
  it("derives a stable 8-char invite and 32-byte topic", async () => {
    const a = await inviteFromSeed("0xsig");
    const b = await inviteFromSeed("0xsig");
    expect(a).toBe(b);
    expect(a).toHaveLength(8);
    const topic = await topicFromInvite(a);
    expect(topic.byteLength).toBe(32);
    expect(topicHex(topic)).toHaveLength(64);
  });

  it("different seeds get different invites", async () => {
    const a = await inviteFromSeed("sig-a");
    const b = await inviteFromSeed("sig-b");
    expect(a).not.toBe(b);
  });

  it("wraps and unwraps envelope JSON with pears metadata", async () => {
    const body = JSON.stringify({ v: 1, signature: `0x${"ab".repeat(65)}` });
    const wrapped = await wrapForPears(body, "0xdead");
    const parsed = JSON.parse(wrapped) as unknown;
    expect(isPearWrap(parsed)).toBe(true);
    const back = unwrapPears(wrapped);
    expect(back.body).toBe(body);
    expect(back.invite).toHaveLength(8);
    expect(back.topic).toHaveLength(64);
  });

  it("unwrap leaves plain envelopes alone", () => {
    const plain = '{"v":1,"signature":"0xabc"}';
    const back = unwrapPears(plain);
    expect(back.body).toBe(plain);
    expect(back.invite).toBeUndefined();
  });
});
