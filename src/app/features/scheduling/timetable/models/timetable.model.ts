export const TIMETABLE_STATUSES = ['DRAFT', 'SUBMITTED', 'VALIDATED'] as const;
export type TimetableStatus = (typeof TIMETABLE_STATUSES)[number];

export interface Timetable {
    id: string;
    academic_year_id: string;
    program_level_id: string;
    program_level_name: string;
    week_start: string;
    week_end: string;
    program_id: string;
    program_name: string;
    faculty_id: string;
    faculty_name: string;
    status: TimetableStatus;
    created_at: string;
    updated_at: string;
}

export interface CreateTimetableRequest {
    academic_year_id: string;
    program_level_id: string;
    program_level_name: string;
    week_start: string;
    program_id: string;
    program_name: string;
    faculty_id: string;
    faculty_name: string;
}

export interface UpdateTimetableStatusRequest {
    status: TimetableStatus;
}

export interface TimetableListQuery {
    academicYearId?: string;
    facultyId?: string;
    programId?: string;
    programLevelId?: string;
    /** N'importe quelle date de la semaine : le backend la ramène à son lundi. */
    week?: string;
    status?: TimetableStatus;
    page?: number;
    size?: number;
    sort?: string[];
}

export function timetableStatusLabel(status: TimetableStatus): string {
    const labels: Record<TimetableStatus, string> = {
        DRAFT: 'Brouillon',
        SUBMITTED: 'Soumis',
        VALIDATED: 'Validé'
    };
    return labels[status];
}

export function timetableStatusSeverity(status: TimetableStatus): 'secondary' | 'warn' | 'success' {
    const severities: Record<TimetableStatus, 'secondary' | 'warn' | 'success'> = {
        DRAFT: 'secondary',
        SUBMITTED: 'warn',
        VALIDATED: 'success'
    };
    return severities[status];
}

/** Un changement de statut proposé à l'utilisateur. */
export interface TimetableStatusAction {
    target: TimetableStatus;
    label: string;
    icon: string;
    severity: 'info' | 'secondary' | 'success' | 'warn';
    confirmation: string;
    success: string;
}

/**
 * Transitions du circuit hebdomadaire, alignées sur celles que le backend accepte :
 * DRAFT → SUBMITTED, SUBMITTED → VALIDATED ou DRAFT, VALIDATED → SUBMITTED (réouverture).
 */
export function timetableStatusActions(status: TimetableStatus): TimetableStatusAction[] {
    switch (status) {
        case 'DRAFT':
            return [
                {
                    target: 'SUBMITTED',
                    label: 'Soumettre',
                    icon: 'pi pi-send',
                    severity: 'info',
                    confirmation: 'L’horaire sera soumis pour validation. Ses sessions restent modifiables jusqu’à la validation.',
                    success: 'Horaire soumis pour validation.'
                }
            ];
        case 'SUBMITTED':
            return [
                {
                    target: 'DRAFT',
                    label: 'Renvoyer en brouillon',
                    icon: 'pi pi-replay',
                    severity: 'secondary',
                    confirmation: 'L’horaire repassera en brouillon.',
                    success: 'Horaire renvoyé en brouillon.'
                },
                {
                    target: 'VALIDATED',
                    label: 'Valider',
                    icon: 'pi pi-verified',
                    severity: 'success',
                    confirmation: 'Une fois validé, l’horaire est publié aux étudiants et ses sessions ne sont plus modifiables.',
                    success: 'Horaire validé et publié aux étudiants.'
                }
            ];
        case 'VALIDATED':
            return [
                {
                    target: 'SUBMITTED',
                    label: 'Rouvrir',
                    icon: 'pi pi-lock-open',
                    severity: 'warn',
                    confirmation: 'L’horaire ne sera plus visible des étudiants et repassera en « Soumis » : ses sessions redeviendront modifiables.',
                    success: 'Horaire rouvert : il n’est plus publié aux étudiants.'
                }
            ];
    }
}

export function asTimetable(raw: unknown): Timetable {
    const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const status = source['status'];
    return {
        id: text(source, 'id'),
        academic_year_id: text(source, 'academic_year_id'),
        program_level_id: text(source, 'program_level_id'),
        program_level_name: text(source, 'program_level_name'),
        program_id: text(source, 'program_id'),
        program_name: text(source, 'program_name'),
        faculty_id: text(source, 'faculty_id'),
        faculty_name: text(source, 'faculty_name'),
        week_start: text(source, 'week_start'),
        week_end: text(source, 'week_end'),
        status: isTimetableStatus(status) ? status : 'DRAFT',
        created_at: text(source, 'created_at'),
        updated_at: text(source, 'updated_at')
    };
}

export function isTimetableStatus(value: unknown): value is TimetableStatus {
    return typeof value === 'string' && (TIMETABLE_STATUSES as readonly string[]).includes(value);
}

function text(source: Record<string, unknown>, key: string): string {
    const value = source[key];
    return typeof value === 'string' ? value : '';
}