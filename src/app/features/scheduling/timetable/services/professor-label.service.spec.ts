import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProfessorService } from '@/app/features/academic/academic.public-api';
import { ProfessorLabelService, professorLabel } from './professor-label.service';

describe('ProfessorLabelService', () => {
    function service(getAll: jasmine.Spy): ProfessorLabelService {
        TestBed.configureTestingModule({ providers: [{ provide: ProfessorService, useValue: { getAll } }] });
        return TestBed.inject(ProfessorLabelService);
    }

    it('should label a professor with grade code, first name and last name', () => {
        expect(professorLabel({ professor_grade_code: 'PO', first_name: 'Ada', last_name: 'Lovelace' })).toBe('PO Ada Lovelace');
        expect(professorLabel({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Ada Lovelace');
    });

    it('should load the directory once and share it', () => {
        const getAll = jasmine.createSpy('getAll').and.returnValue(
            of([{ id: 'prof-1', first_name: 'Ada', last_name: 'Lovelace', professor_grade_code: 'PO', faculty_id: 'fac-1' }])
        );
        const labels = service(getAll);

        let first = new Map<string, string>();
        labels.labels().subscribe((map) => (first = map));
        labels.labels().subscribe();

        expect(first.get('prof-1')).toBe('PO Ada Lovelace');
        expect(getAll).toHaveBeenCalledTimes(1);
    });

    it('should fall back to an empty directory when it cannot be read', () => {
        const labels = service(jasmine.createSpy('getAll').and.returnValue(throwError(() => new Error('403'))));

        let result: Map<string, string> | undefined;
        labels.labels().subscribe((map) => (result = map));

        expect(result?.size).toBe(0);
    });
});
