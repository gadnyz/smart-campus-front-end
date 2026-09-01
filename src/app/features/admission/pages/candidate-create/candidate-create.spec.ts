import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AdmissionAcademicReferenceService } from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import { CandidateCreate } from './candidate-create';

describe('CandidateCreate', () => {
    let component: CandidateCreate;
    let fixture: ComponentFixture<CandidateCreate>;

    beforeEach(async () => {
        const candidateService = jasmine.createSpyObj<CandidateService>(
            'CandidateService',
            ['submit', 'requestDocumentUploadUrl', 'uploadDocument', 'confirmDocumentUpload']
        );
        const academicReferenceService =
            jasmine.createSpyObj<AdmissionAcademicReferenceService>(
                'AdmissionAcademicReferenceService',
                ['getFacultyOptions', 'getProgramReferencesByFaculty']
            );

        academicReferenceService.getFacultyOptions.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [CandidateCreate],
            providers: [
                provideRouter([]),
                { provide: CandidateService, useValue: candidateService },
                {
                    provide: AdmissionAcademicReferenceService,
                    useValue: academicReferenceService
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CandidateCreate);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
