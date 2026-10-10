import { HttpErrorResponse } from '@angular/common/http';
import { readBatchErrors, readDetail, readInvalidFields, timetableErrorMessage } from './timetable-error';

function httpError(status: number, error: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error });
}

describe('timetable-error', () => {
    it('should read the ProblemDetail detail', () => {
        expect(readDetail(httpError(409, { detail: 'Semaine close' }))).toBe('Semaine close');
        expect(readDetail(httpError(409, 'plain text'))).toBe('');
    });

    it('should read invalid fields, ignoring non-string values', () => {
        expect(readInvalidFields(httpError(400, { invalid_fields: { week_start: 'requis', other: 3 } }))).toEqual({ week_start: 'requis' });
        expect(readInvalidFields(httpError(400, {}))).toEqual({});
    });

    it('should read the per-entry errors of a rejected batch', () => {
        const error = httpError(422, {
            errors: [
                { index: 1, code: 'ROOM_CONFLICT', message: 'Salle occupée' },
                { code: 'NO_INDEX' },
                null
            ]
        });
        expect(readBatchErrors(error)).toEqual([{ index: 1, code: 'ROOM_CONFLICT', message: 'Salle occupée' }]);
        expect(readBatchErrors(httpError(422, {}))).toEqual([]);
    });

    it('should prefer the localized backend detail over generic messages', () => {
        expect(timetableErrorMessage(httpError(409, { detail: 'Horaire verrouillé' }))).toBe('Horaire verrouillé');
        expect(timetableErrorMessage(httpError(409, {}))).toBe('Conflit avec un horaire ou un créneau existant.');
        expect(timetableErrorMessage(httpError(0, null))).toContain('injoignable');
    });

    it('should fall back to a message per status', () => {
        const messages = [400, 403, 404, 422, 500].map((status) => timetableErrorMessage(httpError(status, null)));
        expect(messages).toEqual([
            'La requête est invalide.',
            'Vous n’avez pas les droits nécessaires.',
            'Horaire, salle ou affectation introuvable.',
            'Certaines sessions sont refusées.',
            'Une erreur inattendue est survenue.'
        ]);
    });
});
