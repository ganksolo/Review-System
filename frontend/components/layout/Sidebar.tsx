/**
 * Sidebar component — responsive navigation with mobile toggle.
 *
 * Design system: Dark OLED, #1E40AF primary, Fira Sans, minimal glow.
 * Mobile: Off-canvas drawer with overlay, triggered by hamburger button.
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    BookOpen,
    FilePlus,
    LayoutDashboard,
    List,
    LogOut,
    Menu,
    Settings,
    Wallet,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import LLMConfigDialog from "@/components/LLMConfigDialog";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";

const navItems = [
    { href: "/", label: "仪表板", icon: LayoutDashboard },
    { href: "/trades", label: "交易列表", icon: List },
    { href: "/trades/new", label: "新建交易", icon: FilePlus },
    { href: "/rules", label: "规则库", icon: BookOpen },
    { href: "/analytics", label: "数据分析", icon: BarChart3 },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [showLLMConfig, setShowLLMConfig] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const { user, logout } = useAuth();

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg md:hidden"
                style={{
                    backgroundColor: "var(--color-bg-surface)",
                    borderColor: "var(--color-border)",
                    border: "1px solid var(--color-border)",
                }}
                aria-label="打开菜单"
            >
                <Menu className="h-5 w-5 text-[var(--color-text-primary)]" />
            </button>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)] transition-transform duration-300",
                    // Mobile: off-canvas unless open
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                )}
                style={{ borderColor: "var(--color-border)" }}
            >
                {/* Logo + mobile close */}
                <div
                    className="flex h-16 items-center justify-between border-b px-5"
                    style={{ borderColor: "var(--color-border)" }}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg font-mono text-sm font-bold text-white"
                            style={{
                                background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
                                boxShadow: "var(--glow-primary)",
                            }}
                        >
                            T
                        </div>
                        <span className="text-base font-semibold text-[var(--color-text-primary)]">
                            交易复盘
                        </span>
                    </div>

                    {/* Close button (mobile only) */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg md:hidden"
                        style={{ color: "var(--color-text-muted)" }}
                        aria-label="关闭菜单"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Nav items */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/" && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                    isActive
                                        ? "text-[var(--color-primary-light)]"
                                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                                )}
                                style={isActive ? {
                                    backgroundColor: "var(--color-primary-glow)",
                                    boxShadow: "inset 0 0 12px rgba(30, 64, 175, 0.15)",
                                } : {}}
                            >
                                <Icon className="h-[18px] w-[18px]" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                {/* AI Config + Footer */}
                <div
                    className="space-y-2 border-t px-3 py-3"
                    style={{ borderColor: "var(--color-border)" }}
                >
                    <button
                        onClick={() => setShowAccountSettings(true)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-primary-glow)] hover:text-[var(--color-primary-light)]"
                    >
                        <Wallet className="h-[18px] w-[18px]" />
                        账户设置
                    </button>
                    <button
                        onClick={() => setShowLLMConfig(true)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-primary-glow)] hover:text-[var(--color-primary-light)]"
                    >
                        <Settings className="h-[18px] w-[18px]" />
                        AI 模型配置
                    </button>
                    <div className="px-3 text-xs text-[var(--color-text-muted)]">
                        Trading Review v1.0
                    </div>
                </div>
                {/* User info + Logout */}
                {user && (
                    <div
                        className="border-t px-4 py-3"
                        style={{ borderColor: "var(--color-border)" }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-bold text-white">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                                    {user.username}
                                </p>
                                <p className="truncate text-xs text-[var(--color-text-muted)]">
                                    {user.email}
                                </p>
                            </div>
                            <button
                                onClick={logout}
                                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                                title="退出登录"
                                aria-label="退出登录"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Dialogs */}
            <AccountSettingsDialog open={showAccountSettings} onClose={() => setShowAccountSettings(false)} />
            <LLMConfigDialog open={showLLMConfig} onClose={() => setShowLLMConfig(false)} />
        </>
    );
}
