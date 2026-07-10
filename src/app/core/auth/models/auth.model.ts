import { UserContextResponse } from '@/app/features/identity/users/models/user.model';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expire_in: number;
    user: UserContextResponse;
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

export interface ChangeOwnPasswordRequest {
    old_password: string;
    new_password: string;
    confirm_password: string;
    refresh_token: string;
}

export interface ResetPasswordRequest {
    reset_password_token: string;
    password: string;
    confirm_password: string;
}
