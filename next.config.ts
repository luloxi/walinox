import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@qvac/sdk"],
  transpilePackages: [
    "@tetherto/wdk",
    "@tetherto/wdk-wallet",
    "@tetherto/wdk-wallet-evm",
    "@tetherto/wdk-wallet-evm-7702-gasless",
  ],
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: {
      "sodium-native": "sodium-javascript",
    },
  },
};

export default nextConfig;
