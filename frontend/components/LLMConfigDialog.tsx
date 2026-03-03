/**
 * LLM Config Dialog — configure AI model provider, API key, base URL, model name.
 *
 * Design system: Dark OLED, Fira Sans, consistent with existing UI.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Trash2, Loader2, Check, AlertCircle } from "lucide-react";
import { llmConfigApi, type LLMConfigData } from "@/lib/api";

const PROVIDERS = [
    { value: "openai", label: "OpenAI" },
    { value: "deepseek", label: "DeepSeek" },
    { value: "anthropic", label: "Anthropic" },
    { value: "gemini", label: "Gemini" },
    { value: "custom", label: "自定义" },
];

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function LLMConfigDialog({ open, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [existingConfig, setExistingConfig] = useState<LLMConfigData | null>(null);
    const [provider, setProvider] = useState("deepseek");
    const [apiKey, setApiKey] = useState("");
    const [baseUrl, setBaseUrl] = useState("");
    const [modelName, setModelName] = useState("");

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const res = await llmConfigApi.get();
            if (res.data) {
                setExistingConfig(res.data);
                setProvider(res.data.provider);
                setApiKey("");
                setBaseUrl(res.data.base_url || "");
                setModelName(res.data.model_name || "");
            } else {
                setExistingConfig(null);
            }
        } catch {
            setExistingConfig(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            setMessage(null);
            fetchConfig();
        }
    }, [open, fetchConfig]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    const handleSave = async () => {
        if (!existingConfig && !apiKey.trim()) {
            setMessage({ type: "error", text: "请输入 API Key" });
            return;
        }

        setSaving(true);
        setMessage(null);
        try {
            if (existingConfig) {
                await llmConfigApi.update({
                    provider,
                    api_key: apiKey.trim() || undefined,
                    base_url: baseUrl.trim() || undefined,
                    model_name: modelName.trim() || undefined,
                });
            } else {
                await llmConfigApi.save({
                    provider,
                    api_key: apiKey.trim(),
                    base_url: baseUrl.trim() || undefined,
                    model_name: modelName.trim() || undefined,
                });
            }
            setMessage({ type: "success", text: "保存成功" });
            await fetchConfig();
        } catch {
            setMessage({ type: "error", text: "保存失败，请检查配置" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existingConfig) {
            return;
        }
        if (!confirm("确定删除当前 AI 模型配置？删除后将使用系统默认配置。")) {
            return;
        }
        setDeleting(true);
        setMessage(null);
        try {
            await llmConfigApi.delete(existingConfig.id);
            setExistingConfig(null);
            setApiKey("");
            setBaseUrl("");
            setModelName("");
            setProvider("deepseek");
            setMessage({ type: "success", text: "已删除，将使用系统默认配置" });
        } catch {
            setMessage({ type: "error", text: "删除失败" });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
                <div
                    className="w-full max-w-md rounded-xl border shadow-2xl"
                    style={{
                        backgroundColor: "var(--color-bg-surface)",
                        borderColor: "var(--color-border)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-5 py-4"
                        style={{ borderColor: "var(--color-border)" }}
                    >
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            AI 模型配置
                        </h2>
                        <div className="flex items-center gap-2">
                            {existingConfig && (
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                    title="删除配置"
                                >
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-4 px-5 py-4">
                        {loading ? (
                            <div className="flex h-40 items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
                            </div>
                        ) : (
                            <>
                                {/* Provider */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                                        模型提供商
                                    </label>
                                    <select
                                        value={provider}
                                        onChange={(e) => setProvider(e.target.value)}
                                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                                        style={{
                                            backgroundColor: "var(--color-bg-card)",
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    >
                                        {PROVIDERS.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* API Key */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                                        API Key <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={existingConfig ? existingConfig.masked_key : "请输入 API 密钥"}
                                        className="w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                                        style={{
                                            backgroundColor: "var(--color-bg-card)",
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    />
                                    {existingConfig && (
                                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                            留空则保持原有 Key 不变
                                        </p>
                                    )}
                                </div>

                                {/* Base URL */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                                        Base URL（可选）
                                    </label>
                                    <input
                                        type="text"
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder="https://openrouter.ai/api/v1"
                                        className="w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                                        style={{
                                            backgroundColor: "var(--color-bg-card)",
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    />
                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        留空则使用默认 API 地址
                                    </p>
                                </div>

                                {/* Model Name */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                                        Model Name（可选）
                                    </label>
                                    <input
                                        type="text"
                                        value={modelName}
                                        onChange={(e) => setModelName(e.target.value)}
                                        placeholder="deepseek/deepseek-v3.2"
                                        className="w-full rounded-lg border px-3 py-2.5 font-mono text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                                        style={{
                                            backgroundColor: "var(--color-bg-card)",
                                            borderColor: "var(--color-border)",
                                            color: "var(--color-text-primary)",
                                        }}
                                    />
                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        留空则使用默认模型名称
                                    </p>
                                </div>

                                {/* Message */}
                                {message && (
                                    <div
                                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                                        style={{
                                            borderColor: message.type === "success" ? "rgba(38,166,154,0.3)" : "rgba(239,83,80,0.3)",
                                            backgroundColor: message.type === "success" ? "rgba(38,166,154,0.05)" : "rgba(239,83,80,0.05)",
                                            color: message.type === "success" ? "var(--color-bullish)" : "var(--color-bearish)",
                                        }}
                                    >
                                        {message.type === "success" ? <Check className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                                        {message.text}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!loading && (
                        <div
                            className="flex gap-3 border-t px-5 py-4"
                            style={{ borderColor: "var(--color-border)" }}
                        >
                            <button
                                onClick={onClose}
                                className="flex-1 cursor-pointer rounded-lg border px-4 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                                style={{ borderColor: "var(--color-border)" }}
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                                style={{
                                    background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                                    color: "#fff",
                                }}
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {existingConfig ? "更新配置" : "保存配置"}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
