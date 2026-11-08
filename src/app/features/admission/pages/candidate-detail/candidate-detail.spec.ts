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
                'resolveDocumentViewUrl',
                'update'
            ]
        );
        academicReferenceService =
            jasmine.createSpyObj<AdmissionAcademicReferenceService>(
                'AdmissionAcademicReferenceService',
                ['resolveCandidateLabels', 'getFacultyOptions', 'getProgramOptionsByFaculty', 'getProgramReferencesByFaculty']
            );
        permissionService = jasmine.createSpyObj<PermissionService>(
            'PermissionService',
            ['hasPermission', 'hasAnyPermission', 'canAccess', 'canWrite']
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
        academicReferenceService.getFacultyOptions.and.returnValue(of([{ label: 'Sciences', value: 'fac-1' }]));
        academicReferenceService.getProgramOptionsByFaculty.and.returnValue(of([{ label: 'Informatique', value: 'prog-1' }]));
        academicReferenceService.getProgramReferencesByFaculty.and.returnValue(of([]));
        permissionService.hasPermission.and.callFake(
            (permission) =>
                permission ===
                AdmissionPermission.AdmissionCandidateUpdateAll
        );
        permissionService.hasAnyPermission.and.returnValue(true);
        permissionService.canAccess.and.returnValue(true);
        // Valider et rejeter : modifier les candidatures au-delà de son propre dossier.
        permissionService.canWrite.and.callFake((permission) => permission === 'admission:candidate:update');

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

    it('should read the dossier with the shared components, without the candidate upload actions', () => {
        fixture.detectChanges();
        const element = fixture.nativeElement as HTMLElement;

        expect(element.querySelector('app-candidate-dossier-hero')).not.toBeNull();
        expect(element.querySelector('app-candidate-dossier-sections')).not.toBeNull();
        expect(element.querySelector('.document-row__missing')?.textContent?.trim()).toBe('Non fournie');
        expect(element.textContent).not.toContain('Choisir');
        expect(element.textContent).not.toContain('Remplacer');
    });

    it('should resolve documents through the staff route', () => {
        const document = { id: 'doc-1', document_type: 'DIPLOMA' as const, file_url: '', uploaded_at: '2026-10-02T09:00:00Z' };
        candidateService.resolveDocumentViewUrl.and.returnValue(of('https://s3/doc-1'));

        component.documentUrls.load([document]);

        expect(candidateService.resolveDocumentViewUrl).toHaveBeenCalledWith('c1', document);
        expect(component.documentUrls.url(document)).toBe('https://s3/doc-1');
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
        component['rejectCandidate']('c1', 'Dossier incomplet');

        expect(component.candidate()?.candidature.status).toBe('REJECTED');
        expect(candidateService.reject).toHaveBeenCalledWith(
            'c1',
            'Dossier incomplet'
        );
        expect(component.currentStatusLabel()).toBe('Rejetée');
    });

    it('should require a rejection reason before submitting reject dialog', () => {
        component.rejectReason.set('');
        component.submitReject();

        expect(candidateService.reject).not.toHaveBeenCalled();
    });

    it('should submit reject dialog with trimmed reason', () => {
        component.rejectReason.set('  Documents manquants  ');
        component.submitReject();

        expect(candidateService.reject).toHaveBeenCalledWith(
            'c1',
            'Documents manquants'
        );
    });

    describe('modification par le personnel', () => {
        const actionLabels = () => component.actions().map((action) => action.label);

        it('ouvre le formulaire rempli avec le dossier, email en lecture', () => {
            expect(actionLabels()).toContain('Modifier');
            component.startEdit();
            fixture.detectChanges();

            expect(component.editing()).toBeTrue();
            expect(actionLabels()).toEqual(['Annuler', 'Enregistrer']);
            expect(component.form.controls.last_name.value).toBe('Lovelace');
            expect(component.form.controls.level_id.value).toBe('lvl-1');
            expect(component.form.controls.email.disabled).toBeTrue();
            expect(component.form.valid).toBeTrue();
            expect((fixture.nativeElement as HTMLElement).querySelector('app-candidate-dossier-form')).not.toBeNull();
        });

        it('enregistre par PUT /candidates/{id}, sans l’email', () => {
            const updated = { ...candidate, last_name: 'Byron' };
            candidateService.update.and.returnValue(of(updated));
            component.startEdit();
            component.form.controls.last_name.setValue('  Byron ');
            component.saveEdit();

            const [id, payload] = candidateService.update.calls.mostRecent().args;
            expect(id).toBe('c1');
            expect(payload.last_name).toBe('Byron');
            expect(payload.program_id).toBe('prog-1');
            expect('email' in payload).toBeFalse();
            expect(component.editing()).toBeFalse();
            expect(component.candidate()?.last_name).toBe('Byron');
        });

        it('n’envoie rien tant qu’un champ obligatoire manque', () => {
            component.startEdit();
            component.form.controls.phone.setValue('');
            component.saveEdit();

            expect(candidateService.update).not.toHaveBeenCalled();
            expect(component.editing()).toBeTrue();
        });

        it('annule sans toucher au dossier', () => {
            component.startEdit();
            component.form.controls.last_name.setValue('Autre');
            component.cancelEdit();

            expect(component.editing()).toBeFalse();
            expect(component.candidate()?.last_name).toBe('Lovelace');
        });

        it('n’est pas proposée pour un dossier validé ni sans le droit', () => {
            component.candidate.set({ ...candidate, candidature: { ...candidate.candidature, status: 'VALIDATED' } });
            expect(component.canEdit()).toBeFalse();
            component.startEdit();
            expect(component.editing()).toBeFalse();
        });
    });
});
