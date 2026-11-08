import { HttpParams } from '@angular/common/http';

export type ApiParamValue = string | number | boolean | null | undefined;

/** Clé de paramètre telle que l'API l'attend : snake_case (`program_level_id`, `reference_date`). */
const SNAKE_CASE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;

/**
 * Paramètres de requête de l'API. Spring ignore sans erreur un paramètre inconnu : une clé en
 * camelCase (`programLevelId`) passe donc inaperçue et le filtre n'est pas appliqué. Les clés
 * sont contrôlées ici, les valeurs vides omises, et un tableau répète la clé (`sort=a&sort=b`).
 */
export function toApiParams(params: Record<string, ApiParamValue | readonly string[]>): HttpParams {
    let result = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
        if (!SNAKE_CASE.test(key)) {
            throw new Error(`Paramètre d'API « ${key} » : l'API attend du snake_case.`);
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                result = result.append(key, item);
            }
            continue;
        }
        const scalar = typeof value === 'string' ? value.trim() : value;
        if (scalar === undefined || scalar === null || scalar === '') {
            continue;
        }
        result = result.set(key, String(scalar));
    }
    return result;
}
