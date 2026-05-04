export type UserProfile = string;

export interface User {
    id: string;
    username: string;
    email: string;
    profile: UserProfile;
    enabled: boolean;
    avatar_url?: string;
    authorities: string[];
    created_at?: string;
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
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
