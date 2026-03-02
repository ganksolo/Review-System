"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();
    const [serverError, setServerError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setServerError("");
        setIsSubmitting(true);
        try {
            await login(data);
            const from = searchParams.get("from") || "/";
            router.push(from);
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "登录失败");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        交易复盘系统
                    </h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        登录以访问你的交易数据
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="mt-8 space-y-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm"
                >
                    {serverError && (
                        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                            {serverError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="account"
                                className="mb-1.5 block text-sm font-medium text-zinc-300"
                            >
                                邮箱 / 用户名
                            </label>
                            <input
                                id="account"
                                type="text"
                                autoComplete="username"
                                {...register("account")}
                                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="邮箱或用户名"
                            />
                            {errors.account && (
                                <p className="mt-1 text-xs text-red-400">
                                    {errors.account.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="mb-1.5 block text-sm font-medium text-zinc-300"
                            >
                                密码
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                {...register("password")}
                                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="至少 8 位字符"
                            />
                            {errors.password && (
                                <p className="mt-1 text-xs text-red-400">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full cursor-pointer rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "登录中..." : "登录"}
                    </button>

                    <p className="text-center text-sm text-zinc-400">
                        还没有账号？{" "}
                        <Link
                            href="/register"
                            className="cursor-pointer font-medium text-amber-500 transition-colors hover:text-amber-400"
                        >
                            立即注册
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    );
}
