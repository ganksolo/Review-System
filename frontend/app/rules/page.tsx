/**
 * Rules library page — dynamic rules: exclusions, correct behaviors, environment mismatches.
 *
 * Design system: Dark OLED, #1E40AF primary, trading semantic colors.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, XCircle, BarChart3 } from "lucide-react";
import {
    useRulesSummary,
    useExclusions,
    useCorrectBehaviors,
    useEnvironmentMismatches,
} from "@/lib/hooks/useTrades";
import { formatDate, pnlColor, formatPercent } from "@/lib/utils";
import type { Trade } from "@/types/trade";

type Tab = "exclusions" | "correct" | "mismatches";

export default function RulesPage() {
    const [tab, setTab] = useState<Tab>("correct");

    const { data: summaryData, isLoading: loadingSummary } = useRulesSummary();
    const { data: exclusionsData, isLoading: loadingExcl } = useExclusions();
    const { data: correctData, isLoading: loadingCorrect } = useCorrectBehaviors();
    const { data: mismatchData, isLoading: loadingMismatch } = useEnvironmentMismatches();

    const summary = summaryData?.data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">动态规则库</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    从交易数据自动提炼的规则 — 排除、正确行为、环境错配
                </p>
            </div>

            {/* Summary Stats */}
            {loadingSummary ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-24 rounded-xl" />
                    ))}
                </div>
            ) : summary && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <SummaryCard label="正确行为" count={summary.correct_behaviors_count} icon={<CheckCircle2 />} color="bullish" />
                    <SummaryCard label="永久排除" count={summary.permanent_exclusions_count} icon={<XCircle />} color="bearish" />
                    <SummaryCard label="环境错配" count={summary.environment_mismatches_count} icon={<AlertTriangle />} color="cta" />
                    <SummaryCard label="执行错误" count={summary.execution_errors_count} icon={<BarChart3 />} color="primary" />
                </div>
            )}

            {/* Tabs */}
            <div
                className="flex gap-1 rounded-lg border p-1"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-card)" }}
            >
                <TabButton label="正确行为" active={tab === "correct"} count={correctData?.data?.length ?? 0} onClick={() => setTab("correct")} />
                <TabButton label="永久排除" active={tab === "exclusions"} count={exclusionsData?.data?.length ?? 0} onClick={() => setTab("exclusions")} />
                <TabButton label="环境错配" active={tab === "mismatches"} count={mismatchData?.data?.length ?? 0} onClick={() => setTab("mismatches")} />
            </div>

            {/* Content */}
            <div
                className="rounded-xl border"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-card)" }}
            >
                {tab === "correct" && (
                    <TradeList
                        trades={correctData?.data ?? []}
                        isLoading={loadingCorrect}
                        emptyText="暂无正确行为记录。继续复盘以积累正确的交易模式。"
                        highlightField="correct_action"
                        highlightColor="bullish"
                    />
                )}
                {tab === "exclusions" && (
                    <TradeList
                        trades={exclusionsData?.data ?? []}
                        isLoading={loadingExcl}
                        emptyText="暂无永久排除记录。"
                        highlightField="correct_action"
                        highlightColor="bearish"
                    />
                )}
                {tab === "mismatches" && (
                    <TradeList
                        trades={mismatchData?.data ?? []}
                        isLoading={loadingMismatch}
                        emptyText="暂无环境错配记录。"
                        highlightField="market_environment"
                        highlightColor="cta"
                    />
                )}
            </div>
        </div>
    );
}

function SummaryCard({
    label,
    count,
    icon,
    color,
}: {
    label: string;
    count: number;
    icon: React.ReactNode;
    color: "primary" | "bullish" | "bearish" | "cta";
}) {
    const styles: Record<typeof color, { bg: string; border: string; iconColor: string; glow: string }> = {
        primary: {
            bg: "linear-gradient(135deg, rgba(30,64,175,0.15), rgba(30,64,175,0.03))",
            border: "rgba(30,64,175,0.3)",
            iconColor: "var(--color-primary-light)",
            glow: "0 0 15px rgba(30,64,175,0.2)",
        },
        bullish: {
            bg: "linear-gradient(135deg, rgba(38,166,154,0.15), rgba(38,166,154,0.03))",
            border: "rgba(38,166,154,0.3)",
            iconColor: "var(--color-bullish)",
            glow: "0 0 15px rgba(38,166,154,0.2)",
        },
        bearish: {
            bg: "linear-gradient(135deg, rgba(239,83,80,0.15), rgba(239,83,80,0.03))",
            border: "rgba(239,83,80,0.3)",
            iconColor: "var(--color-bearish)",
            glow: "0 0 15px rgba(239,83,80,0.2)",
        },
        cta: {
            bg: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03))",
            border: "rgba(245,158,11,0.3)",
            iconColor: "var(--color-cta)",
            glow: "0 0 15px rgba(245,158,11,0.2)",
        },
    };

    const s = styles[color];

    return (
        <div
            className="card-glow rounded-xl border p-4"
            style={{ background: s.bg, borderColor: s.border, boxShadow: s.glow }}
        >
            <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
                <span style={{ color: s.iconColor }}>{icon}</span>
            </div>
            <p className="mt-1 font-mono text-2xl font-bold text-[var(--color-text-primary)]">{count}</p>
        </div>
    );
}

function TabButton({
    label,
    active,
    count,
    onClick,
}: {
    label: string;
    active: boolean;
    count: number;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all"
            style={active ? {
                backgroundColor: "var(--color-primary-glow)",
                color: "var(--color-primary-light)",
            } : {
                color: "var(--color-text-secondary)",
            }}
        >
            {label} ({count})
        </button>
    );
}

function TradeList({
    trades,
    isLoading,
    emptyText,
    highlightField,
    highlightColor,
}: {
    trades: Trade[];
    isLoading: boolean;
    emptyText: string;
    highlightField: string;
    highlightColor: "primary" | "bullish" | "bearish" | "cta";
}) {
    if (isLoading) {
        return (
            <div className="space-y-0 p-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton my-2 h-16 rounded-lg" />
                ))}
            </div>
        );
    }

    if (trades.length === 0) {
        return <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">{emptyText}</div>;
    }

    const colorMap: Record<string, { bg: string; border: string; text: string }> = {
        bullish: { bg: "rgba(38,166,154,0.05)", border: "rgba(38,166,154,0.2)", text: "var(--color-bullish)" },
        bearish: { bg: "rgba(239,83,80,0.05)", border: "rgba(239,83,80,0.2)", text: "var(--color-bearish)" },
        cta: { bg: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.2)", text: "var(--color-cta)" },
        primary: { bg: "rgba(30,64,175,0.05)", border: "rgba(30,64,175,0.2)", text: "var(--color-primary-light)" },
    };
    const c = colorMap[highlightColor];

    return (
        <div className="divide-y" style={{ borderColor: "rgba(59,130,246,0.06)" }}>
            {trades.map((t) => (
                <div
                    key={t.id}
                    className="p-4 transition-all"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg-card-hover)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                    <div className="flex items-center justify-between">
                        <Link
                            href={`/trades/${t.id}`}
                            className="font-medium text-[var(--color-primary-light)] hover:underline"
                        >
                            {t.stock_code}
                            {t.stock_name && <span className="ml-2 text-[var(--color-text-secondary)]">{t.stock_name}</span>}
                        </Link>
                        <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                            <span className="font-mono">{formatDate(t.entry_date)}</span>
                            <span
                                className="font-mono font-medium"
                                style={{
                                    color: t.pnl_flag === "盈利" ? "var(--color-bullish)"
                                        : t.pnl_flag === "亏损" ? "var(--color-bearish)"
                                            : "var(--color-neutral)",
                                }}
                            >
                                {formatPercent(t.pnl_ratio)}
                            </span>
                        </div>
                    </div>
                    {/* Highlighted info */}
                    <div
                        className="mt-2 rounded-lg border p-2.5 text-sm"
                        style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                    >
                        {highlightField === "correct_action" && t.correct_action}
                        {highlightField === "market_environment" && (
                            <>
                                <span className="font-medium">市场环境: </span>
                                {t.market_environment ?? "-"}
                                <span className="mx-2">·</span>
                                <span className="font-medium">正确行为: </span>
                                {t.correct_action}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
