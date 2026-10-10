import { HttpErrorResponse } from '@angular/common/http';

/** Erreur d'une séance d'un lot refusé (422) : `index` est sa position dans la requête. */
export interface TimetableEntryBatchError {
    index: number;
    code: string;
    message: string;
}

export function readDetail(error: HttpErrorResponse): string {
    const body = error.error;
    if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        return body.detail;
    }
    return '';
}

export function readInvalidFields(error: HttpErrorResponse): Record<string, string> {
    const body = error.error;
    if (!body || typeof body !== 'object' || !('invalid_fields' in body)) {
        return {};
    }
    const fields = body.invalid_fields;
    if (!fields || typeof fields !== 'object') {
        return {};
    }
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') {
            result[key] = value;
        }
    }
    return result;
}

export function readBatchErrors(error: HttpErrorResponse): TimetableEntryBatchError[] {
    const body = error.error;
    if (!body || typeof body !== 'object' || !('errors' in body) || !Array.isArray(body.errors)) {
        return [];
    }
    return body.errors.flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') {
            return [];
        }
        const source = item as Record<string, unknown>;
        if (typeof source['index'] !== 'number') {
            return [];
        }
        return [
            {
                index: source['index'],
                code: typeof source['code'] === 'string' ? source['code'] : '',
                message: typeof source['message'] === 'string' ? source['message'] : ''
            }
        ];
    });
}

/**
 * Le `detail` du backend est déjà localisé et précis (semaine close, hors année, horaire
 * verrouillé…) : il passe avant les messages génériques, qui ne servent qu'à défaut.
 */
export function timetableErrorMessage(error: HttpErrorResponse): string {
    const detail = readDetail(error);
    if (detail) {
        return detail;
    }
    switch (error.status) {
        case 0:
            return 'Le serveur est injoignable. Vérifiez votre connexion.';
        case 400:
            return 'La requête est invalide.';
        case 403:
            return 'Vous n’avez pas les droits nécessaires.';
        case 404:
            return 'Horaire, salle ou affectation introuvable.';
        case 409:
            return 'Conflit avec un horaire ou un créneau existant.';
        case 422:
            return 'Certaines sessions sont refusées.';
        default:
            return 'Une erreur inattendue est survenue.';
    }
}
