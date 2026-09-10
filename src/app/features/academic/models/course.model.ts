export interface Course {
    id: string;
    code: string;
    name: string;
    description: string;
    credits: number;
    course_unit_id: string;
    course_unit_code?: string;
    faculty_id?: string;
    faculty_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CourseRequest {
    code: string;
    name: string;
    description: string;
    credits: number;
    course_unit_id: string;
}