/**
 * Trade list page — displays all trades with filtering, pagination, and sorting.
 *
 * Design system: Dark OLED, #1E40AF primary, #F59E0B CTA, Fira Sans/Code.
 */

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { FilePlus, Search, TrendingDown, TrendingUp, Trash2, Download, Upload, Pencil, Loader2 } from "lucide-react";
import { useTrades, useDeleteTrade } from "@/lib/hooks/useTrades";
import { getAccessToken } from "@/lib/auth";
import { formatDate, pnlColor, formatPercent } from "@/lib/utils";
import {
    ACCOUNT_TYPES,
    MARKET_ENVIRONMENTS,
    RESULT_TYPES,
    TRADE_CYCLES,
} from "@/types/trade";

function csvCell(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "";
    }
    const s = String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function exportCSV(trades: any[]) {
    const headers = [
        "账户类型", "股票代码", "股票名称", "交易周期",
        "买入时间", "卖出时间", "仓位%", "买入价", "卖出价",
        "预设止损", "预设止盈", "滑点", "最大浮盈", "最大浮亏",
        "市场环境", "板块地位", "选股维度", "策略模式",
        "量能特征", "交易论点",
        "计划执行度", "止损纪律", "离场类型", "离场原因", "心理状态",
        "结果归因", "错误层级", "环境错配", "永久排除", "正确行为",
    ];
    const rows = trades.map((t) => [
        csvCell(t.account_type),
        csvCell(t.stock_code),
        csvCell(t.stock_name),
        csvCell(t.trade_cycle),
        csvCell(t.entry_date?.slice(0, 19)),
        csvCell(t.exit_date?.slice(0, 19)),
        csvCell(t.position_size),
        csvCell(t.entry_price),
        csvCell(t.exit_price),
        csvCell(t.preset_stop_loss),
        csvCell(t.preset_take_profit),
        csvCell(t.slippage),
        csvCell(t.max_favorable_excursion),
        csvCell(t.max_adverse_excursion),
        csvCell(t.market_environment),
        csvCell(t.sector_status),
        csvCell(t.selection_dimension?.join?.(";")),
        csvCell(t.strategy_pattern?.join?.(";")),
        csvCell(t.volume_profile),
        csvCell(t.thesis_statement),
        csvCell(t.plan_adherence),
        csvCell(t.stop_loss_discipline),
        csvCell(t.exit_type),
        csvCell(t.exit_reason),
        csvCell(t.psychological_state),
        csvCell(t.result_type),
        csvCell(t.error_level),
        csvCell(t.environment_mismatch_flag === true ? "是" : t.environment_mismatch_flag === false ? "否" : ""),
        csvCell(t.permanent_exclusion_flag === true ? "是" : t.permanent_exclusion_flag === false ? "否" : ""),
        csvCell(t.correct_action),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trades_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function TradesListPage() {
    const [page, setPage] = useState(1);
    const [filters, setFilters] = useState<Record<string, string>>({});
    const [sortBy, setSortBy] = useState("entry_date");
    const [order, setOrder] = useState("desc");
    const [importing, setImporting] = useState(false);
    const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const params: Record<string, string> = {
        page: String(page),
        page_size: "20",
        sort_by: sortBy,
        order,
        ...filters,
    };

    const { data, isLoading, error, refetch } = useTrades(params);
    const deleteMutation = useDeleteTrade();

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        setImporting(true);
        setImportMsg(null);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const token = getAccessToken();
            const res = await fetch(`${API_BASE}/api/trades/import`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });
            const json = await res.json();
            if (json.success) {
                setImportMsg({
                    type: "success",
                    text: `导入完成: ${json.data?.success_count ?? 0} 条成功${json.data?.failure_count ? `，${json.data.failure_count} 条失败` : ""}`,
                });
                refetch();
            } else {
                setImportMsg({ type: "error", text: json.message || "导入失败" });
            }
        } catch {
            setImportMsg({ type: "error", text: "导入请求失败，请检查网络" });
        } finally {
            setImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const trades = data?.data ?? [];
    const pagination = data?.pagination;

    const handleFilter = (key: string, value: string) => {
        setFilters((prev) => {
            if (!value) {
                const next = { ...prev };
                delete next[key];
                return next;
            }
            return { ...prev, [key]: value };
        });
        setPage(1);
    };

    const toggleSort = (field: string) => {
        if (sortBy === field) {
            setOrder((o) => (o === "desc" ? "asc" : "desc"));
        } else {
            setSortBy(field);
            setOrder("desc");
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">交易列表</h1>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                        管理和浏览所有交易记录
                    </p>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleImportCSV}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                        style={{
                            borderColor: "var(--color-border)",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        导入 CSV
                    </button>
                    <button
                        onClick={() => trades.length && exportCSV(trades)}
                        disabled={!trades.length}
                        className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
                        style={{
                            borderColor: "var(--color-border)",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <Download className="h-4 w-4" />
                        导出 CSV
                    </button>
                    <Link
                        href="/trades/new"
                        className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all"
                        style={{
                            backgroundColor: "var(--color-primary)",
                            boxShadow: "var(--glow-primary)",
                        }}
                    >
                        <FilePlus className="h-4 w-4" />
                        新建交易
                    </Link>
                </div>
            </div>

            {/* Import result message */}
            {importMsg && (
                <div
                    className="flex items-center gap-2 rounded-lg border px-4 py-3 text-sm"
                    style={{
                        borderColor: importMsg.type === "success" ? "rgba(38,166,154,0.3)" : "rgba(239,83,80,0.3)",
                        backgroundColor: importMsg.type === "success" ? "rgba(38,166,154,0.05)" : "rgba(239,83,80,0.05)",
                        color: importMsg.type === "success" ? "var(--color-bullish)" : "var(--color-bearish)",
                    }}
                >
                    {importMsg.text}
                    <button
                        onClick={() => setImportMsg(null)}
                        className="ml-auto cursor-pointer text-xs opacity-60 hover:opacity-100"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Filters */}
            <div
                className="flex flex-wrap gap-3 rounded-xl border p-4"
                style={{
                    backgroundColor: "var(--color-bg-card)",
                    borderColor: "var(--color-border)",
                }}
            >
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="搜索股票代码..."
                        className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:border-[var(--color-primary-light)] focus:outline-none"
                        style={{
                            borderColor: "var(--color-border)",
                            backgroundColor: "var(--color-bg-surface)",
                        }}
                        onChange={(e) => handleFilter("stock_code", e.target.value)}
                    />
                </div>
                <FilterSelect label="账户" options={ACCOUNT_TYPES} onChange={(v) => handleFilter("account_type", v)} />
                <FilterSelect label="周期" options={TRADE_CYCLES} onChange={(v) => handleFilter("trade_cycle", v)} />
                <FilterSelect label="市场环境" options={MARKET_ENVIRONMENTS} onChange={(v) => handleFilter("market_environment", v)} />
                <FilterSelect label="结果类型" options={RESULT_TYPES} onChange={(v) => handleFilter("result_type", v)} />
            </div>

            {/* Table */}
            <div
                className="overflow-hidden rounded-xl border"
                style={{
                    backgroundColor: "var(--color-bg-card)",
                    borderColor: "var(--color-border)",
                }}
            >
                {isLoading ? (
                    <div className="space-y-0">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="skeleton mx-4 my-3 h-10 rounded-lg" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="py-20 text-center text-sm" style={{ color: "var(--color-bearish)" }}>加载失败</div>
                ) : trades.length === 0 ? (
                    <div className="py-20 text-center text-sm text-[var(--color-text-muted)]">
                        暂无交易记录。
                        <Link href="/trades/new" className="ml-1 text-[var(--color-primary-light)] hover:underline">
                            创建第一条
                        </Link>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr
                                className="border-b text-left text-xs"
                                style={{
                                    borderColor: "var(--color-border)",
                                    color: "var(--color-text-muted)",
                                }}
                            >
                                <ThSortable label="日期" field="entry_date" sortBy={sortBy} order={order} onSort={toggleSort} />
                                <th className="px-4 py-3">代码</th>
                                <th className="px-4 py-3">名称</th>
                                <th className="px-4 py-3">周期</th>
                                <ThSortable label="仓位%" field="position_size" sortBy={sortBy} order={order} onSort={toggleSort} />
                                <ThSortable label="盈亏比" field="pnl_ratio" sortBy={sortBy} order={order} onSort={toggleSort} />
                                <th className="px-4 py-3">结果</th>
                                <th className="px-4 py-3">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map((t) => (
                                <tr
                                    key={t.id}
                                    className="border-b transition-all"
                                    style={{ borderColor: "rgba(59,130,246,0.06)" }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "var(--color-bg-card-hover)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "transparent";
                                    }}
                                >
                                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">
                                        {formatDate(t.entry_date)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/trades/${t.id}`}
                                            className="font-medium text-[var(--color-primary-light)] hover:underline"
                                        >
                                            {t.stock_code}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                                        {t.stock_name || "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className="rounded-full px-2 py-0.5 text-xs"
                                            style={{
                                                backgroundColor: "var(--color-primary-glow)",
                                                color: "var(--color-primary-light)",
                                            }}
                                        >
                                            {t.trade_cycle}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">
                                        {t.position_size}%
                                    </td>
                                    <td className="px-4 py-3 font-mono font-medium"
                                        style={{
                                            color: t.pnl_flag === "盈利" ? "var(--color-bullish)"
                                                : t.pnl_flag === "亏损" ? "var(--color-bearish)"
                                                    : "var(--color-neutral)",
                                        }}
                                    >
                                        {formatPercent(t.pnl_ratio)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {t.result_type ? (
                                            <span
                                                className="rounded-full px-2 py-0.5 text-xs"
                                                style={{
                                                    backgroundColor: t.result_type === "正确盈利" ? "rgba(38,166,154,0.15)"
                                                        : t.result_type === "运气盈利" ? "rgba(245,158,11,0.15)"
                                                            : "rgba(239,83,80,0.15)",
                                                    color: t.result_type === "正确盈利" ? "var(--color-bullish)"
                                                        : t.result_type === "运气盈利" ? "var(--color-cta)"
                                                            : "var(--color-bearish)",
                                                }}
                                            >
                                                {t.result_type}
                                            </span>
                                        ) : (
                                            <span className="text-[var(--color-text-muted)]">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1">
                                            <Link
                                                href={`/trades/${t.id}/edit`}
                                                className="rounded p-1 text-[var(--color-text-muted)] transition-all hover:text-[var(--color-primary-light)]"
                                                title="编辑"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (confirm("确定要删除这条交易记录吗？")) {
                                                        deleteMutation.mutate(t.id);
                                                    }
                                                }}
                                                className="rounded p-1 text-[var(--color-text-muted)] transition-all hover:text-[var(--color-bearish)]"
                                                title="删除"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-muted)]">
                        共 {pagination.total} 条，第 {pagination.page}/{pagination.total_pages} 页
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="rounded-lg border px-3 py-1.5 text-[var(--color-text-secondary)] transition-all disabled:opacity-40"
                            style={{ borderColor: "var(--color-border)" }}
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                            disabled={page >= pagination.total_pages}
                            className="rounded-lg border px-3 py-1.5 text-[var(--color-text-secondary)] transition-all disabled:opacity-40"
                            style={{ borderColor: "var(--color-border)" }}
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function FilterSelect({
    label,
    options,
    onChange,
}: {
    label: string;
    options: readonly string[];
    onChange: (v: string) => void;
}) {
    return (
        <select
            className="rounded-lg border px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:border-[var(--color-primary-light)] focus:outline-none"
            style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-bg-surface)",
            }}
            onChange={(e) => onChange(e.target.value)}
            defaultValue=""
        >
            <option value="">{label} (全部)</option>
            {options.map((o) => (
                <option key={o} value={o}>
                    {o}
                </option>
            ))}
        </select>
    );
}

function ThSortable({
    label,
    field,
    sortBy,
    order,
    onSort,
}: {
    label: string;
    field: string;
    sortBy: string;
    order: string;
    onSort: (f: string) => void;
}) {
    const active = sortBy === field;
    return (
        <th
            className="px-4 py-3 select-none transition-colors hover:text-[var(--color-text-secondary)]"
            onClick={() => onSort(field)}
        >
            {label}
            {active && (
                <span className="ml-1" style={{ color: "var(--color-primary-light)" }}>
                    {order === "desc" ? "↓" : "↑"}
                </span>
            )}
        </th>
    );
}
