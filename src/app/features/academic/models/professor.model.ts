export interface Professor {
    id: string;
    first_name: string;
    last_name: string;
    middle_name?: string | null;
    faculty_id: string;
    faculty_name?: string;
    professor_grade_id?: string;
    matricule?: string | null;
    user_id?: string;
}