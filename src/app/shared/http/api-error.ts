import { HttpErrorResponse } from '@angular/common/http';
import { readableApiText } from './readable-api-text';

/** Message affiché quand le serveur n'a pas répondu (réseau coupé, backend arrêté, CORS). */
export const UNREACHABLE_MESSAGE = 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.';

function problem(error: unknown): Record<string, unknown> | null {
    if (!(error instanceof HttpErrorResponse)) {
        return error && typeof error === 'object' && 'error' in error && (error as { error: unknown }).error && typeof (error as { error: unknown }).error === 'object'
            ? ((error as { error: Record<string, unknown> }).error)
            : null;
    }
    return error.error && typeof error.error === 'object' ? (error.error as Record<string, unknown>) : null;
}

/**
 * Message d'une erreur d'API, tel qu'il s'affiche dans un toast : le `detail` du ProblemDetail
 * renvoyé par le backend (déjà localisé), sinon un message de repli propre à l'écran. Une absence
 * de réponse (statut 0) n'est pas confondue avec un refus du serveur.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
    const detail = problem(error)?.['detail'];
    if (typeof detail === 'string' && detail.trim()) {
        // Jamais d'identifiant technique ni de date ISO à l'écran.
        return readableApiText(detail) || fallback;
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
        return UNREACHABLE_MESSAGE;
    }
    return fallback;
}

/** Erreurs de validation par champ (`invalid_fields` du ProblemDetail), vide sinon. */
export function apiInvalidFields(error: unknown): Record<string, string> {
    const fields = problem(error)?.['invalid_fields'];
    if (!fields || typeof fields !== 'object') {
        return {};
    }
    return Object.fromEntries(Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}
