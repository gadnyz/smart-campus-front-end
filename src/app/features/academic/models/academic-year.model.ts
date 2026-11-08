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
/** Libellé d'une année à partir de ses dates : « 2026-2027 » du 15/10/2026 au 14/10/2027. */
export function academicYearLabel(start: Date | null | undefined, end: Date | null | undefined): string {
    return start && end ? `${start.getFullYear()}-${end.getFullYear()}` : '';
}
