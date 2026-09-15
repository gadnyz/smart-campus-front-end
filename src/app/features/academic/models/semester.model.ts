export interface Semester {
    id: string;
    name: string;
    code: string;
    semester_order: number;
    start_date: string;
    end_date: string;
    academic_year_id: string;
    created_at?: string;
    updated_at?: string;
}

export interface SemesterRequest {
    code: string;
    name: string;
    semester_order: number;
    start_date: string;
    end_date: string;
    academic_year_id: string;
}