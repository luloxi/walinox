import { redirect } from "next/navigation";

export default function ReceiveRedirect() {
  redirect("/?tab=recibir");
}
