export type UserProfile = string;

export interface User {
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
    faculty_id?: string | null;
}

export interface RegisterRequest {
    username: string;
    email: string;
    profiles: string[];
    /** Faculté de rattachement, facultative : elle ancre les privilèges `:faculty` des profils sans rattachement propre. */
    faculty_id?: string | null;
}

export interface RegisterResponse {
    id: string;
    username: string;
    email: string;
    profiles: string[];
    created_at: string;
}

/** `PUT /users/me` : l'utilisateur ne modifie que son nom d'utilisateur et son email. */
export interface UpdateOwnProfileRequest {
    username: string;
    email: string;
}

export interface UpdateUserRequest {
    username: string;
    email: string;
    faculty_id?: string | null;
}

export interface UserProfileResponse {
    id: string;
    name: string;
    roles: string[];
}

export interface AvatarUploadUrlResponse {
    upload_url: string;
    object_path: string;
}

export interface ConfirmAvatarRequest {
    object_path: string;
}

export interface ConfirmAvatarResponse {
    public_url: string;
}

export interface PageableQuery {
    page?: number;
    size?: number;
    sort?: string[];
}

export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
}

export interface ChangeOwnPasswordRequest {
    old_password: string;
    new_password: string;
    confirm_password: string;
    refresh_token: string;
}