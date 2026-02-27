/**
 * Trade detail page — displays a single trade record with all module data.
 *
 * Design system: Dark OLED, #1E40AF primary, trading semantic colors.
 */

"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Brain, Target, AlertTriangle, Clock, Pencil, Trash2 } from "lucide-react";
import { useTrade, useDeleteTrade } from "@/lib/hooks/useTrades";
import { formatDateTime, formatPnL, formatPercent, pnlColor } from "@/lib/utils";

export default function TradeDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { data, isLoading, error } = useTrade(id);
    const deleteMutation = useDeleteTrade();
    const trade = data?.data;

    const handleDelete = () => {
        if (!confirm("确定要删除这条交易记录吗？")) return;
        deleteMutation.mutate(id, {
            onSuccess: () => router.push("/trades"),
        });
    };

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="skeleton h-12 w-48 rounded-lg" />
                <div className="grid grid-cols-3 gap-4">
                    <div className="skeleton h-24 rounded-xl" />
                    <div className="skeleton h-24 rounded-xl" />
                    <div className="skeleton h-24 rounded-xl" />
                </div>
                <div className="skeleton h-48 rounded-xl" />
                <div className="skeleton h-48 rounded-xl" />
            </div>
        );
    }

    if (error || !trade) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <p style={{ color: "var(--color-bearish)" }}>交易记录不存在或加载失败</p>
                <Link href="/trades" className="text-sm text-[var(--color-primary-light)] hover:underline">
                    返回列表
                </Link>
            </div>
        );
    }

    const tradePnlColor = trade.pnl_flag === "盈利" ? "var(--color-bullish)"
        : trade.pnl_flag === "亏损" ? "var(--color-bearish)"
            : "var(--color-neutral)";

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/trades"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border transition-all"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                            {trade.stock_code}
                            <span className="ml-2 text-lg font-normal text-[var(--color-text-secondary)]">
                                {trade.stock_name}
                            </span>
                        </h1>
                        <div className="mt-1 flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
                            <span>{trade.account_type}</span>
                            <span>·</span>
                            <span>{trade.trade_cycle}</span>
                            <span>·</span>
                            <span className="font-mono">v{trade.version}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/trades/${id}/edit`}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                        <Pencil className="h-3.5 w-3.5" /> 编辑
                    </Link>
                    <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-all"
                        style={{ borderColor: "rgba(239,83,80,0.3)", color: "var(--color-bearish)" }}
                    >
                        <Trash2 className="h-3.5 w-3.5" /> 删除
                    </button>
                </div>
            </div>

            {/* PnL Summary */}
            <div className="grid grid-cols-3 gap-4">
                <MetricCard
                    label="盈亏金额"
                    value={formatPnL(trade.pnl_amount)}
                    color={tradePnlColor}
                    icon={trade.pnl_flag === "盈利" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                />
                <MetricCard
                    label="盈亏比率"
                    value={formatPercent(trade.pnl_ratio)}
                    color={tradePnlColor}
                />
                <MetricCard
                    label="LLM 分析状态"
                    value={trade.llm_analysis_status}
                    color="var(--color-primary-light)"
                    icon={<Brain className="h-5 w-5" />}
                />
            </div>

            {/* Module 1: 基础交易事实 */}
            <Section title="基础交易事实" icon={<Calendar className="h-4 w-4" />}>
                <Grid>
                    <Field label="买入时间" value={formatDateTime(trade.entry_date)} />
                    <Field label="卖出时间" value={trade.exit_date ? formatDateTime(trade.exit_date) : "-"} />
                    <Field label="买入价" value={<span className="font-mono">{trade.entry_price}</span>} />
                    <Field label="卖出价" value={<span className="font-mono">{trade.exit_price ?? "-"}</span>} />
                    <Field label="仓位" value={<span className="font-mono">{trade.position_size}%</span>} />
                    <Field label="预设止损" value={<span className="font-mono">{trade.preset_stop_loss ?? "-"}</span>} />
                    <Field label="预设止盈" value={<span className="font-mono">{trade.preset_take_profit ?? "-"}</span>} />
                    <Field label="滑点" value={<span className="font-mono">{trade.slippage ?? "-"}</span>} />
                </Grid>
            </Section>

            {/* Module 2: 决策环境 */}
            <Section title="决策环境快照" icon={<Target className="h-4 w-4" />}>
                <Grid>
                    <Field label="市场环境" value={trade.market_environment ?? "-"} />
                    <Field label="板块地位" value={trade.sector_status ?? "-"} />
                    <Field
                        label="选股维度"
                        value={trade.selection_dimension?.length ? trade.selection_dimension.join("、") : "-"}
                    />
                    <Field
                        label="策略模式"
                        value={trade.strategy_pattern?.length ? trade.strategy_pattern.join("、") : "-"}
                    />
                </Grid>
                {trade.thesis_statement && (
                    <div
                        className="mt-3 rounded-lg p-3 text-sm text-[var(--color-text-secondary)]"
                        style={{ backgroundColor: "var(--color-bg-card)" }}
                    >
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">交易论点: </span>
                        {trade.thesis_statement}
                    </div>
                )}
            </Section>

            {/* Module 3: 执行与心理 */}
            <Section title="执行与心理评估" icon={<Clock className="h-4 w-4" />}>
                <Grid>
                    <Field label="计划执行度" value={trade.plan_adherence ?? "-"} />
                    <Field label="止损纪律" value={trade.stop_loss_discipline ?? "-"} />
                    <Field label="离场方式" value={trade.exit_type ?? "-"} />
                    <Field label="心理状态" value={trade.psychological_state ?? "-"} />
                </Grid>
                {trade.exit_reason && (
                    <div
                        className="mt-3 rounded-lg p-3 text-sm text-[var(--color-text-secondary)]"
                        style={{ backgroundColor: "var(--color-bg-card)" }}
                    >
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">离场原因: </span>
                        {trade.exit_reason}
                    </div>
                )}
            </Section>

            {/* Module 4: 深度归因 */}
            <Section title="深度归因" icon={<Brain className="h-4 w-4" />}>
                <Grid>
                    <Field label="结果归因" value={trade.result_type ?? "-"} />
                    <Field label="错误层级" value={trade.error_level ?? "-"} />
                    <Field
                        label="环境错配"
                        value={
                            trade.environment_mismatch_flag ? (
                                <span className="flex items-center gap-1" style={{ color: "var(--color-cta)" }}>
                                    <AlertTriangle className="h-3.5 w-3.5" /> 是
                                </span>
                            ) : "否"
                        }
                    />
                    <Field
                        label="永久排除"
                        value={trade.permanent_exclusion_flag ? (
                            <span style={{ color: "var(--color-bearish)" }}>是</span>
                        ) : "否"}
                    />
                </Grid>
                <div
                    className="mt-3 rounded-lg border p-3 text-sm text-[var(--color-text-primary)]"
                    style={{
                        borderColor: "rgba(30,64,175,0.2)",
                        backgroundColor: "rgba(30,64,175,0.05)",
                    }}
                >
                    <span className="text-xs font-semibold text-[var(--color-primary-light)]">正确行为: </span>
                    {trade.correct_action}
                </div>
                {trade.llm_action_item && (
                    <div
                        className="mt-2 rounded-lg border p-3 text-sm text-[var(--color-text-primary)]"
                        style={{
                            borderColor: "rgba(245,158,11,0.2)",
                            backgroundColor: "rgba(245,158,11,0.05)",
                        }}
                    >
                        <span className="text-xs font-semibold text-[var(--color-cta)]">LLM 建议: </span>
                        {trade.llm_action_item}
                    </div>
                )}
            </Section>

            {/* System Info */}
            <div className="flex items-center justify-between font-mono text-xs text-[var(--color-text-muted)]">
                <span>创建: {formatDateTime(trade.created_at)}</span>
                <span>更新: {formatDateTime(trade.updated_at)}</span>
                <span>ID: {trade.id.substring(0, 8)}...</span>
            </div>
        </div>
    );
}

// ── Sub Components ────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div
            className="card-glow rounded-xl border p-5"
            style={{
                backgroundColor: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
            }}
        >
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--color-text-primary)]">
                <span style={{ color: "var(--color-primary-light)" }}>{icon}</span> {title}
            </h2>
            {children}
        </div>
    );
}

function Grid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">{children}</div>;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
            <dd className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{value}</dd>
        </div>
    );
}

function MetricCard({
    label,
    value,
    color,
    icon,
}: {
    label: string;
    value: string;
    color: string;
    icon?: React.ReactNode;
}) {
    return (
        <div
            className="card-glow rounded-xl border p-4"
            style={{
                backgroundColor: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
            }}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                {icon && <span style={{ color }}>{icon}</span>}
            </div>
            <p className="mt-1 font-mono text-xl font-bold" style={{ color }}>{value}</p>
        </div>
    );
}
