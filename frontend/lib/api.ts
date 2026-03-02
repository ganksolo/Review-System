/**
 * API client — fetch wrapper for FastAPI backend.
 */

import { getAccessToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(status: number, data: unknown) {
        super(`API Error ${status}`);
        this.status = status;
        this.data = data;
    }
}

export async function apiClient<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const token = getAccessToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (res.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.href = "/login";
        throw new ApiError(401, { detail: "认证已过期" });
    }

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new ApiError(res.status, errorData);
    }

    if (res.status === 204) {
        return undefined as T;
    }
    return res.json();
}

// ── Trade API ─────────────────────────────────────────────────

import type {
    PaginatedResponse,
    RulesSummary,
    StandardResponse,
    Trade,
    TradeCreateData,
    TradeUpdateData,
} from "@/types/trade";

export const tradeApi = {
    create: (data: TradeCreateData) =>
        apiClient<StandardResponse<Trade>>("/api/trades", {
            method: "POST",
            body: JSON.stringify(data),
        }),

    list: (params?: Record<string, string>) => {
        const qs = params
            ? "?" + new URLSearchParams(params).toString()
            : "";
        return apiClient<PaginatedResponse<Trade>>(`/api/trades${qs}`);
    },

    getById: (id: string) =>
        apiClient<StandardResponse<Trade>>(`/api/trades/${id}`),

    update: (id: string, data: TradeUpdateData) =>
        apiClient<StandardResponse<Trade>>(`/api/trades/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiClient<void>(`/api/trades/${id}`, { method: "DELETE" }),

    restore: (id: string) =>
        apiClient<StandardResponse<Trade>>(`/api/trades/${id}/restore`, {
            method: "POST",
        }),
};

export const rulesApi = {
    exclusions: () =>
        apiClient<StandardResponse<Trade[]>>("/api/rules/exclusions"),

    correctBehaviors: () =>
        apiClient<StandardResponse<Trade[]>>("/api/rules/correct-behaviors"),

    environmentMismatches: () =>
        apiClient<StandardResponse<Trade[]>>("/api/rules/environment-mismatches"),

    summary: () =>
        apiClient<StandardResponse<RulesSummary>>("/api/rules/summary"),
};
