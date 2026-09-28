/**
 * Forme paginée standard renvoyée par le backend (voir schéma OpenAPI `PagedResponse`).
 * Rassemble ici la définition dupliquée dans `academic-reference.model.ts`,
 * `identity-management.model.ts`, `user.service.ts` et `candidate.model.ts`
 * (cf. AUDIT_ANGULAR.md, plan d'action §8.2) — les nouveaux modules doivent
 * réutiliser celle-ci plutôt qu'en redéclarer une copie.
 */
export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    total_elements: number;
    total_pages: number;
}
