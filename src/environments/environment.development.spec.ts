import { environment } from './environment.development';

describe('environment.development', () => {
    it('uses a same-origin API base so ng serve can proxy /api and avoid browser CORS', () => {
        expect(environment.production).toBeFalse();
        expect(environment.apiBaseUrl).toBe('');
    });
});
