export interface AuthenticatedUser {
    id: string;
    username: string;
    email: string;
    profiles: string[];
    enabled: boolean;
    created_at: string;
    updated_at: string;
    last_connected_at: string | null;
    avatar_url: string | null;
    authorities: string[];
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expire_in: number;
    user: AuthenticatedUser;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LogoutRequest {
    access_token: string;
    refresh_token: string;
}

export interface RefreshRequest {
    refresh_token: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    reset_password_token: string;
    password: string;
    confirm_password: string;
}