/**
 * Analytics page — data visualization dashboard with charts.
 *
 * Design system: Dark OLED, trading semantic colors, Fira Code for data.
 * Chart guidance from ui-ux-pro-max: bullish #26A69A, bearish #EF5350, primary #3B82F6.
 */

"use client";

import { useState } from "react";
import { Sparkles, Loader2, Brain, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTrades, useRulesSummary, useBatchAnalyze, useLLMCost } from "@/lib/hooks/useTrades";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
} from "recharts";

// Trading-semantic chart colors (from ui-ux-pro-max skill)
const CHART_COLORS = ["#3B82F6", "#26A69A", "#F59E0B", "#EF5350", "#8B5CF6", "#EC4899"];
const GRID_COLOR = "rgba(59, 130, 246, 0.08)";
const AXIS_COLOR = "#475569";
const TOOLTIP_STYLE = {
    backgroundColor: "rgba(10, 15, 30, 0.95)",
    border: "1px solid rgba(59, 130, 246, 0.2)",
    borderRadius: 8,
    color: "#F1F5F9",
};

export default function AnalyticsPage() {
    const { data: tradesData, isLoading } = useTrades({ page_size: "200", sort_by: "entry_date", order: "asc" });
    const { data: rulesData } = useRulesSummary();

    const trades = tradesData?.data ?? [];
    const summary = rulesData?.data;

    // PnL 累计曲线
    let cumulative = 0;
    const pnlCurveData = trades
        .filter((t) => t.pnl_amount !== null)
        .map((t) => {
            cumulative += t.pnl_amount!;
            return {
                date: new Date(t.entry_date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
                pnl: t.pnl_amount!,
                cumulative: Number(cumulative.toFixed(2)),
            };
        });

    // 胜率统计
    const wins = trades.filter((t) => t.pnl_flag === "盈利").length;
    const losses = trades.filter((t) => t.pnl_flag === "亏损").length;
    const breakeven = trades.filter((t) => t.pnl_flag === "保本出局").length;
    const winRateData = [
        { name: "盈利", value: wins },
        { name: "亏损", value: losses },
        { name: "保本", value: breakeven },
    ].filter((d) => d.value > 0);

    // 结果类型分布
    const resultDist: Record<string, number> = {};
    trades.forEach((t) => {
        if (t.result_type) {
            resultDist[t.result_type] = (resultDist[t.result_type] || 0) + 1;
        }
    });
    const resultDistData = Object.entries(resultDist).map(([name, value]) => ({
        name,
        value,
    }));

    // 错误类型分布
    const errorData = summary
        ? [
            { name: "执行层", count: summary.execution_errors_count },
            { name: "模式层", count: summary.pattern_errors_count },
            { name: "环境层", count: summary.environment_errors_count },
        ]
        : [];

    const isEmpty = trades.length === 0;

    const batchAnalyze = useBatchAnalyze();
    const { data: costData } = useLLMCost();
    const [analyzeMsg, setAnalyzeMsg] = useState<string | null>(null);

    const analyzedCount = trades.filter((t) => t.llm_analysis_status === "Completed").length;
    const unanalyzedTrades = trades.filter(
        (t) => !t.llm_analysis_status || t.llm_analysis_status === "Pending" || t.llm_analysis_status === "Failed"
    );

    const handleBatchAnalyze = async () => {
        if (unanalyzedTrades.length === 0) {
            return;
        }
        setAnalyzeMsg(null);
        try {
            const res = await batchAnalyze.mutateAsync({ tradeIds: unanalyzedTrades.map((t) => t.id) });
            setAnalyzeMsg(`分析完成: ${res.data?.succeeded ?? 0} 条成功${(res.data?.failed ?? 0) > 0 ? `，${res.data?.failed} 条失败` : ""}`);
        } catch {
            setAnalyzeMsg("批量分析失败，请稍后重试");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">数据分析</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    基于 <span className="font-mono">{trades.length}</span> 条交易记录的可视化分析
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="skeleton h-80 rounded-xl lg:col-span-2" />
                    <div className="skeleton h-72 rounded-xl" />
                    <div className="skeleton h-72 rounded-xl" />
                </div>
            ) : isEmpty ? (
                <div
                    className="flex h-[40vh] items-center justify-center rounded-xl border text-[var(--color-text-muted)]"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-card)" }}
                >
                    暂无足够数据用于分析。请先录入交易记录。
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* PnL Curve */}
                    <ChartCard title="累计盈亏曲线" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={pnlCurveData}>
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                                <XAxis dataKey="date" stroke={AXIS_COLOR} tick={{ fontSize: 12 }} />
                                <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Line type="monotone" dataKey="cumulative" stroke="#3B82F6" strokeWidth={2} dot={false} name="累计盈亏" />
                                <Legend />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Win Rate Pie */}
                    <ChartCard title="胜率分布">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={winRateData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {winRateData.map((_, i) => (
                                        <Cell key={i} fill={["#26A69A", "#EF5350", "#64748B"][i]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Result Type Distribution */}
                    <ChartCard title="结果归因分布">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={resultDistData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }: any) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {resultDistData.map((_, i) => (
                                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* Error Distribution Bar */}
                    <ChartCard title="错误层级分布" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={errorData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                                <XAxis type="number" stroke={AXIS_COLOR} tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" stroke={AXIS_COLOR} tick={{ fontSize: 12 }} width={80} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="错误数" />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>

                    {/* LLM Insights Panel */}
                    <div
                        className="card-glow rounded-xl border p-5 lg:col-span-2"
                        style={{ borderColor: "rgba(245,158,11,0.3)", backgroundColor: "var(--color-bg-card)" }}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Brain className="h-5 w-5 text-[var(--color-cta)]" />
                                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">AI 分析洞察</h3>
                            </div>
                            <button
                                onClick={handleBatchAnalyze}
                                disabled={batchAnalyze.isPending || unanalyzedTrades.length === 0}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    background: "linear-gradient(135deg, var(--color-cta), #D97706)",
                                    color: "#000",
                                }}
                            >
                                {batchAnalyze.isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="h-3.5 w-3.5" />
                                )}
                                {batchAnalyze.isPending
                                    ? "分析中..."
                                    : unanalyzedTrades.length > 0
                                        ? `分析 ${unanalyzedTrades.length} 条`
                                        : "全部已分析"}
                            </button>
                        </div>

                        {analyzeMsg && (
                            <div className="mb-4 rounded-lg border border-[rgba(38,166,154,0.3)] bg-[rgba(38,166,154,0.05)] px-3 py-2 text-xs text-[var(--color-bullish)]">
                                {analyzeMsg}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
                                <p className="text-xs text-[var(--color-text-muted)]">已分析</p>
                                <p className="mt-1 font-mono text-lg font-bold text-[var(--color-bullish)]">
                                    {analyzedCount}<span className="text-xs text-[var(--color-text-muted)]">/{trades.length}</span>
                                </p>
                            </div>
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
                                <p className="text-xs text-[var(--color-text-muted)]">待分析</p>
                                <p className="mt-1 font-mono text-lg font-bold text-[var(--color-cta)]">{unanalyzedTrades.length}</p>
                            </div>
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
                                <p className="text-xs text-[var(--color-text-muted)]">API 调用</p>
                                <p className="mt-1 font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                    {costData?.data?.total_calls ?? 0}
                                </p>
                            </div>
                            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-3">
                                <p className="text-xs text-[var(--color-text-muted)]">Token 用量</p>
                                <p className="mt-1 font-mono text-lg font-bold text-[var(--color-text-primary)]">
                                    {((costData?.data?.total_prompt_tokens ?? 0) + (costData?.data?.total_completion_tokens ?? 0)).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ChartCard({
    title,
    children,
    className = "",
}: {
    title: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`card-glow rounded-xl border p-5 ${className}`}
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-card)" }}
        >
            <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-secondary)]">{title}</h3>
            {children}
        </div>
    );
}
