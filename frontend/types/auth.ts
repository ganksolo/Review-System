export interface User {
    id: string;
    email: string;
    username: string;
    is_active: boolean;
    base_capital: number;
}

export interface LoginRequest {
    account: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    username: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}
