export type KnowledgeSkillsBloc = 'FONDAMENTAL' | 'DEVELOPMENT' | 'CROSS_FUNCTIONAL';

/**
 * Une UE dans le curriculum d'une promotion (`ProgramLevelCourseUnitResponse`) : c'est la
 * forme des listes par promotion. Le bloc dépend de la promotion, une même UE pouvant figurer
 * dans plusieurs curricula (tronc commun).
 */
export interface CourseUnit {
    id: string;
    code: string;
    faculty_id?: string;
    program_level_id: string;
    knowledge_skills_bloc: KnowledgeSkillsBloc;
    created_at?: string;
    updated_at?: string;
}

/** La place d'une UE dans le curriculum d'une promotion (`CurriculumEntryResponse`). */
export interface CurriculumEntry {
    program_level_id: string;
    knowledge_skills_bloc: KnowledgeSkillsBloc;
}

/** Une UE et toutes les promotions où elle figure (`CourseUnitResponse`). */
export interface CourseUnitDetail {
    id: string;
    code: string;
    faculty_id: string;
    curriculum: CurriculumEntry[];
    created_at?: string;
    updated_at?: string;
}

/** `POST /course-units` : au moins une promotion, toutes de la même faculté. */
export interface CreateCourseUnitRequest {
    code: string;
    knowledge_skills_bloc: KnowledgeSkillsBloc;
    program_level_ids: string[];
}

/** `PUT /course-units/{id}` : seul le code ; le bloc se change par promotion. */
export interface UpdateCourseUnitRequest {
    code: string;
}

/** Un cours dans une UE, avec ses crédits propres à cette UE (`CourseUnitCourseResponse`). */
export interface CourseUnitCourse {
    course_id: string;
    code: string;
    name: string;
    credits: number;
}

/** `POST /course-units/{id}/courses` : crédits du cours par défaut s'ils sont omis. */
export interface AttachCourseRequest {
    course_id: string;
    credits?: number;
}

export const UE_BLOC_OPTIONS: { label: string; value: KnowledgeSkillsBloc }[] = [
    { label: 'Fondamental', value: 'FONDAMENTAL' },
    { label: 'Développement', value: 'DEVELOPMENT' },
    { label: 'Transversal', value: 'CROSS_FUNCTIONAL' }
];

export function blocLabel(bloc: string | null | undefined): string {
    return UE_BLOC_OPTIONS.find((item) => item.value === bloc)?.label ?? (bloc || '—');
}
