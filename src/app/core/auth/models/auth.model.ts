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