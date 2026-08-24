import type { ChatMessage } from "@/lib/agent";

export type QvacHistoryTurn = { role: "user" | "assistant"; content: string };

export function historyFrom(messages: ChatMessage[]): QvacHistoryTurn[] {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n");
  const rest = messages.filter((message) => message.role !== "system");
  const history: QvacHistoryTurn[] = [];
  if (system) {
    const first = rest[0];
    if (first?.role === "user") {
      history.push({ role: "user", content: `${system}\n\n${first.content}` });
      for (const message of rest.slice(1)) {
        if (message.role === "user" || message.role === "assistant") {
          history.push({ role: message.role, content: message.content });
        }
      }
    } else {
      history.push({ role: "user", content: system });
    }
  } else {
    for (const message of rest) {
      if (message.role === "user" || message.role === "assistant") {
        history.push({ role: message.role, content: message.content });
      }
    }
  }
  return history;
}
