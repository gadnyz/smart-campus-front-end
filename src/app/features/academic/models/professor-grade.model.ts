export interface ProfessorGrade {
    id: string;
    code: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export interface ProfessorGradeRequest {
    code: string;
    name: string;
}