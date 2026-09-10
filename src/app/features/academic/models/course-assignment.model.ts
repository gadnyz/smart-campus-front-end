export type CourseAssignmentType = 'LEAD_INSTRUCTOR' | 'CO_INSTRUCTOR';
export type CourseAssignmentStatus = 'ACTIVE' | 'INACTIVE';

export interface CourseAssignment {
    id: string;
    course_id: string;
    professor_id: string;
    academic_year_id: string;
    assignment_type: CourseAssignmentType;
    status: CourseAssignmentStatus;
    professor_first_name?: string;
    professor_last_name?: string;
    professor_name?: string;
    academic_year_label?: string;
    course_code?: string;
    course_name?: string;
}

export interface CreateCourseAssignmentRequest {
    course_id: string;
    professor_id: string;
    academic_year_id: string;
    assignment_type: CourseAssignmentType;
}

export interface UpdateCourseAssignmentRequest {
    assignment_type: CourseAssignmentType;
    status: CourseAssignmentStatus;
}