/**
 * TanStack Query hooks for Trade CRUD operations.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tradeApi, rulesApi, llmApi } from "@/lib/api";
import type { TradeCreateData, TradeUpdateData } from "@/types/trade";

// ── Query Keys ────────────────────────────────────────────────

export const tradeKeys = {
    all: ["trades"] as const,
    lists: () => [...tradeKeys.all, "list"] as const,
    list: (params: Record<string, string>) =>
        [...tradeKeys.lists(), params] as const,
    details: () => [...tradeKeys.all, "detail"] as const,
    detail: (id: string) => [...tradeKeys.details(), id] as const,
};

export const ruleKeys = {
    all: ["rules"] as const,
    summary: () => [...ruleKeys.all, "summary"] as const,
    exclusions: () => [...ruleKeys.all, "exclusions"] as const,
    correctBehaviors: () => [...ruleKeys.all, "correct-behaviors"] as const,
    mismatches: () => [...ruleKeys.all, "mismatches"] as const,
};

// ── Trade Hooks ───────────────────────────────────────────────

export function useTrades(params: Record<string, string> = {}) {
    return useQuery({
        queryKey: tradeKeys.list(params),
        queryFn: () => tradeApi.list(params),
    });
}

export function useTrade(id: string) {
    return useQuery({
        queryKey: tradeKeys.detail(id),
        queryFn: () => tradeApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: TradeCreateData) => tradeApi.create(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tradeKeys.lists() });
            qc.invalidateQueries({ queryKey: ruleKeys.all });
        },
    });
}

export function useUpdateTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: TradeUpdateData }) =>
            tradeApi.update(id, data),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: tradeKeys.detail(variables.id) });
            qc.invalidateQueries({ queryKey: tradeKeys.lists() });
            qc.invalidateQueries({ queryKey: ruleKeys.all });
        },
    });
}

export function useDeleteTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tradeApi.delete(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tradeKeys.lists() });
            qc.invalidateQueries({ queryKey: ruleKeys.all });
        },
    });
}

export function useRestoreTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => tradeApi.restore(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tradeKeys.lists() });
        },
    });
}

// ── Rules Hooks ───────────────────────────────────────────────

export function useRulesSummary() {
    return useQuery({
        queryKey: ruleKeys.summary(),
        queryFn: () => rulesApi.summary(),
    });
}

export function useExclusions() {
    return useQuery({
        queryKey: ruleKeys.exclusions(),
        queryFn: () => rulesApi.exclusions(),
    });
}

export function useCorrectBehaviors() {
    return useQuery({
        queryKey: ruleKeys.correctBehaviors(),
        queryFn: () => rulesApi.correctBehaviors(),
    });
}

export function useEnvironmentMismatches() {
    return useQuery({
        queryKey: ruleKeys.mismatches(),
        queryFn: () => rulesApi.environmentMismatches(),
    });
}

// ── LLM Hooks ────────────────────────────────────────────────

export const llmKeys = {
    all: ["llm"] as const,
    health: () => [...llmKeys.all, "health"] as const,
    cost: () => [...llmKeys.all, "cost"] as const,
};

export function useAnalyzeTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (tradeId: string) => llmApi.analyzeTrade(tradeId),
        onSuccess: (_, tradeId) => {
            qc.invalidateQueries({ queryKey: tradeKeys.detail(tradeId) });
            qc.invalidateQueries({ queryKey: ruleKeys.all });
        },
    });
}

export function useBatchAnalyze() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ tradeIds, maxConcurrent }: { tradeIds: string[]; maxConcurrent?: number }) =>
            llmApi.batchAnalyze(tradeIds, maxConcurrent),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: tradeKeys.all });
            qc.invalidateQueries({ queryKey: ruleKeys.all });
        },
    });
}

export function useLLMHealth() {
    return useQuery({
        queryKey: llmKeys.health(),
        queryFn: () => llmApi.health(),
        staleTime: 60_000,
    });
}

export function useLLMCost() {
    return useQuery({
        queryKey: llmKeys.cost(),
        queryFn: () => llmApi.cost(),
        staleTime: 30_000,
    });
}
