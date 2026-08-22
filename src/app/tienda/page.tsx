import { Suspense } from "react";
import { TiendaView } from "@/components/tienda-view";

export default function TiendaPage() {
  return (
    <Suspense>
      <TiendaView />
    </Suspense>
  );
}
