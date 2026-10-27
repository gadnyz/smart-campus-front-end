import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { CandidateResponse } from '../../models/candidate.model';
import { AdmissionAcademicReferenceService } from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import { CandidatePortal } from './candidate-portal';

const candidate: CandidateResponse = {
    id: 'c1',
    academic_year_id: 'y1',
    faculty_id: 'f1',
    program_id: 'p1',
    level_id: 'l1',
    first_name: 'Grâce',
    last_name: 'Mbuyi',
    middle_name: '',
    gender: 'FEMALE',
    birth_date: '2006-04-18',
    birth_place: 'Lubumbashi',
    marital_status: 'SINGLE',
    nationality: 'Congolaise',
    email: 'grace@example.org',
    phone: '+243990123456',
    origin: { province: 'Haut-Katanga', territory: 'Kipushi', sector: 'Kaponda', commune: 'Kampemba' },
    tutor: { full_name: 'Jean Mbuyi', email: '', phone: '+243970000111', profession: '' },
    emergency_contact: { full_name: 'Marie Kalenga', email: '', phone: '+243810222333', relationship: '' },
    academic_background: { school_name: 'Institut Maadini', option: 'Scientifique', percentage: 72, graduation_year: 2025, study_country: 'RDC', study_city: 'Lubumbashi' },
    candidature: { type: 'NEW', status: 'PENDING', submitted_at: '2026-10-02T09:14:00Z' },
    documents: [],
    created_at: '2026-09-28T15:00:00Z',
    updated_at: '2026-10-20T11:42:00Z'
};

describe('CandidatePortal', () => {
    let fixture: ComponentFixture<CandidatePortal>;
    let portal: CandidatePortal;
    let candidateService: jasmine.SpyObj<CandidateService>;

    beforeEach(() => {
        candidateService = jasmine.createSpyObj<CandidateService>('CandidateService', ['getMine', 'updateMine', 'resolveOwnDocumentViewUrl']);
        candidateService.getMine.and.returnValue(of(candidate));
        candidateService.updateMine.and.returnValue(of(candidate));
        const academicRefs = jasmine.createSpyObj<AdmissionAcademicReferenceService>('AdmissionAcademicReferenceService', [
            'getFacultyOptions',
            'getProgramOptionsByFaculty',
            'getProgramReferencesByFaculty',
            'resolveCandidateLabels'
        ]);
        academicRefs.getFacultyOptions.and.returnValue(of([{ label: 'Sciences', value: 'f1' }]));
        academicRefs.getProgramOptionsByFaculty.and.returnValue(of([{ label: 'Informatique', value: 'p1' }]));
        academicRefs.getProgramReferencesByFaculty.and.returnValue(of([]));
        academicRefs.resolveCandidateLabels.and.returnValue(
            of({ facultyLabel: 'Sciences', programLabel: 'Informatique', levelLabel: 'L1', academicYearLabel: '2026-2027' })
        );

        TestBed.configureTestingModule({
            imports: [CandidatePortal],
            providers: [
                provideRouter([]),
                { provide: CandidateService, useValue: candidateService },
                { provide: AdmissionAcademicReferenceService, useValue: academicRefs },
                { provide: PermissionService, useValue: { hasPermission: () => false, canAccess: () => true } }
            ]
        });
        fixture = TestBed.createComponent(CandidatePortal);
        portal = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should load the own dossier through /candidates/me', () => {
        expect(candidateService.getMine).toHaveBeenCalledWith(true);
        expect(portal.fullName()).toBe('Grâce Mbuyi');
    });

    it('should keep faculty, program and level when entering edit mode', () => {
        portal.startEdit();

        expect(portal.form.controls.program_id.value).toBe('p1');
        expect(portal.form.controls.level_id.value).toBe('l1');
        expect(portal.form.valid).toBeTrue();
    });

    it('should save an untouched dossier without asking to complete it', () => {
        portal.startEdit();
        portal.save();

        expect(candidateService.updateMine).toHaveBeenCalledOnceWith(jasmine.objectContaining({ program_id: 'p1', level_id: 'l1' }));
    });

    it('should accept the same optional fields as the application form', () => {
        portal.startEdit();
        portal.form.patchValue({ middle_name: '', tutor_email: '', tutor_profession: '', emergency_email: '', emergency_relationship: '' });

        expect(portal.form.valid).toBeTrue();
    });
});
