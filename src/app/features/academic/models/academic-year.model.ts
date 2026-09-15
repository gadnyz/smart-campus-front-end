export type AcademicYearStatus = 'ACTIVE' | 'CLOSED' | string;

export interface AcademicYear {
    id: string;
    label: string;
    start_date: string;
    end_date: string;
    status: AcademicYearStatus;
    created_at?: string;
    updated_at?: string;
}

export interface CreateAcademicYearRequest {
    label: string;
    start_date: string;
    end_date: string;
}