export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
}

export type ApiListResponse<T> = T[] | PagedResponse<T>;

export interface AcademicReference {
    id: string;
    name: string;
    code?: string;
    created_at?: string;
    updated_at?: string;
}

export interface FacultyReference extends AcademicReference {}

export interface LevelReference extends AcademicReference {
    level_order?: number;
}

export interface ProgramLevelReference {
    level: LevelReference;
    is_common: boolean;
}

export interface ProgramReference extends AcademicReference {
    faculty_id: string;
    faculty_name?: string;
    levels?: ProgramLevelReference[];
}

export interface AcademicYearReference {
    id: string;
    label: string;
    start_date?: string;
    end_date?: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
}

export function toContent<T>(response: ApiListResponse<T>): T[] {
    return Array.isArray(response) ? response : response.content ?? [];
}