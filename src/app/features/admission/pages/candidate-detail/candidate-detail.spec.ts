import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BehaviorSubject, of } from 'rxjs';

import { PermissionService } from '@/app/core/permissions/permission.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';

import { CandidateResponse } from '../../models/candidate.model';
import { AdmissionPermission } from '../../permissions/permission.model';
import {
    AdmissionAcademicReferenceService
} from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import { CandidateDetail } from './candidate-detail';

describe('CandidateDetail', () => {
    let component: CandidateDetail;
    let fixture: ComponentFixture<CandidateDetail>;
    let candidateService: jasmine.SpyObj<CandidateService>;
    let academicReferenceService: jasmine.SpyObj<AdmissionAcademicReferenceService>;
    let permissionService: jasmine.SpyObj<PermissionService>;
    let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

    const candidate: CandidateResponse = {
        id: 'c1',
        faculty_id: 'fac-1',
        program_id: 'prog-1',
        level_id: 'lvl-1',
        academic_year_id: 'year-1',
        first_name: 'Ada',
        middle_name: '',
        last_name: 'Lovelace',
        gender: 'FEMALE',
        birth_date: '2000-01-01',
        birth_place: 'Kinshasa',
        marital_status: 'SINGLE',
        nationality: 'CD',
        email: 'ada@example.com',
        phone: '+243810000001',
        origin: {
            province: 'Kinshasa',
            territory: 'Gombe',
            sector: 'Centre',
            commune: 'Gombe'
        },
        tutor: {
            full_name: 'Tutor',
            email: 'tutor@example.com',
            phone: '+243810000002',
            profession: 'Engineer'
        },
        emergency_contact: {
            full_name: 'Emergency',
            email: 'emergency@example.com',
            phone: '+243810000003',
            relationship: 'Parent'
        },
        academic_background: {
            school_name: 'Lycée',
            option: 'Math',
            percentage: 75,
            graduation_year: 2018,
            study_country: 'CD',
            study_city: 'Kinshasa'
        },
        candidature: {
            type: 'NEW',
            status: 'PENDING',
            submitted_at: '2026-01-10T10:00:00Z'
        },
        documents: [],
        created_at: '2026-01-10T10:00:00Z',
        updated_at: '2026-01-10T10:00:00Z'
    };

    beforeEach(async () => {
        sessionStorage.clear();
        paramMap$ = new BehaviorSubject(
            convertToParamMap({ id: 'c1' })
        );

        candidateService = jasmine.createSpyObj<CandidateService>(
            'CandidateService',
            [
                'getById',
                'validate',
                'reject',
                'peekCandidate',
                'prefetchCandidate',
                'clearDetailCache',
                'getAll',
                'resolveDocumentViewUrl'
            ]
        );
        academicReferenceService =
            jasmine.createSpyObj<AdmissionAcademicReferenceService>(
                'AdmissionAcademicReferenceService',
                ['resolveCandidateLabels']
            );
        permissionService = jasmine.createSpyObj<PermissionService>(
            'PermissionService',
            ['hasPermission', 'hasAnyPermission', 'canAccess']
        );

        candidateService.peekCandidate.and.returnValue(null);
        candidateService.getById.and.returnValue(of(candidate));
        candidateService.resolveDocumentViewUrl.and.returnValue(of(''));
        candidateService.getAll.and.returnValue(
            of({
                content: [],
                page: 0,
                size: 10,
                total_elements: 0,
                total_pages: 0
            })
        );
        candidateService.validate.and.returnValue(
            of({
                ...candidate,
                candidature: {
                    ...candidate.candidature,
                    status: 'VALIDATED'
                }
            })
        );
        candidateService.reject.and.returnValue(
            of({
                ...candidate,
                candidature: {
                    ...candidate.candidature,
                    status: 'REJECTED'
                }
            })
        );
        academicReferenceService.resolveCandidateLabels.and.returnValue(
            of({
                academicYearLabel: '2025-2026',
                facultyLabel: 'Sciences',
                programLabel: 'Informatique',
                levelLabel: 'L1'
            })
        );
        permissionService.hasPermission.and.callFake(
            (permission) =>
                permission ===
                AdmissionPermission.AdmissionCandidateUpdateAll
        );
        permissionService.hasAnyPermission.and.returnValue(true);
        permissionService.canAccess.and.returnValue(true);

        await TestBed.configureTestingModule({
            imports: [CandidateDetail],
            providers: [
                provideRouter([]),
                ConfirmationService,
                MessageService,
                DetailNavigationService,
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: paramMap$.asObservable()
                    }
                },
                { provide: CandidateService, useValue: candidateService },
                {
                    provide: AdmissionAcademicReferenceService,
                    useValue: academicReferenceService
                },
                { provide: PermissionService, useValue: permissionService }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CandidateDetail);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should create and load candidate detail', () => {
        expect(component).toBeTruthy();
        expect(candidateService.getById).toHaveBeenCalledWith('c1', true);
        expect(component.candidate()?.id).toBe('c1');
        expect(component.academicLabels()?.facultyLabel).toBe('Sciences');
    });

    it('should allow validate and reject for pending candidates with permission', () => {
        expect(component.canValidate()).toBeTrue();
        expect(component.canReject()).toBeTrue();
        expect(component.canManageCandidate).toBeTrue();
    });

    it('should validate candidate and update status immediately', () => {
        component['validateCandidate']('c1');

        expect(component.candidate()?.candidature.status).toBe('VALIDATED');
        expect(candidateService.validate).toHaveBeenCalledWith('c1');
        expect(component.currentStatusLabel()).toBe('Validée');
    });

    it('should reject candidate and update status immediately', () => {
        component['rejectCandidate']('c1');

        expect(component.candidate()?.candidature.status).toBe('REJECTED');
        expect(candidateService.reject).toHaveBeenCalledWith('c1');
        expect(component.currentStatusLabel()).toBe('Rejetée');
    });
});
