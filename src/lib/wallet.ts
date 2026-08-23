import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";
import { MaxUint256 } from "ethers";
import { RPC_URL } from "@/lib/balance";
import type { Eip712Domain, PermitTypedData } from "@/lib/permit";

export const SEED_STORAGE_KEY = "walinox.seed";

export type Signable = {
  domain: Eip712Domain;
  types: Record<string, { name: string; type: string }[]>;
  message: Record<string, unknown>;
};

export type LocalWallet = {
  source?: "injected" | "local";
  address: string;
  signTypedData: (typed: Signable) => Promise<string>;
  signPermit: (typed: PermitTypedData) => Promise<string>;
  transfer: (token: string, recipient: string, amount: string) => Promise<string>;
  sendCalldata: (to: string, data: string) => Promise<string>;
  approve: (token: string, spender: string, amount?: string) => Promise<string>;
  dispose: () => void;
};

type WriteResult = { hash: string };

type EvmWrite = {
  signTypedData: (typed: Signable) => Promise<string>;
  transfer: (opts: { token: string; recipient: string; amount: bigint }) => Promise<WriteResult>;
  sendTransaction: (tx: { to: string; value: bigint; data: string }) => Promise<WriteResult>;
  approve: (opts: { token: string; spender: string; amount: bigint }) => Promise<WriteResult>;
  getAddress: () => Promise<string>;
  dispose: () => void;
};

type GaslessSession = {
  transfer: EvmWrite["transfer"];
  sendTransaction: EvmWrite["sendTransaction"];
  approve: EvmWrite["approve"];
  dispose: () => void;
};

export function randomSeedPhrase(): string {
  return WDK.getRandomSeedPhrase(12);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function openWallet(seedPhrase: string): Promise<LocalWallet> {
  if (!WDK.isValidSeed(seedPhrase)) {
    throw new Error("Invalid BIP-39 seed phrase");
  }

  const wdk = new WDK(seedPhrase).registerWallet("ethereum", WalletManagerEvm, {
    provider: RPC_URL,
  });
  const evm = (await wdk.getAccount("ethereum", 0)) as unknown as EvmWrite;
  if (typeof evm.signTypedData !== "function") {
    throw new Error("WDK EVM account is missing signTypedData");
  }
  const address = await evm.getAddress();

  let gasless: GaslessSession | undefined;

  async function getGasless(): Promise<GaslessSession> {
    if (!gasless) gasless = await openGasless(seedPhrase);
    return gasless;
  }

  /** Try WDK 7702 gasless (gas paid in USDT) first; fall back to plain EOA (needs ETH). */
  async function gaslessThenEvm<T>(
    run: (session: GaslessSession) => Promise<T>,
    fallback: () => Promise<T>,
  ): Promise<T> {
    let gaslessErr: unknown;
    try {
      return await run(await getGasless());
    } catch (err) {
      gaslessErr = err;
    }
    try {
      return await fallback();
    } catch (ethErr) {
      throw new Error(
        `Gasless USDT falló (${errMsg(gaslessErr)}). Fallback EOA también falló: ${errMsg(ethErr)}`,
      );
    }
  }

  return {
    source: "local",
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
      const opts = { token, recipient, amount: BigInt(amount) };
      const result = await gaslessThenEvm(
        (session) => session.transfer(opts),
        () => evm.transfer(opts),
      );
      return result.hash;
    },
    async sendCalldata(to, data) {
      const tx = { to, value: BigInt(0), data };
      const result = await gaslessThenEvm(
        (session) => session.sendTransaction(tx),
        () => evm.sendTransaction(tx),
      );
      return result.hash;
    },
    async approve(token, spender, amount = MaxUint256.toString()) {
      const opts = { token, spender, amount: BigInt(amount) };
      const result = await gaslessThenEvm(
        (session) => session.approve(opts),
        () => evm.approve(opts),
      );
      return result.hash;
    },
    dispose() {
      gasless?.dispose();
      gasless = undefined;
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

async function openGasless(seedPhrase: string): Promise<GaslessSession> {
  const WalletManagerEvm7702Gasless = (await import("@tetherto/wdk-wallet-evm-7702-gasless"))
    .default;
  const { gaslessConfig } = await import("@/lib/gasless");
  const gaslessWdk = new WDK(seedPhrase).registerWallet(
    "ethereum",
    WalletManagerEvm7702Gasless as unknown as typeof WalletManagerEvm,
    gaslessConfig(),
  );
  const account = (await gaslessWdk.getAccount("ethereum", 0)) as unknown as EvmWrite;
  return {
    transfer: (opts) => account.transfer(opts),
    sendTransaction: (tx) => account.sendTransaction(tx),
    approve: (opts) => account.approve(opts),
    dispose() {
      account.dispose();
      gaslessWdk.dispose();
    },
  };
}

export async function loadOrCreateWallet(): Promise<LocalWallet> {
  let seed = readStoredSeed();
  if (!seed) {
    seed = randomSeedPhrase();
    persistSeed(seed);
  }
  return openWallet(seed);
}
