import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AcademicCatalogService } from '@/app/features/academic/academic.public-api';
import { CandidateResponse } from '../models/candidate.model';
import { AdmissionAcademicReferenceService } from './admission-academic-reference.service';

const candidate = { academic_year_id: 'y1', faculty_id: 'f1', program_id: 'p1', level_id: 'l1' } as CandidateResponse;

describe('AdmissionAcademicReferenceService.resolveCandidateLabels', () => {
    let catalog: jasmine.SpyObj<AcademicCatalogService>;
    let service: AdmissionAcademicReferenceService;

    beforeEach(() => {
        catalog = jasmine.createSpyObj<AcademicCatalogService>('AcademicCatalogService', [
            'getAcademicYearById',
            'getCurrentAcademicYear',
            'getFacultyById',
            'getProgramById',
            'getLevelById'
        ]);
        catalog.getFacultyById.and.returnValue(of({ id: 'f1', code: 'FSI', name: 'Sciences Informatiques' }));
        catalog.getProgramById.and.returnValue(of(null) as never);
        catalog.getLevelById.and.returnValue(of(null) as never);
        TestBed.configureTestingModule({ providers: [{ provide: AcademicCatalogService, useValue: catalog }] });
        service = TestBed.inject(AdmissionAcademicReferenceService);
    });

    it('should use the current academic year when the list is not readable (candidate)', (done) => {
        catalog.getAcademicYearById.and.returnValue(throwError(() => new Error('403')));
        catalog.getCurrentAcademicYear.and.returnValue(of({ id: 'y1', label: '2026-2027' }) as never);

        service.resolveCandidateLabels(candidate).subscribe((labels) => {
            expect(labels.academicYearLabel).toBe('2026-2027');
            expect(labels.facultyLabel).toBe('FSI - Sciences Informatiques');
            done();
        });
    });

    it('should never show the raw identifier of an unknown academic year', (done) => {
        catalog.getAcademicYearById.and.returnValue(of(null) as never);
        catalog.getCurrentAcademicYear.and.returnValue(of({ id: 'other', label: '2025-2026' }) as never);

        service.resolveCandidateLabels(candidate).subscribe((labels) => {
            expect(labels.academicYearLabel).toBe('');
            done();
        });
    });
});
