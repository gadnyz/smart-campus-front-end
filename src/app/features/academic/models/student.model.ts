import { refCode, refId, refName } from '../utils/academic-http';

export interface Student {
    id: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string | null;
    matricule?: string | null;
    email?: string;
    program_name?: string;
    program_code?: string;
    level_code?: string;
    level_name?: string;
    faculty_id?: string;
}

export function studentDisplayName(student: Student): string {
    const name = [student.last_name, student.first_name, student.middle_name].filter(Boolean).join(' ');
    return name || student.matricule || student.email || 'Étudiant';
}

export function normalizeStudent(raw: unknown): Student {
    const source = (raw ?? {}) as Record<string, unknown>;
    const program = source['program'] ?? source['programme'];
    const level = source['level'] ?? source['program_level'];
    const nestedLevel =
        level && typeof level === 'object' && 'level' in (level as object)
            ? (level as { level?: unknown }).level
            : level;

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
        program_name: (source['program_name'] as string | undefined) ?? refName(program),
        program_code: (source['program_code'] as string | undefined) ?? refCode(program),
        level_code: (source['level_code'] as string | undefined) ?? refCode(nestedLevel),
        level_name: (source['level_name'] as string | undefined) ?? refName(nestedLevel),
        faculty_id: refId(source['faculty'] ?? source['faculty_id'])
    };
}
