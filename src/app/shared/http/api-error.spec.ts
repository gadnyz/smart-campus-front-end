import { HttpErrorResponse } from '@angular/common/http';
import { UNREACHABLE_MESSAGE, apiErrorMessage, apiInvalidFields } from './api-error';

describe('api-error', () => {
    const http = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

    it('should prefer the localized detail of the backend', () => {
        expect(apiErrorMessage(http(409, { detail: 'Cette semaine est déjà close.' }), 'Repli')).toBe('Cette semaine est déjà close.');
    });

    it('should fall back to the screen message without a detail', () => {
        expect(apiErrorMessage(http(500, { title: 'Internal' }), 'Impossible de charger.')).toBe('Impossible de charger.');
        expect(apiErrorMessage(http(500, '   '), 'Impossible de charger.')).toBe('Impossible de charger.');
        expect(apiErrorMessage(new Error('boom'), 'Repli')).toBe('Repli');
    });

    it('should tell an unreachable server apart from a refusal', () => {
        expect(apiErrorMessage(http(0, null), 'Impossible de charger.')).toBe(UNREACHABLE_MESSAGE);
    });

    it('should read a plain object shaped like an HTTP error', () => {
        expect(apiErrorMessage({ error: { detail: 'Refusé' } }, 'Repli')).toBe('Refusé');
    });

    it('should extract the invalid fields only', () => {
        expect(apiInvalidFields(http(400, { invalid_fields: { email: 'Email invalide', count: 3 } }))).toEqual({ email: 'Email invalide' });
        expect(apiInvalidFields(http(400, { detail: 'x' }))).toEqual({});
    });
});
