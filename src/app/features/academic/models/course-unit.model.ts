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

export const UE_BLOC_OPTIONS: { label: string; value: KnowledgeSkillsBloc }[] = [
    { label: 'Fondamental', value: 'FONDAMENTAL' },
    { label: 'Développement', value: 'DEVELOPMENT' },
    { label: 'Transversal', value: 'CROSS_FUNCTIONAL' }
];