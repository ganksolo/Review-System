"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { AuthResponse, AuthState, User } from "@/types/auth";
import type { LoginRequest, RegisterRequest } from "@/types/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AuthContextValue extends AuthState {
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function setTokens(access: string, refresh: string) {
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    document.cookie = `auth-token=${access}; path=/; SameSite=Lax`;
}

function clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function getAccessToken(): string | null {
    if (typeof window === "undefined") {
        return null;
    }
    return localStorage.getItem("access_token");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMe = useCallback(async (token: string): Promise<User | null> => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                return null;
            }
            const json = await res.json();
            return json.data as User;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setIsLoading(false);
            return;
        }
        fetchMe(token).then((u) => {
            setUser(u);
            if (!u) {
                clearTokens();
            }
            setIsLoading(false);
        });
    }, [fetchMe]);

    const login = useCallback(
        async (data: LoginRequest) => {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.detail || "登录失败");
            }
            const tokens: AuthResponse = json.data;
            setTokens(tokens.access_token, tokens.refresh_token);
            const u = await fetchMe(tokens.access_token);
            setUser(u);
        },
        [fetchMe],
    );

    const register = useCallback(
        async (data: RegisterRequest) => {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.detail || "注册失败");
            }
            const tokens: AuthResponse = json.data;
            setTokens(tokens.access_token, tokens.refresh_token);
            const u = await fetchMe(tokens.access_token);
            setUser(u);
        },
        [fetchMe],
    );

    const logout = useCallback(() => {
        clearTokens();
        setUser(null);
        window.location.href = "/login";
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            isAuthenticated: !!user,
            isLoading,
            login,
            register,
            logout,
        }),
        [user, isLoading, login, register, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}
