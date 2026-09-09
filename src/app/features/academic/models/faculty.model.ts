export interface Faculty {
    id: string;
    name: string;
    code: string;
    created_at?: string;
    updated_at?: string;
}

export interface FacultyRequest {
    code: string;
    name: string;
}

export type FacultyLeadershipRole = 'DEAN' | 'VICE_DEAN' | 'SAF';

export interface FacultyLeadership {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
    role: FacultyLeadershipRole;
    role_label?: string;
    active: boolean;
    assigned_at?: string;
    removed_at?: string;
}

export interface AssignLeadershipRequest {
    user_id: string;
    role: FacultyLeadershipRole;
}