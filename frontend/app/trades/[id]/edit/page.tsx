/**
 * Trade edit page — loads existing trade data into form for editing.
 *
 * Design system: Dark OLED, CSS variables, Fira Sans/Code.
 */

"use client";

import { use, useEffect, forwardRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { tradeCreateSchema, type TradeFormValues } from "@/lib/validations/trade";
import { useTrade, useUpdateTrade } from "@/lib/hooks/useTrades";
import {
    ACCOUNT_TYPES,
    TRADE_CYCLES,
    MARKET_ENVIRONMENTS,
    SECTOR_STATUSES,
    SELECTION_DIMENSIONS,
    STRATEGY_PATTERNS,
    PLAN_ADHERENCES,
    STOP_LOSS_DISCIPLINES,
    EXIT_TYPES,
    PSYCHOLOGICAL_STATES,
    RESULT_TYPES,
    ERROR_LEVELS,
} from "@/types/trade";
import Link from "next/link";

export default function EditTradePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const { data, isLoading } = useTrade(id);
    const updateMutation = useUpdateTrade();
    const trade = data?.data;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<TradeFormValues>({
        resolver: zodResolver(tradeCreateSchema) as any,
    });

    // Populate form when trade data loads
    useEffect(() => {
        if (trade) {
            reset({
                account_type: trade.account_type,
                stock_code: trade.stock_code,
                stock_name: trade.stock_name ?? "",
                trade_cycle: trade.trade_cycle,
                entry_date: trade.entry_date?.slice(0, 16),
                exit_date: trade.exit_date?.slice(0, 16) ?? "",
                entry_price: trade.entry_price,
                exit_price: trade.exit_price ?? undefined,
                position_size: trade.position_size,
                preset_stop_loss: trade.preset_stop_loss ?? undefined,
                preset_take_profit: trade.preset_take_profit ?? undefined,
                slippage: trade.slippage ?? undefined,
                market_environment: trade.market_environment ?? "",
                sector_status: trade.sector_status ?? "",
                selection_dimension: trade.selection_dimension ?? [],
                strategy_pattern: trade.strategy_pattern ?? [],
                thesis_statement: trade.thesis_statement ?? "",
                volume_profile: trade.volume_profile ?? "",
                plan_adherence: trade.plan_adherence ?? "",
                stop_loss_discipline: trade.stop_loss_discipline ?? "",
                exit_type: trade.exit_type ?? "",
                exit_reason: trade.exit_reason ?? "",
                psychological_state: trade.psychological_state ?? "",
                result_type: trade.result_type ?? "",
                error_level: trade.error_level ?? "",
                environment_mismatch_flag: trade.environment_mismatch_flag ?? false,
                permanent_exclusion_flag: trade.permanent_exclusion_flag ?? false,
                correct_action: trade.correct_action ?? "",
            } as any);
        }
    }, [trade, reset]);

    const onSubmit = async (values: TradeFormValues) => {
        if (!trade) return;
        const cleaned: Record<string, unknown> = { version: trade.version };
        for (const [k, v] of Object.entries(values)) {
            if (v === "" || v === undefined) continue;
            cleaned[k] = v;
        }
        try {
            await updateMutation.mutateAsync({ id, data: cleaned as any });
            router.push(`/trades/${id}`);
        } catch { }
    };

    if (isLoading) {
        return (
            <div className="mx-auto max-w-3xl space-y-6">
                <div className="skeleton h-12 w-48 rounded-lg" />
                <div className="skeleton h-64 rounded-xl" />
                <div className="skeleton h-32 rounded-xl" />
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <p style={{ color: "var(--color-bearish)" }}>交易记录不存在</p>
                <Link href="/trades" className="text-sm text-[var(--color-primary-light)] hover:underline">
                    返回列表
                </Link>
            </div>
        );
    }

    const fieldsetStyle = {
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-bg-card)",
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/trades/${id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border transition-all"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
                        编辑交易 — {trade.stock_code}
                    </h1>
                    <p className="font-mono text-sm text-[var(--color-text-muted)]">
                        版本 {trade.version}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* 基础信息 */}
                <fieldset className="rounded-xl border p-5 space-y-4" style={fieldsetStyle}>
                    <legend className="px-2 text-sm font-semibold text-[var(--color-text-secondary)]">基础信息</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect label="账户类型" options={ACCOUNT_TYPES} {...register("account_type")} error={errors.account_type?.message} />
                        <FormInput label="股票代码" {...register("stock_code")} error={errors.stock_code?.message} />
                        <FormInput label="股票名称" {...register("stock_name")} />
                        <FormSelect label="交易周期" options={TRADE_CYCLES} {...register("trade_cycle")} error={errors.trade_cycle?.message} />
                        <FormInput label="买入时间" type="datetime-local" {...register("entry_date")} error={errors.entry_date?.message} />
                        <FormInput label="卖出时间" type="datetime-local" {...register("exit_date")} />
                        <FormInput label="买入价" type="number" step="0.01" {...register("entry_price", { valueAsNumber: true })} error={errors.entry_price?.message} />
                        <FormInput label="卖出价" type="number" step="0.01" {...register("exit_price", { valueAsNumber: true })} />
                        <FormInput label="仓位%" type="number" {...register("position_size", { valueAsNumber: true })} error={errors.position_size?.message} />
                        <FormInput label="滑点" type="number" step="0.01" {...register("slippage", { valueAsNumber: true })} />
                    </div>
                </fieldset>

                {/* 决策环境 */}
                <fieldset className="rounded-xl border p-5 space-y-4" style={fieldsetStyle}>
                    <legend className="px-2 text-sm font-semibold text-[var(--color-text-secondary)]">决策环境</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect label="市场环境" options={["", ...MARKET_ENVIRONMENTS]} {...register("market_environment")} />
                        <FormSelect label="板块阶段" options={["", ...SECTOR_STATUSES]} {...register("sector_status")} />
                    </div>
                    <FormTextarea label="交易论点" {...register("thesis_statement")} />
                </fieldset>

                {/* 执行评估 */}
                <fieldset className="rounded-xl border p-5 space-y-4" style={fieldsetStyle}>
                    <legend className="px-2 text-sm font-semibold text-[var(--color-text-secondary)]">执行评估</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect label="计划执行度" options={["", ...PLAN_ADHERENCES]} {...register("plan_adherence")} />
                        <FormSelect label="止损纪律" options={["", ...STOP_LOSS_DISCIPLINES]} {...register("stop_loss_discipline")} />
                        <FormSelect label="离场类型" options={["", ...EXIT_TYPES]} {...register("exit_type")} />
                        <FormSelect label="心理状态" options={["", ...PSYCHOLOGICAL_STATES]} {...register("psychological_state")} />
                    </div>
                </fieldset>

                {/* 归因反思 */}
                <fieldset className="rounded-xl border p-5 space-y-4" style={fieldsetStyle}>
                    <legend className="px-2 text-sm font-semibold text-[var(--color-text-secondary)]">归因反思</legend>
                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect label="结果类型" options={["", ...RESULT_TYPES]} {...register("result_type")} />
                        <FormSelect label="错误层级" options={["", ...ERROR_LEVELS]} {...register("error_level")} />
                    </div>
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <input type="checkbox" {...register("environment_mismatch_flag")} className="rounded" />
                            环境错配
                        </label>
                        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                            <input type="checkbox" {...register("permanent_exclusion_flag")} className="rounded" />
                            永久排除
                        </label>
                    </div>
                    <FormTextarea label="正确行为" {...register("correct_action")} error={errors.correct_action?.message} />
                </fieldset>

                {/* Submit */}
                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={updateMutation.isPending || !isDirty}
                        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40"
                        style={{ backgroundColor: "var(--color-primary)", boxShadow: "var(--glow-primary)" }}
                    >
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        保存修改
                    </button>
                    <Link
                        href={`/trades/${id}`}
                        className="rounded-lg border px-5 py-2.5 text-sm transition-all"
                        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                        取消
                    </Link>
                </div>

                {updateMutation.isError && (
                    <p className="text-sm" style={{ color: "var(--color-bearish)" }}>保存失败，请重试</p>
                )}
            </form>
        </div>
    );
}

// ── Form Components ──────────────────────────────────────────────

const inputStyle = {
    borderColor: "var(--color-border)",
    backgroundColor: "var(--color-bg-surface)",
};

const FormInput = forwardRef<
    HTMLInputElement,
    { label: string; error?: string;[k: string]: any }
>(({ label, error, ...props }, ref) => (
    <div>
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{label}</label>
        <input
            ref={ref}
            className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
            style={inputStyle}
            {...props}
        />
        {error && <p className="mt-1 text-xs" style={{ color: "var(--color-bearish)" }}>{error}</p>}
    </div>
));
FormInput.displayName = "FormInput";

const FormSelect = forwardRef<
    HTMLSelectElement,
    { label: string; options: readonly string[]; error?: string;[k: string]: any }
>(({ label, options, error, ...props }, ref) => (
    <div>
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{label}</label>
        <select
            ref={ref}
            className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
            style={inputStyle}
            {...props}
        >
            {options.map((o: string) => (
                <option key={o} value={o}>{o || `选择${label}`}</option>
            ))}
        </select>
        {error && <p className="mt-1 text-xs" style={{ color: "var(--color-bearish)" }}>{error}</p>}
    </div>
));
FormSelect.displayName = "FormSelect";

const FormTextarea = forwardRef<
    HTMLTextAreaElement,
    { label: string; error?: string;[k: string]: any }
>(({ label, error, ...props }, ref) => (
    <div>
        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">{label}</label>
        <textarea
            ref={ref}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none"
            style={inputStyle}
            {...props}
        />
        {error && <p className="mt-1 text-xs" style={{ color: "var(--color-bearish)" }}>{error}</p>}
    </div>
));
FormTextarea.displayName = "FormTextarea";
