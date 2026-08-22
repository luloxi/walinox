import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { RPC_URL } from "@/lib/balance";
import type { Eip712Domain, PermitTypedData } from "@/lib/permit";

export const SEED_STORAGE_KEY = "walinox.seed";

export type Signable = {
  domain: Eip712Domain;
  types: Record<string, { name: string; type: string }[]>;
  message: Record<string, unknown>;
};

export type LocalWallet = {
  seedPhrase: string;
  address: string;
  signTypedData: (typed: Signable) => Promise<string>;
  signPermit: (typed: PermitTypedData) => Promise<string>;
  transfer: (token: string, recipient: string, amount: string) => Promise<string>;
  dispose: () => void;
};

export function randomSeedPhrase(): string {
  return WDK.getRandomSeedPhrase(12);
}

export async function openWallet(seedPhrase: string): Promise<LocalWallet> {
  if (!WDK.isValidSeed(seedPhrase)) {
    throw new Error("Invalid BIP-39 seed phrase");
  }

  const wdk = new WDK(seedPhrase).registerWallet("ethereum", WalletManagerEvm, {
    provider: RPC_URL,
  });
  const account = await wdk.getAccount("ethereum", 0);
  const evm = account as typeof account & {
    signTypedData: (typed: Signable) => Promise<string>;
    transfer: (opts: {
      token: string;
      recipient: string;
      amount: bigint;
    }) => Promise<{ hash: string }>;
  };
  if (typeof evm.signTypedData !== "function") {
    throw new Error("WDK EVM account is missing signTypedData");
  }
  const address = await evm.getAddress();

  return {
    seedPhrase,
    address,
    async signTypedData(typed) {
      return evm.signTypedData(typed);
    },
    async signPermit(typed) {
      return evm.signTypedData({
        domain: typed.domain,
        types: typed.types,
        message: typed.message,
      });
    },
    async transfer(token, recipient, amount) {
      const result = await evm.transfer({
        token,
        recipient,
        amount: BigInt(amount),
      });
      return result.hash;
    },
    dispose() {
      evm.dispose();
      wdk.dispose();
    },
  };
}

export function readStoredSeed(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(SEED_STORAGE_KEY);
}

export function persistSeed(seedPhrase: string): void {
  localStorage.setItem(SEED_STORAGE_KEY, seedPhrase);
}

export async function loadOrCreateWallet(): Promise<LocalWallet> {
  let seed = readStoredSeed();
  if (!seed) {
    seed = randomSeedPhrase();
    persistSeed(seed);
  }
  return openWallet(seed);
}
