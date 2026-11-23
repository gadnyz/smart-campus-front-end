import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { CandidateDocument, CandidateDocumentType, CandidateResponse } from '../../models/candidate.model';

import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '@/app/features/academic/permissions/permission.model';

import { AdmissionAcademicReferenceService } from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import { readableApiText } from '@/app/shared/http/readable-api-text';
import {
    CandidateAcademicChoices,
    CandidateDossierDocuments,
    CandidateDossierForm,
    CandidateDocumentPreview,
    CandidateDossierHero,
    CandidateDossierSections,
    DossierDocumentUrls,
    DossierSection,
    REQUIRED_DOCUMENT_TYPES,
    buildDossierSections,
    candidateFullName,
    candidateOwnPayload,
    createCandidateForm,
    enableCandidateForm,
    invalidCandidateFields,
    patchCandidateForm,
    photoDocument,
    requiredDocuments
} from '../../components/candidate-dossier';

type DocDraft = {
    type: CandidateDocumentType;
    label: string;
    file: File | null;
};

@Component({
    selector: 'app-candidate-portal',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        SkeletonModule,
        ToastModule,
        ContentSubtopbar,
        CandidateDossierHero,
        CandidateDossierSections,
        CandidateDossierDocuments,
        CandidateDocumentPreview,
        CandidateDossierForm
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

    private readonly permissionService = inject(PermissionService);

    readonly studentPlaceholder = signal(false);

    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly uploading = signal(false);
    readonly editing = signal(false);
    readonly notFound = signal(false);
    readonly candidate = signal<CandidateResponse | null>(null);

    readonly academicLabels = signal({
        facultyLabel: '',
        programLabel: '',
        levelLabel: '',
        academicYearLabel: ''
    });

    openDocumentPicker(type: CandidateDocumentType): void {
        document.getElementById(`portal_doc_${type}`)?.click();
    }

    readonly pendingDocs = signal<DocDraft[]>(REQUIRED_DOCUMENT_TYPES.map((document) => ({ ...document, file: null })));

    readonly status = computed(() => this.candidate()?.candidature.status ?? null);

    readonly canEdit = computed(() => {
        const status = this.status();
        return status === 'DRAFT' || status === 'PENDING';
    });
    readonly canManageDocuments = computed(() => this.canEdit());
    /** URL signées des pièces, par la route du candidat (`/candidates/me/...`). */
    readonly documentUrls = new DossierDocumentUrls((document) => this.candidateService.resolveOwnDocumentViewUrl(document), this.destroyRef);
    readonly photoLoadFailed = signal(false);
    readonly previewDocument = signal<CandidateDocument | null>(null);
    readonly previewVisible = signal(false);

    readonly missingPendingDocs = computed(() => {
        const present = new Set(
            (this.candidate()?.documents ?? []).map((d) => d.document_type)
        );
        return this.pendingDocs().filter((d) => !present.has(d.type));
    });

    readonly previewUrl = computed(() => {
        const document = this.previewDocument();
        return document ? this.documentUrls.url(document) : '';
    });

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

    readonly fullName = computed(() => {
        const c = this.candidate();
        return c ? candidateFullName(c) : '';
    });

    readonly photoUrl = computed(() => {
        const photo = photoDocument(this.candidate());
        return photo && !this.photoLoadFailed() ? this.documentUrls.url(photo) : '';
    });

    /** Pièces obligatoires : fournie ou manquante. */
    readonly requiredDocuments = computed(() => requiredDocuments(this.candidate()));

    readonly hasPendingFiles = computed(() => this.pendingDocs().some((draft) => draft.file));

    readonly sections = computed<DossierSection[]>(() => {
        const c = this.candidate();
        return c ? buildDossierSections(c, this.academicLabels()) : [];
    });

    readonly form = createCandidateForm(this.fb);
    readonly choices = new CandidateAcademicChoices(this.academicRefs, this.form, () => this.editing(), this.destroyRef);

    ngOnInit(): void {
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

        this.candidateService.getMine(true).subscribe({
            next: (c) => {
                if (c.candidature.status === 'VALIDATED') {
                    this.studentPlaceholder.set(true);
                    this.candidate.set(c);
                    this.loading.set(false);
                    return;
                }

                this.candidate.set(c);
                patchCandidateForm(this.form, c);
                this.form.disable();
                this.editing.set(false);
                this.resolveLabels(c);
                this.choices.load(c.faculty_id, c.program_id);
                this.photoLoadFailed.set(false);
                this.documentUrls.load(c.documents ?? []);
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
                    detail: readableApiText(httpError?.error?.detail ?? '') || 'Impossible de charger votre dossier.'
                });
            }
        });
    }

    startEdit(): void {
        if (!this.canEdit()) return;
        enableCandidateForm(this.form);
        this.editing.set(true);
    }

    cancelEdit(): void {
        const c = this.candidate();
        if (c) {
            patchCandidateForm(this.form, c);
            this.choices.load(c.faculty_id, c.program_id);
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
                detail: invalidCandidateFields(this.form)
            });
            return;
        }

        this.saving.set(true);
        this.candidateService
            .updateMine(candidateOwnPayload(this.form))
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: (c) => {
                    this.candidate.set(c);
                    patchCandidateForm(this.form, c);
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
                        detail: apiErrorMessage(err, 'Vérifiez les champs et réessayez.')
                    });
                }
            });
    }

    openDocument(document: CandidateDocument): void {
        this.documentUrls.fresh(document).subscribe((url) => {
            if (!url) return;
            this.previewDocument.set(document);
            this.previewVisible.set(true);
        });
    }

    onPhotoImageError(): void {
        const photo = photoDocument(this.candidate());
        if (!photo) return;
        const previous = this.documentUrls.url(photo);
        this.documentUrls.refresh(photo).subscribe((url) => this.photoLoadFailed.set(!url || url === previous));
    }

    onDocumentImageError(document: CandidateDocument): void {
        this.documentUrls.refresh(document).subscribe();
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

    private resolveLabels(c: CandidateResponse): void {
        this.academicRefs
            .resolveCandidateLabels(c)
            .pipe(catchError(() => of(null)))
            .subscribe((labels) => {
                if (labels) this.academicLabels.set(labels);
            });
    }

}