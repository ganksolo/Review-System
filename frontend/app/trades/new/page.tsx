/**
 * New Trade page — 4-step form for creating a trade record.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tradeCreateSchema, type TradeFormValues } from "@/lib/validations/trade";
import { useCreateTrade } from "@/lib/hooks/useTrades";
import DateTimePicker from "@/components/DateTimePicker";
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

const STEPS = ["基础信息", "决策环境", "执行评估", "归因反思"];
const DRAFT_KEY = "trade-draft";

function loadDraft(): Partial<TradeFormValues> | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export default function NewTradePage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const createMutation = useCreateTrade();

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        trigger,
        formState: { errors },
    } = useForm<TradeFormValues>({
        resolver: zodResolver(tradeCreateSchema) as any,
        defaultValues: {
            account_type: "短线账户",
            trade_cycle: "短线",
            position_size: 10,
            selection_dimension: [],
            strategy_pattern: [],
            environment_mismatch_flag: false,
            permanent_exclusion_flag: false,
        },
    });

    // Client-only: restore draft or set today as default entry_date
    useEffect(() => {
        const draft = loadDraft();
        if (draft) {
            reset({
                account_type: "短线账户",
                trade_cycle: "短线",
                position_size: 10,
                selection_dimension: [],
                strategy_pattern: [],
                environment_mismatch_flag: false,
                permanent_exclusion_flag: false,
                ...draft,
            });
            if (!draft.entry_date) {
                setValue("entry_date", `${format(new Date(), "yyyy-MM-dd")}T09:30`);
            }
        } else {
            setValue("entry_date", `${format(new Date(), "yyyy-MM-dd")}T09:30`);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Auto-save draft on change
    useEffect(() => {
        const sub = watch((values) => {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
            } catch { }
        });
        return () => sub.unsubscribe();
    }, [watch]);

    const stepFields: (keyof TradeFormValues)[][] = [
        ["account_type", "stock_code", "trade_cycle", "entry_date", "entry_price", "position_size"],
        ["market_environment", "sector_status"],
        ["plan_adherence", "stop_loss_discipline", "exit_type", "psychological_state"],
        ["correct_action"],
    ];

    const nextStep = async () => {
        const valid = await trigger(stepFields[step]);
        if (valid && step < 3) setStep(step + 1);
    };

    const prevStep = () => {
        if (step > 0) setStep(step - 1);
    };

    const onSubmit = async (values: TradeFormValues) => {
        // Clean up empty string values
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(values)) {
            if (v === "" || v === undefined) continue;
            cleaned[k] = v;
        }

        try {
            await createMutation.mutateAsync(cleaned as any);
            localStorage.removeItem(DRAFT_KEY);
            router.push("/trades");
        } catch (err) {
            // Error is handled by mutation state
        }
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">新建交易记录</h1>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    10 分钟快速复盘 — 分 4 步填写
                </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                {STEPS.map((label, i) => (
                    <div key={label} className="flex items-center gap-2">
                        <button
                            onClick={() => i < step && setStep(i)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${i < step
                                ? "text-white"
                                : i === step
                                    ? "border-2 text-[var(--color-primary-light)]"
                                    : "border text-[var(--color-text-muted)]"
                                }`}
                            style={i < step ? { backgroundColor: "var(--color-primary)" } : i === step ? { borderColor: "var(--color-primary-light)" } : { borderColor: "var(--color-border)" }}
                        >
                            {i < step ? <Check className="h-4 w-4" /> : i + 1}
                        </button>
                        <span
                            className={`text-sm ${i === step ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}
                        >
                            {label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <div
                                className={`h-px w-8 ${i < step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg-card)" }}>
                    {/* Step 1: 基础信息 */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">基础交易信息</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="账户类型" error={errors.account_type?.message} required>
                                    <ChipSelect
                                        options={ACCOUNT_TYPES}
                                        value={watch("account_type")}
                                        onChange={(v) => setValue("account_type", v as any)}
                                    />
                                </FormField>
                                <FormField label="交易周期" error={errors.trade_cycle?.message} required>
                                    <ChipSelect
                                        options={TRADE_CYCLES}
                                        value={watch("trade_cycle")}
                                        onChange={(v) => setValue("trade_cycle", v as any)}
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="股票代码" error={errors.stock_code?.message} required>
                                    <input {...register("stock_code")} placeholder="000001" className="form-input" />
                                </FormField>
                                <FormField label="股票名称" error={errors.stock_name?.message}>
                                    <input {...register("stock_name")} placeholder="平安银行" className="form-input" />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="买入时间" error={errors.entry_date?.message} required>
                                    <DateTimePicker
                                        value={watch("entry_date")}
                                        onChange={(v) => setValue("entry_date", v, { shouldValidate: true })}
                                        placeholder="选择买入时间"
                                    />
                                </FormField>
                                <FormField label="卖出时间" error={errors.exit_date?.message}>
                                    <DateTimePicker
                                        value={watch("exit_date")}
                                        onChange={(v) => setValue("exit_date", v, { shouldValidate: true })}
                                        placeholder="选择卖出时间"
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField label="买入价" error={errors.entry_price?.message} required>
                                    <input type="number" step="0.01" {...register("entry_price")} placeholder="12.50" className="form-input" />
                                </FormField>
                                <FormField label="卖出价" error={errors.exit_price?.message}>
                                    <input type="number" step="0.01" {...register("exit_price")} placeholder="13.10" className="form-input" />
                                </FormField>
                                <FormField label="仓位 (%)" error={errors.position_size?.message} required>
                                    <input type="number" step="1" {...register("position_size")} className="form-input" />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField label="预设止损价">
                                    <input type="number" step="0.01" {...register("preset_stop_loss")} className="form-input" />
                                </FormField>
                                <FormField label="预设止盈价">
                                    <input type="number" step="0.01" {...register("preset_take_profit")} className="form-input" />
                                </FormField>
                                <FormField label="滑点">
                                    <input type="number" step="0.01" {...register("slippage")} className="form-input" />
                                </FormField>
                            </div>
                        </div>
                    )}

                    {/* Step 2: 决策环境 */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white">决策环境快照</h2>

                            <FormField label="市场环境">
                                <ChipSelect
                                    options={MARKET_ENVIRONMENTS}
                                    value={watch("market_environment") || ""}
                                    onChange={(v) => setValue("market_environment", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="板块地位">
                                <ChipSelect
                                    options={SECTOR_STATUSES}
                                    value={watch("sector_status") || ""}
                                    onChange={(v) => setValue("sector_status", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="选股维度 (多选)">
                                <MultiChipSelect
                                    options={SELECTION_DIMENSIONS}
                                    value={watch("selection_dimension") || []}
                                    onChange={(v) => setValue("selection_dimension", v)}
                                />
                            </FormField>

                            <FormField label="策略模式 (多选)">
                                <MultiChipSelect
                                    options={STRATEGY_PATTERNS}
                                    value={watch("strategy_pattern") || []}
                                    onChange={(v) => setValue("strategy_pattern", v)}
                                />
                            </FormField>

                            <FormField label="交易论点">
                                <textarea
                                    {...register("thesis_statement")}
                                    placeholder="描述你的交易逻辑、入场理由..."
                                    rows={3}
                                    className="form-input"
                                />
                            </FormField>
                        </div>
                    )}

                    {/* Step 3: 执行评估 */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white">执行与心理评估</h2>

                            <FormField label="计划执行度">
                                <ChipSelect
                                    options={PLAN_ADHERENCES}
                                    value={watch("plan_adherence") || ""}
                                    onChange={(v) => setValue("plan_adherence", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="止损纪律">
                                <ChipSelect
                                    options={STOP_LOSS_DISCIPLINES}
                                    value={watch("stop_loss_discipline") || ""}
                                    onChange={(v) => setValue("stop_loss_discipline", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="离场方式">
                                <ChipSelect
                                    options={EXIT_TYPES}
                                    value={watch("exit_type") || ""}
                                    onChange={(v) => setValue("exit_type", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="心理状态">
                                <ChipSelect
                                    options={PSYCHOLOGICAL_STATES}
                                    value={watch("psychological_state") || ""}
                                    onChange={(v) => setValue("psychological_state", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="离场原因">
                                <textarea
                                    {...register("exit_reason")}
                                    placeholder="描述离场的具体原因..."
                                    rows={2}
                                    className="form-input"
                                />
                            </FormField>
                        </div>
                    )}

                    {/* Step 4: 归因反思 */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-white">深度归因与反思</h2>

                            <FormField label="结果归因">
                                <ChipSelect
                                    options={RESULT_TYPES}
                                    value={watch("result_type") || ""}
                                    onChange={(v) => setValue("result_type", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="错误层级">
                                <ChipSelect
                                    options={ERROR_LEVELS}
                                    value={watch("error_level") || ""}
                                    onChange={(v) => setValue("error_level", v as any)}
                                    allowEmpty
                                />
                            </FormField>

                            <FormField label="正确行为（必填）" error={errors.correct_action?.message} required>
                                <textarea
                                    {...register("correct_action")}
                                    placeholder="如果重来一次，正确的做法是..."
                                    rows={3}
                                    className="form-input"
                                />
                            </FormField>

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 text-sm text-zinc-300">
                                    <input type="checkbox" {...register("environment_mismatch_flag")} className="rounded border-zinc-600" />
                                    环境错配标记
                                </label>
                                <label className="flex items-center gap-2 text-sm text-zinc-300">
                                    <input type="checkbox" {...register("permanent_exclusion_flag")} className="rounded border-zinc-600" />
                                    永久排除标记
                                </label>
                            </div>

                            {createMutation.isError && (
                                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                    创建失败：{(createMutation.error as any)?.message || "请重试"}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="mt-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={step === 0}
                        className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-40"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        上一步
                    </button>

                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={nextStep}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                        >
                            下一步
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={createMutation.isPending}
                            className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-60"
                            style={{ backgroundColor: "var(--color-bullish)", boxShadow: "0 0 15px rgba(38,166,154,0.3)" }}
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Check className="h-4 w-4" />
                            )}
                            提交复盘
                        </button>
                    )}
                </div>
            </form>

            <style jsx global>{`
        .form-input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background-color: var(--color-bg-surface);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          outline: none;
          transition: border-color var(--transition-fast);
        }
        .form-input:focus {
          border-color: var(--color-primary-light);
        }
        .form-input::placeholder {
          color: var(--color-text-muted);
        }
      `}</style>
        </div>
    );
}

// ── Sub Components ────────────────────────────────────────────

function FormField({
    label,
    error,
    required,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text-secondary)]">
                {label}
                {required && <span className="ml-1" style={{ color: "var(--color-bearish)" }}>*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs" style={{ color: "var(--color-bearish)" }}>{error}</p>}
        </div>
    );
}

function ChipSelect({
    options,
    value,
    onChange,
    allowEmpty,
}: {
    options: readonly string[];
    value: string;
    onChange: (v: string) => void;
    allowEmpty?: boolean;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {allowEmpty && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className={`rounded-full px-3 py-1 text-xs transition-colors ${!value
                        ? "bg-zinc-600 text-white"
                        : "border border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        }`}
                >
                    未选择
                </button>
            )}
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(opt)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${value === opt
                        ? "text-white"
                        : "border text-[var(--color-text-secondary)]"
                        }`}
                    style={value === opt ? { backgroundColor: "var(--color-primary)" } : { borderColor: "var(--color-border)" }}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}

function MultiChipSelect({
    options,
    value,
    onChange,
}: {
    options: readonly string[];
    value: string[];
    onChange: (v: string[]) => void;
}) {
    const toggle = (opt: string) => {
        if (value.includes(opt)) {
            onChange(value.filter((v) => v !== opt));
        } else {
            onChange([...value, opt]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`rounded-full px-3 py-1 text-xs transition-all ${value.includes(opt)
                        ? "text-white"
                        : "border text-[var(--color-text-secondary)]"
                        }`}
                    style={value.includes(opt) ? { backgroundColor: "var(--color-primary)" } : { borderColor: "var(--color-border)" }}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}
