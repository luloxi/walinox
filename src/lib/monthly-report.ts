import { buildActivityReport, type ActivityReport } from "@/lib/activity";
import { loadDisplay, type FiatId } from "@/lib/display";
import { formatFiat } from "@/lib/fx";
import { addInboxItem, showLocalNotification } from "@/lib/notify";
import { listReceipts } from "@/lib/receipts";

export const MONTHLY_REPORT_ON_KEY = "walinox.monthlyReport";
export const MONTHLY_REPORT_PROMPT_KEY = "walinox.monthlyReport.prompt";
export const MONTHLY_REPORT_LAST_PREFIX = "walinox.monthlyReport.last.";

const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      return localStorage.getItem(key);
    }
  } catch {
    /* fall through */
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* fall through */
  }
  memory.set(key, value);
}

export function forgetMonthlyReportDelivery(me: string): void {
  write(MONTHLY_REPORT_LAST_PREFIX + me.toLowerCase(), "");
}

export function monthlyReportOn(): boolean {
  return read(MONTHLY_REPORT_ON_KEY) === "1";
}

export function setMonthlyReportOn(on: boolean): void {
  write(MONTHLY_REPORT_ON_KEY, on ? "1" : "0");
}

export function monthlyReportPromptSeen(): boolean {
  return read(MONTHLY_REPORT_PROMPT_KEY) === "1";
}

export function markMonthlyReportPromptSeen(): void {
  write(MONTHLY_REPORT_PROMPT_KEY, "1");
}

export function previousMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

export function monthTag(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthlyReportCopy(
  report: ActivityReport,
  fiat: FiatId,
): { title: string; body: string } {
  return {
    title: `Resumen de ${report.label}`,
    body: `Ingresos ${formatFiat(report.incomeArs, fiat)} · Gastos ${formatFiat(report.expenseArs, fiat)} · Neto ${formatFiat(report.netArs, fiat)}. ${report.receipts.length} movimiento${report.receipts.length === 1 ? "" : "s"}.`,
  };
}

export function maybeDeliverMonthlyReport(me: string, now = new Date()): boolean {
  if (!monthlyReportOn() || !me) return false;
  const month = previousMonth(now);
  const tag = monthTag(month);
  const lastKey = MONTHLY_REPORT_LAST_PREFIX + me.toLowerCase();
  if (read(lastKey) === tag) return false;
  const report = buildActivityReport(listReceipts(), { kind: "month", anchor: month, me });
  const copy = monthlyReportCopy(report, loadDisplay().fiat);
  addInboxItem({
    id: `monthly:${me.toLowerCase()}:${tag}`,
    kind: "report",
    title: copy.title,
    body: copy.body,
    url: "/summary",
    from: me,
    to: me,
  });
  write(lastKey, tag);
  void showLocalNotification(copy.title, {
    body: copy.body,
    url: "/summary",
    tag: `monthly-${tag}`,
  });
  return true;
}
