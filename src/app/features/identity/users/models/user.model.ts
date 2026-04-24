export type UserProfile = string;

export interface User {
    id: string;
    username: string;
    email: string;
    profile: UserProfile;
    authorities: string[];
    created_at?: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    profile: UserProfile;
}

export interface RegisterResponse {
    id: string;
    username: string;
    email: string;
    profile: UserProfile;
    created_at: string;
}

export interface UserContextResponse {
    id: string;
    username: string;
    email: string;
    profile: UserProfile;
    authorities: string[];
}
