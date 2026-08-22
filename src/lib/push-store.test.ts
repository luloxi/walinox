import { describe, expect, it, beforeEach } from "vitest";
import {
  addSubscription,
  disablePushPersist,
  listSubscriptions,
  queueMessage,
  removeSubscription,
  resetPushStore,
  takeInbox,
} from "@/lib/push-store";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";

describe("push-store", () => {
  beforeEach(() => {
    disablePushPersist();
    resetPushStore();
  });

  it("keeps one subscription per endpoint and queues inbox by address", () => {
    addSubscription(A, { endpoint: "https://push.example/1", keys: { p256dh: "x", auth: "y" } });
    addSubscription(A, { endpoint: "https://push.example/1", keys: { p256dh: "x2", auth: "y2" } });
    addSubscription(A, { endpoint: "https://push.example/2" });
    expect(listSubscriptions(A)).toHaveLength(2);

    queueMessage({
      id: "m1",
      kind: "usdt",
      title: "Te mandaron USDT",
      body: "hola",
      url: "/",
      from: B,
      to: A,
      at: new Date().toISOString(),
    });
    queueMessage({
      id: "m1",
      kind: "usdt",
      title: "dup",
      body: "dup",
      url: "/",
      from: B,
      to: A,
      at: new Date().toISOString(),
    });
    expect(takeInbox(A)).toHaveLength(1);
    expect(takeInbox(A)).toHaveLength(0);

    removeSubscription(A, "https://push.example/1");
    expect(listSubscriptions(A)).toHaveLength(1);
  });
});
