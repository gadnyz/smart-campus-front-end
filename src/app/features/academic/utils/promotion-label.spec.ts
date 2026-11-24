import { levelLabel, promotionLabel } from './promotion-label';

describe('promotion labels', () => {
    it('should write a level as its code by default, and its name in the long form', () => {
        expect(levelLabel({ code: 'L1', name: 'Licence 1' })).toBe('L1');
        expect(levelLabel({ code: 'M2', name: 'Master 2' }, 'long')).toBe('Master 2');
    });

    it('should find the code when the API only gives the name', () => {
        expect(levelLabel({ name: 'Licence 3' })).toBe('L3');
        expect(levelLabel({ name: 'Master 1' })).toBe('M1');
        expect(levelLabel({ name: 'Préparatoire' })).toBe('PREPA');
        expect(levelLabel({ name: 'Doctorat' })).toBe('Doctorat');
    });

    it('should write a promotion as the level then the program', () => {
        expect(promotionLabel({ code: 'L3', name: 'Licence 3' }, 'Génie Logiciel')).toBe('L3 Génie Logiciel');
        expect(promotionLabel({ code: 'L3', name: 'Licence 3' }, 'Génie Logiciel', 'long')).toBe('Licence 3 Génie Logiciel');
    });

    it('should stay empty without data', () => {
        expect(levelLabel(null)).toBe('');
        expect(promotionLabel(null, 'Génie Logiciel')).toBe('Génie Logiciel');
    });
});
