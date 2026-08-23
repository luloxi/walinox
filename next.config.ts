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
  experimental: {
    optimizePackageImports: ["lucide-react", "@rainbow-me/rainbowkit"],
  },
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https: wss:",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
