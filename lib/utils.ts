import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function formatDate(date: string | Date) {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateShort(date: string | Date) {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d");
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  new:       { label: "New",       color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",    dot: "bg-blue-500" },
  contacted: { label: "Contacted", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
  booked:    { label: "Booked",    color: "text-violet-700", bg: "bg-violet-50 border-violet-200", dot: "bg-violet-500" },
  closed:    { label: "Closed",    color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-200",dot: "bg-emerald-500" },
  lost:      { label: "Lost",      color: "text-red-600",    bg: "bg-red-50 border-red-200",      dot: "bg-red-400" },
};
