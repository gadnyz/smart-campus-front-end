import { refCode, refId, refName } from '../utils/academic-http';

export type StudentGender = 'MALE' | 'FEMALE' | 'OTHER';
export type StudentMaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';

export interface StudentOrigin {
    province?: string | null;
    territory?: string | null;
    sector?: string | null;
    commune?: string | null;
}

export interface StudentTutor {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    profession?: string | null;
}

export interface StudentEmergencyContact {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    relationship?: string | null;
}

export interface StudentAcademicBackground {
    school_name?: string | null;
    option?: string | null;
    percentage?: number | null;
    graduation_year?: number | null;
    study_country?: string | null;
    study_city?: string | null;
}

export interface StudentDocument {
    id: string;
    document_type?: string;
    type?: string;
    file_url?: string;
    file_name?: string;
}

export interface Student {
    id: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string | null;
    matricule?: string | null;
    email?: string;
    phone?: string;
    gender?: StudentGender;
    birth_date?: string;
    birth_place?: string;
    marital_status?: StudentMaritalStatus;
    nationality?: string;
    faculty_id?: string;
    faculty_name?: string;
    program_id?: string;
    program_name?: string;
    program_code?: string;
    level_id?: string;
    level_code?: string;
    level_name?: string;
    academic_year_id?: string;
    academic_year_label?: string;
    user_id?: string;
    avatar_url?: string | null;
    origin?: StudentOrigin;
    tutor?: StudentTutor;
    emergency_contact?: StudentEmergencyContact;
    academic_background?: StudentAcademicBackground;
    documents?: StudentDocument[];
}

/** Filtres de `GET /students` : rien d'autre n'est appliqué par l'API. */
export interface StudentQuery {
    page?: number;
    size?: number;
    facultyId?: string | null;
    programId?: string | null;
    /** La promotion (`program_level_id`), pas le niveau seul. */
    programLevelId?: string | null;
    academicYearId?: string | null;
    /** Début du matricule, du prénom, du nom ou du post-nom. */
    search?: string | null;
}

export interface StudentRequest {
    faculty_id?: string | null;
    program_id?: string | null;
    level_id?: string | null;
    academic_year_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    middle_name?: string | null;
    gender?: StudentGender | null;
    birth_date?: string | null;
    birth_place?: string | null;
    marital_status?: StudentMaritalStatus | null;
    nationality?: string | null;
    email?: string | null;
    phone?: string | null;
    matricule?: string | null;
    origin?: StudentOrigin | null;
    tutor?: StudentTutor | null;
    emergency_contact?: StudentEmergencyContact | null;
    academic_background?: StudentAcademicBackground | null;
}

export const STUDENT_GENDER_OPTIONS: { label: string; value: StudentGender }[] = [
    { label: 'Masculin', value: 'MALE' },
    { label: 'Féminin', value: 'FEMALE' },
    { label: 'Autre', value: 'OTHER' }
];

export const STUDENT_MARITAL_STATUS_OPTIONS: { label: string; value: StudentMaritalStatus }[] = [
    { label: 'Célibataire', value: 'SINGLE' },
    { label: 'Marié(e)', value: 'MARRIED' },
    { label: 'Divorcé(e)', value: 'DIVORCED' },
    { label: 'Veuf / Veuve', value: 'WIDOWED' },
    { label: 'Autre', value: 'OTHER' }
];

export function studentDisplayName(student: Pick<Student, 'first_name' | 'last_name' | 'middle_name' | 'matricule' | 'email'>): string {
    const name = [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' ');
    return name || student.matricule || student.email || 'Étudiant';
}

export function formatStudentGender(value?: StudentGender | null): string {
    return STUDENT_GENDER_OPTIONS.find((option) => option.value === value)?.label ?? '—';
}

export function formatStudentMaritalStatus(value?: StudentMaritalStatus | null): string {
    return STUDENT_MARITAL_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? '—';
}

export function normalizeStudent(raw: unknown): Student {
    const source = (raw ?? {}) as Record<string, unknown>;
    const faculty = source['faculty'] ?? source['faculty_id'];
    const program = source['program'] ?? source['programme'] ?? source['program_id'];
    const level = source['level'] ?? source['program_level'] ?? source['level_id'];
    const nestedLevel =
        level && typeof level === 'object' && 'level' in (level as object)
            ? (level as { level?: unknown }).level
            : level;
    const year = source['academic_year'] ?? source['academic_year_id'];
    const user = source['user'] ?? source['user_id'];
    const origin = (source['origin'] ?? {}) as StudentOrigin;
    const tutor = (source['tutor'] ?? {}) as StudentTutor;
    const emergency = (source['emergency_contact'] ?? {}) as StudentEmergencyContact;
    const background = (source['academic_background'] ?? {}) as StudentAcademicBackground;

    return {
        id: String(source['id'] ?? ''),
        first_name: source['first_name'] as string | undefined,
        last_name: source['last_name'] as string | undefined,
        middle_name: (source['middle_name'] as string | null | undefined) ?? null,
        matricule:
            (source['matricule'] as string | null | undefined) ??
            (source['registration_number'] as string | null | undefined) ??
            null,
        email: source['email'] as string | undefined,
        phone: source['phone'] as string | undefined,
        gender: source['gender'] as StudentGender | undefined,
        birth_date: source['birth_date'] as string | undefined,
        birth_place: source['birth_place'] as string | undefined,
        marital_status: source['marital_status'] as StudentMaritalStatus | undefined,
        nationality: source['nationality'] as string | undefined,
        faculty_id: refId(faculty),
        faculty_name: (source['faculty_name'] as string | undefined) ?? refName(faculty),
        program_id: refId(program),
        program_name: (source['program_name'] as string | undefined) ?? refName(program),
        program_code: (source['program_code'] as string | undefined) ?? refCode(program),
        // La liste renvoie la promotion à plat (`program_level_id`, `level_name`).
        level_id: (source['program_level_id'] as string | undefined) ?? refId(nestedLevel) ?? refId(level),
        level_code: (source['level_code'] as string | undefined) ?? refCode(nestedLevel),
        level_name: (source['level_name'] as string | undefined) ?? refName(nestedLevel),
        academic_year_id: refId(year),
        academic_year_label:
            (source['academic_year_label'] as string | undefined) ??
            (year && typeof year === 'object' && 'label' in year
                ? String((year as { label?: unknown }).label ?? '')
                : undefined),
        user_id: refId(user),
        avatar_url: (source['avatar_url'] as string | null | undefined) ?? null,
        origin,
        tutor,
        emergency_contact: emergency,
        academic_background: background,
        documents: Array.isArray(source['documents']) ? (source['documents'] as StudentDocument[]) : []
    };
}
