export type KnowledgeSkillsBloc = 'FONDAMENTAL' | 'DEVELOPMENT' | 'CROSS_FUNCTIONAL';

export interface CourseUnit {
    id: string;
    code: string;
    knowledge_skills_bloc: KnowledgeSkillsBloc;
    faculty_id: string;
    faculty_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface CourseUnitRequest {
    code: string;
    knowledge_skills_bloc: KnowledgeSkillsBloc;
    faculty_id: string;
}