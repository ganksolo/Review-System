/**
 * Sidebar component — main navigation for the trading review system.
 *
 * Design system: Dark OLED, #1E40AF primary, Fira Sans, minimal glow.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BarChart3,
    BookOpen,
    FilePlus,
    LayoutDashboard,
    List,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "仪表板", icon: LayoutDashboard },
    { href: "/trades", label: "交易列表", icon: List },
    { href: "/trades/new", label: "新建交易", icon: FilePlus },
    { href: "/rules", label: "规则库", icon: BookOpen },
    { href: "/analytics", label: "数据分析", icon: BarChart3 },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r bg-[var(--color-bg-surface)] text-[var(--color-text-secondary)]"
            style={{ borderColor: "var(--color-border)" }}
        >
            {/* Logo */}
            <div
                className="flex h-16 items-center gap-3 border-b px-5"
                style={{ borderColor: "var(--color-border)" }}
            >
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

            {/* Footer */}
            <div
                className="border-t px-5 py-3 text-xs text-[var(--color-text-muted)]"
                style={{ borderColor: "var(--color-border)" }}
            >
                Trading Review v1.0
            </div>
        </aside>
    );
}
