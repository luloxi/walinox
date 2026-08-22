import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@qvac/sdk", "web-push"],
  transpilePackages: [
    "@tetherto/wdk",
    "@tetherto/wdk-wallet",
    "@tetherto/wdk-wallet-evm",
    "@tetherto/wdk-wallet-evm-7702-gasless",
    "@rainbow-me/rainbowkit",
  ],
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: {
      "sodium-native": "sodium-javascript",
      "@x402/core/client": "./src/lib/x402-stub.ts",
      "@x402/evm": "./src/lib/x402-stub.ts",
      "@x402/evm/exact/client": "./src/lib/x402-stub.ts",
      "@x402/evm/upto/client": "./src/lib/x402-stub.ts",
      "@x402/svm/exact/client": "./src/lib/x402-stub.ts",
    },
  },
};

export default nextConfig;
