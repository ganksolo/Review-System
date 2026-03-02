import { z } from "zod";

export const loginSchema = z.object({
    account: z.string().min(1, "请输入邮箱或用户名"),
    password: z.string().min(8, "密码长度至少 8 位"),
});

export const registerSchema = z
    .object({
        username: z.string().min(1, "请输入用户名").max(100, "用户名最长 100 字符"),
        email: z.string().email("请输入有效的邮箱地址"),
        password: z.string().min(8, "密码长度至少 8 位"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "两次输入的密码不一致",
        path: ["confirmPassword"],
    });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
