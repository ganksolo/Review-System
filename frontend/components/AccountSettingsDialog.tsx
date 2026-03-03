"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { userApi } from "@/lib/api";

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function AccountSettingsDialog({ open, onClose }: Props) {
    const { user } = useAuth();
    const [capital, setCapital] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

    useEffect(() => {
        if (open && user) {
            setCapital(String(user.base_capital ?? 100000));
            setMessage(null);
        }
    }, [open, user]);

    if (!open) {
        return null;
    }

    const handleSave = async () => {
        const value = parseFloat(capital);
        if (isNaN(value) || value <= 0) {
            setMessage({ type: "err", text: "请输入大于 0 的数值" });
            return;
        }
        setSaving(true);
        setMessage(null);
        try {
            await userApi.updateSettings({ base_capital: value });
            setMessage({ type: "ok", text: "保存成功，刷新页面后生效" });
        } catch {
            setMessage({ type: "err", text: "保存失败，请重试" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-md rounded-2xl border p-6"
                style={{
                    backgroundColor: "var(--color-bg-surface)",
                    borderColor: "var(--color-border)",
                }}
            >
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-[var(--color-primary-light)]" />
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                            账户设置
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm text-[var(--color-text-secondary)]">
                            模拟总资金
                        </label>
                        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                            用于计算仓位金额和盈亏，不影响真实资产。
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[var(--color-text-muted)]">¥</span>
                            <input
                                type="number"
                                min="1"
                                step="1000"
                                value={capital}
                                onChange={(e) => setCapital(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:outline-none"
                                style={{
                                    borderColor: "var(--color-border)",
                                    backgroundColor: "var(--color-bg-card)",
                                }}
                                placeholder="100000"
                            />
                        </div>
                    </div>

                    {message && (
                        <p
                            className="text-sm"
                            style={{
                                color: message.type === "ok"
                                    ? "var(--color-bullish)"
                                    : "var(--color-bearish)",
                            }}
                        >
                            {message.text}
                        </p>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
                        style={{ backgroundColor: "var(--color-primary)" }}
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        {saving ? "保存中..." : "保存"}
                    </button>
                </div>
            </div>
        </div>
    );
}
