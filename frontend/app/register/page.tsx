"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";

export default function RegisterPage() {
    const router = useRouter();
    const { register: registerUser } = useAuth();
    const [serverError, setServerError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterFormData) => {
        setServerError("");
        setIsSubmitting(true);
        try {
            await registerUser({
                email: data.email,
                username: data.username,
                password: data.password,
            });
            router.push("/");
        } catch (err) {
            setServerError(err instanceof Error ? err.message : "注册失败");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">
                        创建账号
                    </h1>
                    <p className="mt-2 text-sm text-zinc-400">
                        注册以开始使用交易复盘系统
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
                                htmlFor="username"
                                className="mb-1.5 block text-sm font-medium text-zinc-300"
                            >
                                用户名
                            </label>
                            <input
                                id="username"
                                type="text"
                                autoComplete="username"
                                {...register("username")}
                                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="你的用户名"
                            />
                            {errors.username && (
                                <p className="mt-1 text-xs text-red-400">
                                    {errors.username.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-sm font-medium text-zinc-300"
                            >
                                邮箱
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                {...register("email")}
                                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="name@example.com"
                            />
                            {errors.email && (
                                <p className="mt-1 text-xs text-red-400">
                                    {errors.email.message}
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
                                autoComplete="new-password"
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

                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-1.5 block text-sm font-medium text-zinc-300"
                            >
                                确认密码
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                autoComplete="new-password"
                                {...register("confirmPassword")}
                                className="block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-white placeholder-zinc-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                placeholder="再次输入密码"
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-xs text-red-400">
                                    {errors.confirmPassword.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full cursor-pointer rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition-all hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? "注册中..." : "注册"}
                    </button>

                    <p className="text-center text-sm text-zinc-400">
                        已有账号？{" "}
                        <Link
                            href="/login"
                            className="cursor-pointer font-medium text-amber-500 transition-colors hover:text-amber-400"
                        >
                            返回登录
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
