import { CourseAssignment } from '@/app/features/academic/academic.public-api';

/**
 * Enseignant d'une séance, choisi sans intervention de l'utilisateur parmi les affectations
 * actives du cours : le titulaire, sinon l'assistant ajouté le premier. `null` si personne.
 */
export function pickSessionAssignment(assignments: readonly CourseAssignment[]): CourseAssignment | null {
    const active = assignments.filter((assignment) => assignment.status === 'ACTIVE');
    const firstAdded = (items: CourseAssignment[]) =>
        [...items].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0] ?? null;
    return firstAdded(active.filter((assignment) => assignment.assignment_type === 'LEAD_INSTRUCTOR')) ?? firstAdded(active.filter((assignment) => assignment.assignment_type === 'CO_INSTRUCTOR'));
}
