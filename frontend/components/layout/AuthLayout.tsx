"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import QueryProvider from "@/components/QueryProvider";

const AUTH_PAGES = ["/login", "/register"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = AUTH_PAGES.includes(pathname);

    return (
        <AuthProvider>
            <QueryProvider>
                {isAuthPage ? (
                    children
                ) : (
                    <div className="flex min-h-screen">
                        <Sidebar />
                        <main className="flex-1 p-4 pt-16 md:ml-60 md:p-6 md:pt-6">
                            {children}
                        </main>
                    </div>
                )}
            </QueryProvider>
        </AuthProvider>
    );
}
