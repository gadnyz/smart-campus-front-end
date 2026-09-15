import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { ImageModule } from 'primeng/image';

import { isSignedUrlExpiredOrExpiring } from '@/app/shared/utils/signed-url';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import {
    CandidateDocument,
    CandidateDocumentType,
    CandidateGender,
    CandidateResponse,
    CandidatureType,
    MaritalStatus,
    UpdateOwnCandidatureRequest
} from '../../models/candidate.model';

import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '@/app/features/academic/permissions/permission.model';

import { AdmissionAcademicReferenceService, SelectOption } from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import {
    candidateStatusSeverity,
    formatCandidateDateTime,
    formatCandidateDocumentType,
    formatCandidatureStatus,
    resolveCandidateDocumentKind
} from '../../utils/candidate-format';

type DocDraft = {
    type: CandidateDocumentType;
    label: string;
    file: File | null;
};

@Component({
    selector: 'app-candidate-portal',
    standalone: true,
    imports: [
        DialogModule,
        ImageModule,
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        DatePicker,
        InputTextModule,
        SelectModule,
        SkeletonModule,
        TagModule,
        ToastModule,
        ContentSubtopbar
    ],
    providers: [MessageService],
    templateUrl: './candidate-portal.html',
    styleUrl: './candidate-portal.scss'
})
export class CandidatePortal implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly candidateService = inject(CandidateService);
    private readonly academicRefs = inject(AdmissionAcademicReferenceService);
    private readonly messageService = inject(MessageService);

    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);

    readonly studentPlaceholder = signal(false);


    private readonly sanitizer = inject(DomSanitizer);

    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly uploading = signal(false);
    readonly editing = signal(false);
    readonly notFound = signal(false);
    readonly candidate = signal<CandidateResponse | null>(null);

    readonly faculties = signal<SelectOption[]>([]);
    readonly programs = signal<SelectOption[]>([]);
    readonly levels = signal<SelectOption[]>([]);
    readonly academicLabels = signal({
        facultyLabel: '',
        programLabel: '',
        levelLabel: '',
        academicYearLabel: ''
    });

    readonly missingDocumentsLabel = computed(() =>
        this.missingDocumentTypes().map((type) => this.documentLabel(type)).join(', ')
    );

    openDocumentPicker(type: CandidateDocumentType): void {
        document.getElementById(`portal_doc_${type}`)?.click();
    }

    readonly pendingDocs = signal<DocDraft[]>([
        { type: 'ID_CARD', label: 'Pièce d’identité', file: null },
        { type: 'DIPLOMA', label: 'Diplôme', file: null },
        { type: 'TRANSCRIPT', label: 'Bulletins / Relevés de notes', file: null },
        { type: 'PAYMENT_SLIP', label: 'Preuve de paiement', file: null }
    ]);

    readonly status = computed(() => this.candidate()?.candidature.status ?? null);

    readonly statusLabel = computed(() => {
        const s = this.status();
        return s ? formatCandidatureStatus(s) : '';
    });

    readonly statusSeverity = computed(() => {
        const s = this.status();
        return s ? candidateStatusSeverity(s) : 'secondary';
    });

    readonly canEdit = computed(() => {
        const status = this.status();
        return status === 'DRAFT' || status === 'PENDING';
    });
    readonly canManageDocuments = computed(() => this.canEdit());
    readonly documentViewUrls = signal<Record<string, string>>({});
    readonly previewDocument = signal<CandidateDocument | null>(null);
    readonly previewVisible = signal(false);

    private readonly documentViewUrlRefreshAttempts = new Map<string, number>();
    private readonly maxDocumentViewUrlRefreshes = 2;

    readonly supportingDocuments = computed(
        () =>
            this.candidate()?.documents?.filter(
                (document) => document.document_type !== 'PHOTO'
            ) ?? []
    );

    readonly missingPendingDocs = computed(() => {
        const present = new Set(
            (this.candidate()?.documents ?? []).map((d) => d.document_type)
        );
        return this.pendingDocs().filter((d) => !present.has(d.type));
    });

    readonly previewTitle = computed(() => {
        const document = this.previewDocument();
        return document
            ? formatCandidateDocumentType(document.document_type)
            : 'Prévisualisation du document';
    });

    readonly safePreviewUrl = computed<SafeResourceUrl | null>(() => {
        const document = this.previewDocument();
        if (!document || this.documentKind(document) !== 'pdf') {
            return null;
        }

        const viewUrl = this.documentViewUrls()[document.id];
        if (!viewUrl) {
            return null;
        }

        try {
            const url = new URL(viewUrl, window.location.origin);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                return null;
            }
            return this.sanitizer.bypassSecurityTrustResourceUrl(url.toString());
        } catch {
            return null;
        }
    });

    readonly lastUpdatedLabel = computed(() =>
        formatCandidateDateTime(this.candidate()?.updated_at)
    );

    readonly missingDocumentTypes = computed(() => {
        const present = new Set(
            (this.candidate()?.documents ?? []).map((d) => d.document_type)
        );
        return this.pendingDocs()
            .map((d) => d.type)
            .filter((type) => !present.has(type));
    });

    readonly actions = computed<SubtopbarAction[]>(() => {
        if (!this.canEdit()) return [];

        if (!this.editing()) {
            return [
                {
                    label: 'Modifier',
                    icon: 'pi pi-pencil',
                    severity: 'info',
                    command: () => this.startEdit()
                }
            ];
        }

        return [
            {
                label: 'Annuler',
                icon: 'pi pi-times',
                severity: 'secondary',
                outlined: true,
                command: () => this.cancelEdit()
            },
            {
                label: 'Enregistrer',
                icon: 'pi pi-save',
                severity: 'info',
                loading: this.saving(),
                disabled: this.saving(),
                command: () => this.save()
            }
        ];
    });

    readonly genderOptions = [
        { label: 'Masculin', value: 'MALE' as CandidateGender },
        { label: 'Féminin', value: 'FEMALE' as CandidateGender },
        { label: 'Autre', value: 'OTHER' as CandidateGender }
    ];

    readonly maritalStatusOptions = [
        { label: 'Célibataire', value: 'SINGLE' as MaritalStatus },
        { label: 'Marié(e)', value: 'MARRIED' as MaritalStatus },
        { label: 'Divorcé(e)', value: 'DIVORCED' as MaritalStatus },
        { label: 'Veuf / Veuve', value: 'WIDOWED' as MaritalStatus },
        { label: 'Autre', value: 'OTHER' as MaritalStatus }
    ];

    readonly candidatureTypeOptions = [
        { label: 'Nouvelle inscription', value: 'NEW' as CandidatureType },
        { label: 'Inscription spéciale', value: 'SPECIAL' as CandidatureType }
    ];

    private optionalEmailValidator() {
        return (control: AbstractControl) => {
            const value = String(control.value ?? '').trim();
            if (!value) return null;
            return Validators.email(control);
        };
    }

    readonly form = this.fb.nonNullable.group({
        faculty_id: ['', Validators.required],
        program_id: ['', Validators.required],
        level_id: ['', Validators.required],
        first_name: ['', [Validators.required, Validators.maxLength(100)]],
        last_name: ['', [Validators.required, Validators.maxLength(100)]],
        middle_name: ['', Validators.maxLength(100)],
        gender: ['MALE' as CandidateGender, Validators.required],
        birth_date: ['', Validators.required],
        birth_place: ['', Validators.required],
        marital_status: ['SINGLE' as MaritalStatus, Validators.required],
        nationality: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        province: ['', Validators.required],
        territory: ['', Validators.required],
        sector: ['', Validators.required],
        commune: ['', Validators.required],
        tutor_full_name: ['', Validators.required],
        tutor_email: ['', this.optionalEmailValidator()],
        tutor_phone: ['', Validators.required],
        tutor_profession: [''],
        emergency_full_name: ['', Validators.required],
        emergency_email: ['', this.optionalEmailValidator()],
        emergency_phone: ['', Validators.required],
        emergency_relationship: [''],
        school_name: ['', Validators.required],
        option: ['', Validators.required],
        percentage: this.fb.control<number | null>(null, [
            Validators.required,
            Validators.min(0),
            Validators.max(100)
        ]),
        graduation_year: [1900, [Validators.required, Validators.min(1900)]],
        study_country: ['', Validators.required],
        study_city: ['', Validators.required],
        candidature_type: ['NEW' as CandidatureType, Validators.required]
    });

    ngOnInit(): void {
        this.form.controls.faculty_id.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((facultyId) => {
                if (!this.editing()) return;
                this.onFacultyChange(facultyId);
            });

        this.form.controls.program_id.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((programId) => {
                if (!this.editing()) return;
                this.onProgramChange(programId);
            });

        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.notFound.set(false);
        this.studentPlaceholder.set(false);

        if (this.permissionService.hasPermission(AcademicPermission.StudentReadOwn)) {
            this.loading.set(false);
            this.studentPlaceholder.set(true);
            this.candidate.set(null);
            return;
        }

        const userId = this.authService.getCurrentUser()?.id;

        if (!userId) {
            this.loading.set(false);
            this.notFound.set(true);
            return;
        }

        this.candidateService.getByUserId(userId, true).subscribe({
            next: (c) => {
                if (c.candidature.status === 'VALIDATED') {
                    this.studentPlaceholder.set(true);
                    this.candidate.set(c);
                    this.loading.set(false);
                    return;
                }

                this.candidate.set(c);
                this.patchFromCandidate(c);
                this.form.disable();
                this.editing.set(false);
                this.resolveLabels(c);
                this.loadAcademicOptions(c.faculty_id, c.program_id);
                this.resolveDocumentViewUrls(c);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.candidate.set(null);

                const httpError = error instanceof HttpErrorResponse ? error : null;
                const status = httpError?.status ?? 0;

                if (status === 404 || status === 400) {
                    this.notFound.set(true);
                    return;
                }

                this.notFound.set(true);
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: httpError?.error?.detail ?? 'Impossible de charger votre dossier.'
                });
            }
        });
    }

    startEdit(): void {
        if (!this.canEdit()) return;
        this.editing.set(true);
        this.form.enable();
        this.form.controls.email.disable();
    }

    cancelEdit(): void {
        const c = this.candidate();
        if (c) {
            this.patchFromCandidate(c);
            this.loadAcademicOptions(c.faculty_id, c.program_id);
        }
        this.editing.set(false);
        this.form.disable();
    }

    save(): void {
        if (!this.canEdit()) return;

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({
                severity: 'warn',
                summary: 'Formulaire incomplet',
                detail: 'Vérifiez les champs obligatoires.'
            });
            return;
        }

        this.saving.set(true);
        this.candidateService
            .updateMine(this.buildPayload())
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: (c) => {
                    this.candidate.set(c);
                    this.patchFromCandidate(c);
                    this.resolveLabels(c);
                    this.editing.set(false);
                    this.form.disable();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Dossier mis à jour',
                        detail: 'Vos informations ont été enregistrées.'
                    });
                },
                error: (err: HttpErrorResponse) => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Enregistrement impossible',
                        detail: err.error?.detail ?? 'Vérifiez les champs et réessayez.'
                    });
                }
            });
    }

    documentLabel(type: CandidateDocumentType): string {
        return formatCandidateDocumentType(type);
    }

    loadedDocumentLabel(document: CandidateDocument): string {
        return formatCandidateDocumentType(document.document_type);
    }

    documentViewUrl(document: CandidateDocument): string {
        return this.documentViewUrls()[document.id] ?? '';
    }

    documentKind(document: CandidateDocument): 'image' | 'pdf' | 'unknown' {
        return resolveCandidateDocumentKind(document);
    }

    openDocument(document: CandidateDocument): void {
        const viewUrl = this.documentViewUrl(document);

        if (!viewUrl || isSignedUrlExpiredOrExpiring(viewUrl)) {
            this.refreshDocumentViewUrl(document).subscribe((refreshedUrl) => {
                if (!refreshedUrl) return;
                this.previewDocument.set(document);
                this.previewVisible.set(true);
            });
            return;
        }

        this.previewDocument.set(document);
        this.previewVisible.set(true);
    }

    onDocumentImageError(document: CandidateDocument): void {
        this.refreshDocumentViewUrl(document).subscribe();
    }

    onPreviewVisibleChange(visible: boolean): void {
        this.previewVisible.set(visible);
        if (!visible) {
            this.previewDocument.set(null);
        }
    }

    replaceLoadedDocument(type: CandidateDocumentType): void {
        if (!this.canManageDocuments()) return;
        this.openDocumentPicker(type);
    }

    onDocumentSelected(event: Event, type: CandidateDocumentType): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        input.value = '';

        if (!file || !this.canManageDocuments()) return;

        const alreadyLoaded = (this.candidate()?.documents ?? []).some(
            (d) => d.document_type === type
        );

        if (alreadyLoaded) {
            this.uploadFiles([{ type, file }]);
            return;
        }

        this.pendingDocs.update((docs) =>
            docs.map((d) => (d.type === type ? { ...d, file } : d))
        );
    }

    removePendingDocument(type: CandidateDocumentType): void {
        this.pendingDocs.update((docs) =>
            docs.map((d) => (d.type === type ? { ...d, file: null } : d))
        );
    }

    uploadPendingDocuments(): void {
        const files = this.pendingDocs()
            .filter((d) => d.file)
            .map((d) => ({ type: d.type, file: d.file as File }));

        if (!files.length) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Aucun fichier',
                detail: 'Sélectionnez au moins un document à téléverser.'
            });
            return;
        }

        this.uploadFiles(files);
    }

    private uploadFiles(
        files: Array<{ type: CandidateDocumentType; file: File }>
    ): void {
        const candidate = this.candidate();
        if (!candidate || !this.canEdit()) return;

        this.uploading.set(true);
        this.candidateService
            .uploadDocuments(candidate.id, files)
            .pipe(finalize(() => this.uploading.set(false)))
            .subscribe({
                next: (results) => {
                    const failed = results.some((r) => r === null);
                    this.pendingDocs.update((docs) => docs.map((d) => ({ ...d, file: null })));
                    this.load();
                    this.messageService.add({
                        severity: failed ? 'warn' : 'success',
                        summary: failed ? 'Téléversement partiel' : 'Documents joints',
                        detail: failed
                            ? 'Certains documents n’ont pas pu être envoyés. Réessayez.'
                            : 'Les documents ont été téléversés avec succès.'
                    });
                },
                error: () => {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Erreur',
                        detail: 'Impossible de téléverser les documents.'
                    });
                }
            });
    }

    private resolveDocumentViewUrls(candidate: CandidateResponse): void {
        const documents = candidate.documents ?? [];
        this.documentViewUrlRefreshAttempts.clear();

        if (!documents.length) {
            this.documentViewUrls.set({});
            return;
        }

        forkJoin(
            documents.map((document) =>
                this.candidateService.resolveDocumentViewUrl(candidate.id, document).pipe(
                    map((url) => ({ id: document.id, url })),
                    catchError(() => of({ id: document.id, url: '' }))
                )
            )
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((entries) => {
                this.documentViewUrls.set(
                    Object.fromEntries(entries.map(({ id, url }) => [id, url]))
                );
            });
    }

    private refreshDocumentViewUrl(document: CandidateDocument): Observable<string> {
        const candidateId = this.candidate()?.id;
        if (!candidateId) return of('');

        const attempts = this.documentViewUrlRefreshAttempts.get(document.id) ?? 0;
        if (attempts >= this.maxDocumentViewUrlRefreshes) {
            return of(this.documentViewUrls()[document.id] ?? '');
        }

        this.documentViewUrlRefreshAttempts.set(document.id, attempts + 1);

        return this.candidateService.resolveDocumentViewUrl(candidateId, document).pipe(
            tap((url) => {
                this.documentViewUrls.update((current) => ({
                    ...current,
                    [document.id]: url
                }));
            }),
            catchError(() => of(''))
        );
    }



    isInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    private onFacultyChange(facultyId: string): void {
        this.programs.set([]);
        this.levels.set([]);
        this.form.patchValue({ program_id: '', level_id: '' }, { emitEvent: false });

        if (!facultyId) return;

        this.academicRefs.getProgramOptionsByFaculty(facultyId).subscribe({
            next: (options) => this.programs.set(options)
        });
    }

    private onProgramChange(programId: string): void {
        this.levels.set([]);
        this.form.patchValue({ level_id: '' }, { emitEvent: false });

        if (!programId) return;

        const facultyId = this.form.controls.faculty_id.value;
        this.academicRefs.getProgramReferencesByFaculty(facultyId).subscribe({
            next: (programs) => {
                const program = programs.find((p) => p.id === programId);
                const levelOptions =
                    program?.levels?.map((item) => ({
                        label: item.level.code
                            ? `${item.level.code} - ${item.level.name}`
                            : item.level.name,
                        value: item.level.id
                    })) ?? [];
                this.levels.set(levelOptions);
            }
        });
    }

    private loadAcademicOptions(facultyId: string, programId: string): void {
        this.academicRefs.getFacultyOptions().subscribe({
            next: (options) => this.faculties.set(options)
        });

        if (!facultyId) return;

        forkJoin({
            programs: this.academicRefs.getProgramOptionsByFaculty(facultyId),
            programRefs: this.academicRefs.getProgramReferencesByFaculty(facultyId)
        }).subscribe({
            next: ({ programs, programRefs }) => {
                this.programs.set(programs);
                const program = programRefs.find((p) => p.id === programId);
                this.levels.set(
                    program?.levels?.map((item) => ({
                        label: item.level.code
                            ? `${item.level.code} - ${item.level.name}`
                            : item.level.name,
                        value: item.level.id
                    })) ?? []
                );
            }
        });
    }

    private resolveLabels(c: CandidateResponse): void {
        this.academicRefs
            .resolveCandidateLabels(c)
            .pipe(catchError(() => of(null)))
            .subscribe((labels) => {
                if (labels) this.academicLabels.set(labels);
            });
    }

    private patchFromCandidate(c: CandidateResponse): void {
        this.form.patchValue(
            {
                faculty_id: c.faculty_id,
                program_id: c.program_id,
                level_id: c.level_id,
                first_name: c.first_name,
                last_name: c.last_name,
                middle_name: c.middle_name ?? '',
                gender: c.gender,
                birth_date: c.birth_date,
                birth_place: c.birth_place,
                marital_status: c.marital_status,
                nationality: c.nationality,
                email: c.email,
                phone: c.phone,
                province: c.origin?.province ?? '',
                territory: c.origin?.territory ?? '',
                sector: c.origin?.sector ?? '',
                commune: c.origin?.commune ?? '',
                tutor_full_name: c.tutor?.full_name ?? '',
                tutor_email: c.tutor?.email ?? '',
                tutor_phone: c.tutor?.phone ?? '',
                tutor_profession: c.tutor?.profession ?? '',
                emergency_full_name: c.emergency_contact?.full_name ?? '',
                emergency_email: c.emergency_contact?.email ?? '',
                emergency_phone: c.emergency_contact?.phone ?? '',
                emergency_relationship: c.emergency_contact?.relationship ?? '',
                school_name: c.academic_background?.school_name ?? '',
                option: c.academic_background?.option ?? '',
                percentage: c.academic_background?.percentage ?? null,
                graduation_year: c.academic_background?.graduation_year ?? 1900,
                study_country: c.academic_background?.study_country ?? '',
                study_city: c.academic_background?.study_city ?? '',
                candidature_type: c.candidature.type
            },
            { emitEvent: false }
        );
    }

    private formatDate(date: unknown): string {
        if (date instanceof Date) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }

        return String(date ?? '');
    }

    private buildPayload(): UpdateOwnCandidatureRequest {
        const raw = this.form.getRawValue();

        return {
            faculty_id: raw.faculty_id,
            program_id: raw.program_id,
            level_id: raw.level_id,
            first_name: raw.first_name.trim(),
            last_name: raw.last_name.trim(),
            middle_name: raw.middle_name.trim(),
            gender: raw.gender,
            birth_date: this.formatDate(raw.birth_date),
            birth_place: raw.birth_place.trim(),
            marital_status: raw.marital_status,
            nationality: raw.nationality.trim(),
            email: String(this.form.controls.email.getRawValue()).trim(),
            phone: raw.phone.trim(),
            origin: {
                province: raw.province.trim(),
                territory: raw.territory.trim(),
                sector: raw.sector.trim(),
                commune: raw.commune.trim()
            },
            tutor: {
                full_name: raw.tutor_full_name.trim(),
                email: (raw.tutor_email ?? '').trim(),
                phone: raw.tutor_phone.trim(),
                profession: (raw.tutor_profession ?? '').trim()
            },
            emergency_contact: {
                full_name: raw.emergency_full_name.trim(),
                email: (raw.emergency_email ?? '').trim(),
                phone: raw.emergency_phone.trim(),
                relationship: (raw.emergency_relationship ?? '').trim()
            },
            academic_background: {
                school_name: raw.school_name.trim(),
                option: raw.option.trim(),
                percentage: Number(raw.percentage),
                graduation_year: Number(raw.graduation_year),
                study_country: raw.study_country.trim(),
                study_city: raw.study_city.trim()
            },
            candidature: { type: raw.candidature_type }
        };
    }
}