import { refCode, refId, refName } from '../utils/academic-http';

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
    avatar_url?: string | null;
}

export interface ProfessorRequest {
    faculty_id: string;
    professor_grade_id: string;
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    gender?: ProfessorGender | null;
    birth_date?: string | null;
    birth_place?: string | null;
    marital_status?: ProfessorMaritalStatus | null;
    nationality?: string | null;
    email?: string | null;
    phone?: string | null;
    matricule?: string | null;
    user_id?: string | null;
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

export function professorDisplayName(
    professor: Pick<Professor, 'first_name' | 'last_name' | 'middle_name' | 'email'>
): string {
    const name = [professor.last_name, professor.first_name, professor.middle_name].filter(Boolean).join(' ');
    return name || professor.email || 'Professeur';
}

export function normalizeProfessor(raw: unknown): Professor {
    const source = (raw ?? {}) as Record<string, unknown>;
    const faculty = source['faculty'] ?? source['faculty_id'];
    const grade = source['professor_grade'] ?? source['grade'] ?? source['professor_grade_id'];
    const user = source['user'] ?? source['user_id'];

    return {
        id: String(source['id'] ?? ''),
        first_name: String(source['first_name'] ?? ''),
        last_name: String(source['last_name'] ?? ''),
        middle_name: (source['middle_name'] as string | null | undefined) ?? null,
        email: (source['email'] as string | undefined) ?? undefined,
        phone: (source['phone'] as string | undefined) ?? undefined,
        gender: source['gender'] as ProfessorGender | undefined,
        birth_date: source['birth_date'] as string | undefined,
        birth_place: source['birth_place'] as string | undefined,
        marital_status: source['marital_status'] as ProfessorMaritalStatus | undefined,
        nationality: source['nationality'] as string | undefined,
        faculty_id: refId(faculty) ?? '',
        faculty_name: (source['faculty_name'] as string | undefined) ?? refName(faculty),
        professor_grade_id: refId(grade),
        professor_grade_name: (source['professor_grade_name'] as string | undefined) ?? refName(grade),
        professor_grade_code: (source['professor_grade_code'] as string | undefined) ?? refCode(grade),
        matricule: (source['matricule'] as string | null | undefined) ?? null,
        user_id: refId(user),
        avatar_url: (source['avatar_url'] as string | null | undefined) ?? null
    };
}
