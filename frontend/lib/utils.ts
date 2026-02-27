import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

export function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatPnL(amount: number | null): string {
    if (amount === null || amount === undefined) return "-";
    const sign = amount >= 0 ? "+" : "";
    return `${sign}${amount.toFixed(2)}`;
}

export function formatPercent(ratio: number | null): string {
    if (ratio === null || ratio === undefined) return "-";
    const sign = ratio >= 0 ? "+" : "";
    return `${sign}${ratio.toFixed(2)}%`;
}

export function pnlColor(flag: string | null): string {
    if (flag === "盈利") return "text-emerald-500";
    if (flag === "亏损") return "text-red-500";
    return "text-zinc-400";
}
