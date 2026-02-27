/**
 * Analytics page — data visualization dashboard with charts.
 *
 * Design system: Dark OLED, trading semantic colors, Fira Code for data.
 * Chart guidance from ui-ux-pro-max: bullish #26A69A, bearish #EF5350, primary #3B82F6.
 */

"use client";

import { useTrades, useRulesSummary } from "@/lib/hooks/useTrades";
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
