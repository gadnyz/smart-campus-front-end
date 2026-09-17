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
    return name || student.matricule || student.email || student.id;
}
