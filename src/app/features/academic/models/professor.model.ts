export type ProfessorGender = 'MALE' | 'FEMALE' | 'OTHER';
export type ProfessorMaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';

export interface Professor {
    id: string;
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    email?: string;
    phone?: string;
    gender?: ProfessorGender;
    birth_date?: string;
    birth_place?: string;
    marital_status?: ProfessorMaritalStatus;
    nationality?: string;
    faculty_id: string;
    faculty_name?: string;
    professor_grade_id?: string;
    professor_grade_name?: string;
    professor_grade_code?: string;
    matricule?: string | null;
    user_id?: string;
}

export interface ProfessorRequest {
    faculty_id: string;
    professor_grade_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    gender: ProfessorGender;
    birth_date: string;
    birth_place: string;
    marital_status: ProfessorMaritalStatus;
    nationality: string;
    email: string;
    phone: string;
}

export const PROFESSOR_GENDER_OPTIONS: { label: string; value: ProfessorGender }[] = [
    { label: 'Masculin', value: 'MALE' },
    { label: 'Féminin', value: 'FEMALE' },
    { label: 'Autre', value: 'OTHER' }
];

export const PROFESSOR_MARITAL_STATUS_OPTIONS: { label: string; value: ProfessorMaritalStatus }[] = [
    { label: 'Célibataire', value: 'SINGLE' },
    { label: 'Marié(e)', value: 'MARRIED' },
    { label: 'Divorcé(e)', value: 'DIVORCED' },
    { label: 'Veuf / Veuve', value: 'WIDOWED' },
    { label: 'Autre', value: 'OTHER' }
];

export function professorDisplayName(professor: Pick<Professor, 'first_name' | 'last_name' | 'middle_name'>): string {
    return [professor.last_name, professor.first_name, professor.middle_name].filter(Boolean).join(' ');
}
