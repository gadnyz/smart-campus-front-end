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

export interface RoleResponse {
    id: string;
    name: string;
    created_at: string | null;
    updated_at: string | null;
    privileges: string[];
}

export interface CreateRoleRequest {
    name: string;
}

export interface AddPrivilegesRequest {
    privilege_ids: string[];
}

export interface PrivilegeResponse {
    id: string;
    name: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface CreatePrivilegeRequest {
    name: string;
}

export interface UserProfileResponse {
    id: string;
    name: string;
    roles: string[];
}

export interface CreateProfileRequest {
    name: string;
}

export interface AddRolesRequest {
    role_ids: string[];
}