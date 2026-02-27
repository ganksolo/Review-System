/**
 * Dashboard page — system overview with key metrics.
 *
 * Design system: Dark OLED, #1E40AF primary, #F59E0B CTA, Fira Sans/Code.
 */

"use client";

import Link from "next/link";
import { BarChart3, BookOpen, FilePlus, List, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { useTrades, useRulesSummary } from "@/lib/hooks/useTrades";

export default function DashboardPage() {
  const { data: tradesData, isLoading: tradesLoading } = useTrades({ page_size: "5", sort_by: "created_at", order: "desc" });
  const { data: rulesData, isLoading: rulesLoading } = useRulesSummary();

  const summary = rulesData?.data;
  const recentTrades = tradesData?.data ?? [];
  const total = tradesData?.pagination?.total ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          交易复盘仪表板
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          系统概览 — 追踪交易表现，持续优化交易系统
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rulesLoading ? (
          <>
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
            <div className="skeleton h-28 rounded-xl" />
          </>
        ) : (
          <>
            <StatCard
              title="总交易数"
              value={summary?.total_trades ?? total}
              icon={<List className="h-5 w-5" />}
              color="primary"
            />
            <StatCard
              title="正确行为"
              value={summary?.correct_behaviors_count ?? 0}
              icon={<Target className="h-5 w-5" />}
              color="bullish"
            />
            <StatCard
              title="永久排除"
              value={summary?.permanent_exclusions_count ?? 0}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="bearish"
            />
            <StatCard
              title="环境错配"
              value={summary?.environment_mismatches_count ?? 0}
              icon={<BarChart3 className="h-5 w-5" />}
              color="cta"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickAction href="/trades/new" icon={<FilePlus />} label="新建交易记录" desc="记录今日交易，开始复盘" />
        <QuickAction href="/trades" icon={<List />} label="查看交易列表" desc="浏览和管理所有交易记录" />
        <QuickAction href="/rules" icon={<BookOpen />} label="查看规则库" desc="动态规则库：排除、正确行为" />
      </div>

      {/* Recent Trades */}
      <div
        className="card-glow rounded-xl border p-5"
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">最近交易</h2>
          <Link href="/trades" className="text-sm text-[var(--color-primary-light)] hover:underline">
            查看全部 →
          </Link>
        </div>

        {tradesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : recentTrades.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            暂无交易记录。
            <Link href="/trades/new" className="ml-1 text-[var(--color-primary-light)] hover:underline">
              创建第一条记录
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            {recentTrades.map((trade) => (
              <Link
                key={trade.id}
                href={`/trades/${trade.id}`}
                className="flex items-center justify-between rounded-lg border px-4 py-3 transition-all hover:border-[var(--color-border-hover)]"
                style={{
                  borderColor: "var(--color-border)",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-bg-card-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div className="flex items-center gap-3">
                  {trade.pnl_flag === "盈利" ? (
                    <TrendingUp className="h-4 w-4" style={{ color: "var(--color-bullish)" }} />
                  ) : trade.pnl_flag === "亏损" ? (
                    <TrendingDown className="h-4 w-4" style={{ color: "var(--color-bearish)" }} />
                  ) : (
                    <Target className="h-4 w-4" style={{ color: "var(--color-neutral)" }} />
                  )}
                  <div>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {trade.stock_code}
                    </span>
                    {trade.stock_name && (
                      <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                        {trade.stock_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    {new Date(trade.entry_date).toLocaleDateString("zh-CN")}
                  </span>
                  {trade.pnl_ratio !== null && (
                    <span
                      className="font-mono font-medium"
                      style={{
                        color: trade.pnl_flag === "盈利" ? "var(--color-bullish)"
                          : trade.pnl_flag === "亏损" ? "var(--color-bearish)"
                            : "var(--color-neutral)",
                      }}
                    >
                      {trade.pnl_ratio >= 0 ? "+" : ""}
                      {trade.pnl_ratio.toFixed(2)}%
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
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
      className="card-glow rounded-xl border p-5"
      style={{
        background: s.bg,
        borderColor: s.border,
        boxShadow: s.glow,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</span>
        <span style={{ color: s.iconColor }}>{icon}</span>
      </div>
      <p className="mt-2 font-mono text-3xl font-bold text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group card-glow flex items-start gap-4 rounded-xl border p-5 transition-all"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderColor: "var(--color-border)",
      }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all"
        style={{
          backgroundColor: "var(--color-primary-glow)",
          color: "var(--color-primary-light)",
        }}
      >
        {icon}
      </div>
      <div>
        <p className="font-medium text-[var(--color-text-primary)]">{label}</p>
        <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">{desc}</p>
      </div>
    </Link>
  );
}
