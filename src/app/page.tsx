import { Suspense } from "react";
import { WalletScreen } from "@/components/wallet-screen";

export default function HomePage() {
  return (
    <Suspense>
      <WalletScreen />
    </Suspense>
  );
}
