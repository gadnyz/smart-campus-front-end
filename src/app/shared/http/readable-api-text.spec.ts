import { readableApiText } from './readable-api-text';

describe('readableApiText', () => {
    it('should name a known identifier and write the date in French', () => {
        const labels = new Map([['01a1bc59-0968-778b-95b6-d3ab33a314cf', 'Génie Logiciel L4']]);
        expect(readableApiText('Le niveau de parcours 01a1bc59-0968-778b-95b6-d3ab33a314cf n’a pas d’emploi du temps pour la semaine du 2026-11-23.', labels)).toBe(
            'Le niveau de parcours Génie Logiciel L4 n’a pas d’emploi du temps pour la semaine du 23 novembre 2026.'
        );
    });

    it('should drop an unknown identifier', () => {
        expect(readableApiText('La salle 01a1bc87-a035-7198-b6cf-2f25dc36d4d6 est déjà réservée.')).toBe('La salle est déjà réservée.');
    });
});
