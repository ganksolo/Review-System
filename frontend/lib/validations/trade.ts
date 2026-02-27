/**
 * Zod validation schemas for trade forms.
 * Enum values must match backend Python enums (中文).
 */

import { z } from "zod";

export const accountTypeEnum = z.enum(["短线账户", "中线账户"]);
export const tradeCycleEnum = z.enum(["短线", "中线", "长线"]);
export const marketEnvEnum = z.enum([
    "牛市-主升", "牛市-调整", "熊市-主跌", "熊市-反弹",
    "震荡市-上轨", "震荡市-下轨", "震荡市-中枢",
]);
export const sectorStatusEnum = z.enum(["启动期", "主升期", "高潮期", "退潮期", "混沌期"]);
export const planAdherenceEnum = z.enum(["完全按计划", "轻微偏离", "临盘起意冲动交易"]);
export const stopLossDisciplineEnum = z.enum([
    "有预设并严格执行", "有预设但未执行", "无预设止损",
]);
export const exitTypeEnum = z.enum(["主动止盈", "被动止损", "保本出局", "模式外情绪化离场"]);
export const psychologicalStateEnum = z.enum(["冷静", "追涨FOMO", "贪婪", "恐惧"]);
export const resultTypeEnum = z.enum(["正确盈利", "运气盈利", "执行亏损", "模式亏损"]);
export const errorLevelEnum = z.enum(["执行层错误", "模式层错误", "环境层错误"]);

export const tradeCreateSchema = z
    .object({
        // Step 1: 基础信息
        account_type: accountTypeEnum,
        stock_code: z.string().min(1, "股票代码不能为空").max(20),
        stock_name: z.string().max(100).optional().or(z.literal("")),
        trade_cycle: tradeCycleEnum,
        entry_date: z.string().min(1, "买入时间不能为空"),
        exit_date: z.string().optional().or(z.literal("")),
        position_size: z.coerce.number().positive("仓位必须大于0").max(100, "仓位不能超过100%"),
        entry_price: z.coerce.number().positive("买入价必须大于0"),
        exit_price: z.coerce.number().positive("卖出价必须大于0").optional().or(z.literal("")),
        preset_stop_loss: z.coerce.number().optional().or(z.literal("")),
        preset_take_profit: z.coerce.number().optional().or(z.literal("")),
        slippage: z.coerce.number().min(0).optional().or(z.literal("")),
        max_favorable_excursion: z.coerce.number().optional().or(z.literal("")),
        max_adverse_excursion: z.coerce.number().optional().or(z.literal("")),

        // Step 2: 决策环境
        market_environment: marketEnvEnum.optional().or(z.literal("")),
        sector_status: sectorStatusEnum.optional().or(z.literal("")),
        selection_dimension: z.array(z.string()).optional(),
        strategy_pattern: z.array(z.string()).optional(),
        volume_profile: z.string().max(500).optional().or(z.literal("")),
        thesis_statement: z.string().optional().or(z.literal("")),

        // Step 3: 执行评估
        plan_adherence: planAdherenceEnum.optional().or(z.literal("")),
        stop_loss_discipline: stopLossDisciplineEnum.optional().or(z.literal("")),
        exit_type: exitTypeEnum.optional().or(z.literal("")),
        exit_reason: z.string().optional().or(z.literal("")),
        psychological_state: psychologicalStateEnum.optional().or(z.literal("")),

        // Step 4: 归因反思
        result_type: resultTypeEnum.optional().or(z.literal("")),
        error_level: errorLevelEnum.optional().or(z.literal("")),
        environment_mismatch_flag: z.boolean().optional(),
        permanent_exclusion_flag: z.boolean().optional(),
        correct_action: z.string().min(1, "正确行为不能为空"),
    })
    .refine(
        (data) => {
            if (data.exit_date && data.entry_date) {
                return new Date(data.exit_date) >= new Date(data.entry_date);
            }
            return true;
        },
        { message: "卖出时间必须晚于买入时间", path: ["exit_date"] }
    );

export type TradeFormValues = z.infer<typeof tradeCreateSchema>;
