import { redirect } from "next/navigation";

export default async function SendRedirect({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const qs = new URLSearchParams();
  qs.set("tab", "enviar");
  if (to) qs.set("to", to);
  redirect(`/?${qs.toString()}`);
}
