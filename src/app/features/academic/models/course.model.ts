/**
 * Un cours (`CourseResponse`). Il appartient à une faculté et peut figurer dans plusieurs UE,
 * avec des crédits propres à chacune : l'API ne renvoie donc pas d'UE sur le cours lui-même,
 * et `credits` n'est qu'un crédit par défaut.
 */
export interface Course {
    id: string;
    code: string;
    name: string;
    description: string;
    credits: number;
    faculty_id?: string;
    created_at?: string;
    updated_at?: string;
}

/** `POST /courses` : rattaché d'emblée à une UE, ou à défaut à une faculté. */
export interface CreateCourseRequest {
    code: string;
    name: string;
    description: string;
    credits: number;
    course_unit_id?: string;
    faculty_id?: string;
}

/** `PUT /courses/{id}` : le rattachement aux UE se gère depuis l'UE. */
export interface UpdateCourseRequest {
    code: string;
    name: string;
    description: string;
    credits: number;
}

export interface CourseQuery {
    facultyId?: string | null;
    /** Début du code ou du nom. */
    search?: string | null;
    page?: number;
    size?: number;
    sort?: string[];
}
