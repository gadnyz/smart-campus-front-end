import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { FormBuilder, FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    DestroyRef,
    OnInit,
    computed,
    inject,
    signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';

import {
    EMPTY,
    catchError,
    distinctUntilChanged,
    filter,
    forkJoin,
    map,
    of,
    switchMap,
    tap
} from 'rxjs';

import { FacultyScopeService } from '@/app/core/auth/services/faculty-scope.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import {
    DetailNavigationContext,
    DetailNavigationService
} from '@/app/shared/navigation/detail-navigation.service';
import {
    ContentSubtopbar,
    SubtopbarAction, SubtopbarNavigation
} from '@/app/shared/ui/content-subtopbar/content-subtopbar';

import {
    CandidateDocument,
    CandidateListItem,
    CandidateResponse,
    CandidatureStatus,
    PagedResponse
} from '../../models/candidate.model';
import { AdmissionResource } from '../../permissions/permission.model';
import {
    AdmissionAcademicReferenceService,
    CandidateAcademicLabels
} from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import {
    CandidateAcademicChoices,
    CandidateDocumentPreview,
    CandidateDossierDocuments,
    CandidateDossierForm,
    CandidateDossierHero,
    CandidateDossierSections,
    DossierDocumentUrls,
    DossierSection,
    buildDossierSections,
    candidateFullName,
    candidateUpdatePayload,
    createCandidateForm,
    enableCandidateForm,
    invalidCandidateFields,
    patchCandidateForm,
    photoDocument,
    requiredDocuments
} from '../../components/candidate-dossier';
import { candidateStatusSeverity, formatCandidatureStatus } from '../../utils/candidate-format';

type CandidateName = Pick<
    CandidateResponse,
    'first_name' | 'middle_name' | 'last_name'
>;

@Component({
    selector: 'app-candidate-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        ConfirmDialogModule,
        DialogModule,
        ProgressBarModule,
        SkeletonModule,
        TextareaModule,
        ToastModule,
        ContentSubtopbar,
        CandidateDossierHero,
        CandidateDossierSections,
        CandidateDossierDocuments,
        CandidateDocumentPreview,
        CandidateDossierForm
    ],
    templateUrl: './candidate-detail.html',
    styleUrl: './candidate-detail.scss',
    providers: [
        ConfirmationService,
        MessageService
    ]
})
export class CandidateDetail implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    private readonly candidateService =
        inject(CandidateService);

    private readonly academicReferenceService =
        inject(AdmissionAcademicReferenceService);

    private readonly detailNavigation =
        inject(DetailNavigationService);

    private readonly permissionService =
        inject(PermissionService);

    private readonly facultyScope = inject(FacultyScopeService);

    private readonly confirmationService =
        inject(ConfirmationService);

    private readonly messageService =
        inject(MessageService);

    private readonly fb = inject(FormBuilder);

    private readonly navigationScope =
        'admission.candidates';

    readonly loading = signal(false);
    readonly refreshing = signal(false);
    readonly navigationLoading = signal(false);

    readonly processingAction =
        signal<'validate' | 'reject' | null>(null);

    readonly requestedCandidateId = signal('');
    readonly candidate = signal<CandidateResponse | null>(null);

    readonly academicLabels =
        signal<CandidateAcademicLabels | null>(null);

    readonly photoLoadFailed = signal(false);
    readonly previewDocument = signal<CandidateDocument | null>(null);
    readonly previewVisible = signal(false);

    /** Modification du dossier par le personnel (`PUT /candidates/{id}`). */
    readonly editing = signal(false);
    readonly saving = signal(false);
    readonly form = createCandidateForm(this.fb);
    readonly choices = new CandidateAcademicChoices(this.academicReferenceService, this.form, () => this.editing(), this.destroyRef);

    readonly rejectDialogVisible = signal(false);
    readonly rejectReason = signal('');

    /** URL signées des pièces, par la route du personnel. */
    readonly documentUrls = new DossierDocumentUrls(
        (document) => this.candidateService.resolveDocumentViewUrl(this.requestedCandidateId() || this.candidate()?.id || '', document),
        this.destroyRef
    );

    readonly busy = computed(
        () =>
            this.refreshing() ||
            this.navigationLoading() ||
            this.saving() ||
            this.processingAction() !== null
    );

    /** Valider ou rejeter : modifier les candidatures de sa faculté ou de toutes. */
    readonly canManageCandidate = this.permissionService.canWrite(`${AdmissionResource.Candidate}:update`);

    readonly navigationState = computed(() => {
        const id = this.requestedCandidateId();

        return id
            ? this.detailNavigation.getState(
                this.navigationScope,
                id
            )
            : null;
    });

    readonly navigationLabel = computed(
        () => this.navigationState()?.label ?? ''
    );

    readonly canGoPrevious = computed(
        () => this.navigationState()?.hasPrevious ?? false
    );

    readonly canGoNext = computed(
        () => this.navigationState()?.hasNext ?? false
    );

    readonly pageTitle = computed(() => {
        const label = this.navigationLabel();

        return label
            ? `Détail candidature (${label})`
            : 'Détail candidature';
    });

    readonly photoUrl = computed(() => {
        const photo = photoDocument(this.candidate());
        return photo && !this.photoLoadFailed() ? this.documentUrls.url(photo) : '';
    });

    readonly documents = computed(() => requiredDocuments(this.candidate()));

    readonly previewUrl = computed(() => {
        const document = this.previewDocument();
        return document ? this.documentUrls.url(document) : '';
    });

    readonly sections = computed<DossierSection[]>(() => {
        const candidate = this.candidate();
        return candidate ? buildDossierSections(candidate, this.academicLabels()) : [];
    });

    readonly canValidate = computed(() => {
        const status =
            this.candidate()?.candidature.status;

        return (
            status === 'DRAFT' ||
            status === 'PENDING'
        );
    });

    readonly canReject = computed(() => {
        const status =
            this.candidate()?.candidature.status;

        return (
            status === 'DRAFT' ||
            status === 'PENDING'
        );
    });

    /** Modifiable tant que le dossier n'est ni validé, ni rejeté, ni annulé. */
    readonly canEdit = computed(() => {
        const status = this.candidate()?.candidature.status;
        return this.canManageCandidate && (status === 'DRAFT' || status === 'PENDING');
    });

    readonly currentStatus = computed(
        () => this.candidate()?.candidature.status ?? null
    );

    readonly currentStatusLabel = computed(() => {
        const status = this.currentStatus();
        return status ? formatCandidatureStatus(status) : '';
    });

    readonly currentStatusSeverity = computed(() => {
        const status = this.currentStatus();
        return status
            ? candidateStatusSeverity(status)
            : 'secondary';
    });

    /** Précédent et Suivant dans la sous-barre, avec la position dans la liste. */
    readonly navigation = computed<SubtopbarNavigation | null>(() => {
        const state = this.navigationState();
        if (!state) {
            return null;
        }
        return {
            position: state.label,
            hasPrevious: !(!this.canGoPrevious() || this.busy()),
            hasNext: !(!this.canGoNext() || this.busy()),
            previous: () => this.goToPreviousCandidate(),
            next: () => this.goToNextCandidate()
        };
    });

    readonly actions = computed<SubtopbarAction[]>(() => (this.editing() ? this.editActions() : this.readActions()));

    private editActions(): SubtopbarAction[] {
        return [
            {
                label: 'Annuler',
                icon: 'pi pi-times',
                severity: 'secondary',
                outlined: true,
                disabled: this.saving(),
                command: () => this.cancelEdit()
            },
            {
                label: 'Enregistrer',
                primary: true,
                icon: 'pi pi-save',
                loading: this.saving(),
                disabled: this.saving(),
                command: () => this.saveEdit()
            }
        ];
    }

    private readActions(): SubtopbarAction[] {
        return [
        {
            label: 'Liste',
            icon: 'pi pi-list',
            severity: 'secondary',
            outlined: false,
            command: () => this.goToList()
        },
        {
            label: 'Valider',
            primary: true,
            icon: 'pi pi-check',
            severity: 'success',
            outlined: false,
            loading:
                this.processingAction() === 'validate',
            disabled:
                !this.canManageCandidate ||
                !this.canValidate() ||
                this.busy(),
            command: () => this.confirmValidate()
        },
        {
            label: 'Rejeter',
            icon: 'pi pi-times',
            severity: 'danger',
            outlined: false,
            loading:
                this.processingAction() === 'reject',
            disabled:
                !this.canManageCandidate ||
                !this.canReject() ||
                this.busy(),
            command: () => this.confirmReject()
        },
        ...(this.canManageCandidate
            ? [
                {
                    label: 'Modifier',
                    primary: true,
                    icon: 'pi pi-pencil',
                    severity: 'secondary' as const,
                    outlined: true,
                    disabled: !this.canEdit() || this.busy(),
                    command: () => this.startEdit()
                }
            ]
            : [])
        ];
    }

    ngOnInit(): void {
        this.route.paramMap
            .pipe(
                map((params) => params.get('id')),
                filter((id): id is string => !!id),
                distinctUntilChanged(),
                tap((id) => this.prepareCandidateLoad(id)),
                switchMap((id) =>
                    this.candidateService
                        .getById(id, true)
                        .pipe(
                            switchMap((candidate) =>
                                forkJoin({
                                    candidate: of(candidate),
                                    labels:
                                        this.academicReferenceService
                                            .resolveCandidateLabels(
                                                candidate
                                            )
                                            .pipe(
                                                catchError(() =>
                                                    of(null)
                                                )
                                            )
                                })
                            ),
                            catchError((error: unknown) => {
                                this.loading.set(false);
                                this.refreshing.set(false);
                                this.candidate.set(null);

                                this.showError(
                                    this.errorDetail(
                                        error,
                                        'Impossible de charger la candidature.'
                                    )
                                );

                                return EMPTY;
                            })
                        )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(({ candidate, labels }) => {
                this.candidate.set(candidate);
                this.academicLabels.set(labels);
                this.loading.set(false);
                this.refreshing.set(false);
                this.documentUrls.load(candidate.documents ?? []);
                this.prefetchAdjacentCandidates();
            });
    }

    confirmValidate(): void {
        const candidate = this.candidate();

        if (
            !candidate ||
            !this.canManageCandidate ||
            !this.canValidate()
        ) {
            return;
        }

        const isDraft = candidate.candidature.status === 'DRAFT';
        const draftWarning = isDraft
            ? ` Attention : ce dossier est encore en brouillon (documents éventuellement incomplets).`
            : '';

        this.confirmationService.confirm({
            header: 'Confirmation',
            message:
                `Voulez-vous vraiment valider la candidature de ` +
                `${this.fullName(candidate)} ?` +
                draftWarning,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Valider',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-success',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () =>
                this.validateCandidate(candidate.id)
        });
    }

    confirmReject(): void {
        const candidate = this.candidate();

        if (
            !candidate ||
            !this.canManageCandidate ||
            !this.canReject()
        ) {
            return;
        }

        this.rejectReason.set('');
        this.rejectDialogVisible.set(true);
    }

    onRejectDialogVisibleChange(visible: boolean): void {
        this.rejectDialogVisible.set(visible);

        if (!visible) {
            this.rejectReason.set('');
        }
    }

    submitReject(): void {
        const candidate = this.candidate();
        const reason = this.rejectReason().trim();

        if (!candidate || !reason) {
            this.showError('Le motif de rejet est obligatoire.');
            return;
        }

        if (reason.length > 500) {
            this.showError('Le motif ne peut pas dépasser 500 caractères.');
            return;
        }

        this.rejectDialogVisible.set(false);
        this.rejectCandidate(candidate.id, reason);
    }

    startEdit(): void {
        const candidate = this.candidate();
        if (!candidate || !this.canEdit()) return;
        patchCandidateForm(this.form, candidate);
        this.choices.load(candidate.faculty_id, candidate.program_id);
        enableCandidateForm(this.form);
        this.editing.set(true);
    }

    cancelEdit(): void {
        this.editing.set(false);
        this.form.disable({ emitEvent: false });
    }

    saveEdit(): void {
        const candidate = this.candidate();
        if (!candidate || !this.canEdit() || this.saving()) return;

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'warn', summary: 'Formulaire incomplet', detail: invalidCandidateFields(this.form), life: 5000 });
            return;
        }

        this.saving.set(true);
        this.candidateService
            .update(candidate.id, candidateUpdatePayload(this.form))
            .pipe(
                switchMap((updated) =>
                    forkJoin({
                        updated: of(updated),
                        labels: this.academicReferenceService.resolveCandidateLabels(updated).pipe(catchError(() => of(null)))
                    })
                )
            )
            .subscribe({
                next: ({ updated, labels }) => {
                    this.saving.set(false);
                    this.candidate.set(updated);
                    this.academicLabels.set(labels);
                    this.cancelEdit();
                    this.renameInNavigation(updated);
                    this.showSuccess('Dossier du candidat mis à jour.');
                },
                error: (error: unknown) => {
                    this.saving.set(false);
                    this.showError(this.errorDetail(error, 'Impossible d’enregistrer le dossier.'));
                }
            });
    }

    private renameInNavigation(candidate: CandidateResponse): void {
        const state = this.navigationState();
        if (!state) return;
        this.detailNavigation.setContext({
            ...state.context,
            items: state.context.items.map((item) => (item.id === candidate.id ? { ...item, label: this.fullName(candidate) } : item))
        });
    }

    fullName(candidate: CandidateName): string {
        return candidateFullName(candidate);
    }

    openDocument(document: CandidateDocument): void {
        this.documentUrls.fresh(document).subscribe((url) => {
            if (!url) {
                return;
            }
            this.previewDocument.set(document);
            this.previewVisible.set(true);
        });
    }

    onPhotoImageError(): void {
        const photo = photoDocument(this.candidate());
        if (!photo) {
            this.photoLoadFailed.set(true);
            return;
        }
        const previous = this.documentUrls.url(photo);
        // Une URL renouvelée identique ne chargera pas mieux : la page affiche alors les initiales.
        this.documentUrls.refresh(photo).subscribe((url) => this.photoLoadFailed.set(!url || url === previous));
    }

    onDocumentImageError(document: CandidateDocument): void {
        this.documentUrls.refresh(document).subscribe();
    }

    goToList(): void {
        const route =
            this.navigationState()?.context.listRoute ??
            ['/admission/candidates'];

        void this.router.navigate(route);
    }

    goToPreviousCandidate(): void {
        const state = this.navigationState();

        if (!state || this.busy()) return;

        const previous =
            state.context.items[state.localIndex - 1];

        if (previous) {
            this.navigateToCandidate(previous.id);
            return;
        }

        this.loadNavigationPage(
            state.context,
            state.context.page - 1,
            'last'
        );
    }

    goToNextCandidate(): void {
        const state = this.navigationState();

        if (!state || this.busy()) return;

        const next =
            state.context.items[state.localIndex + 1];

        if (next) {
            this.navigateToCandidate(next.id);
            return;
        }

        this.loadNavigationPage(
            state.context,
            state.context.page + 1,
            'first'
        );
    }

    private prepareCandidateLoad(id: string): void {
        this.cancelEdit();
        this.requestedCandidateId.set(id);
        this.photoLoadFailed.set(false);
        this.academicLabels.set(null);
        this.documentUrls.clear();

        const cached =
            this.candidateService.peekCandidate(id);

        if (cached) {
            this.candidate.set(cached);
            this.loading.set(false);
            this.refreshing.set(true);
            return;
        }

        const hasCurrentCandidate =
            this.candidate() !== null;

        this.loading.set(!hasCurrentCandidate);
        this.refreshing.set(hasCurrentCandidate);
    }

    private validateCandidate(id: string): void {
        this.applyLocalStatus(id, 'VALIDATED');
        this.processingAction.set('validate');

        this.candidateService.validate(id).subscribe({
            next: (updatedCandidate) =>
                this.applyStatusChange(
                    updatedCandidate,
                    'Candidature validée avec succès.'
                ),
            error: (error: unknown) => {
                this.restoreCandidate(id);
                this.processingAction.set(null);

                this.showError(
                    this.errorDetail(
                        error,
                        'Impossible de valider la candidature.'
                    )
                );
            }
        });
    }

    private rejectCandidate(id: string, reason: string): void {
        this.applyLocalStatus(id, 'REJECTED');
        this.processingAction.set('reject');

        this.candidateService.reject(id, reason).subscribe({
            next: (updatedCandidate) =>
                this.applyStatusChange(
                    updatedCandidate,
                    'Candidature rejetée avec succès.'
                ),
            error: (error: unknown) => {
                this.restoreCandidate(id);
                this.processingAction.set(null);

                this.showError(
                    this.errorDetail(
                        error,
                        'Impossible de rejeter la candidature.'
                    )
                );
            }
        });
    }

    private applyLocalStatus(
        id: string,
        status: CandidatureStatus
    ): void {
        const current = this.candidate();

        if (!current || current.id !== id) {
            return;
        }

        this.candidate.set({
            ...current,
            candidature: {
                ...current.candidature,
                status
            }
        });
    }

    private restoreCandidate(id: string): void {
        this.candidateService
            .getById(id, true)
            .subscribe({
                next: (candidate) =>
                    this.candidate.set(candidate),
                error: () => undefined
            });
    }

    private applyStatusChange(
        updatedCandidate: CandidateResponse,
        message: string
    ): void {
        this.candidate.set({
            ...updatedCandidate,
            candidature: {
                ...updatedCandidate.candidature
            }
        });
        this.processingAction.set(null);
        this.showSuccess(message);

        const state = this.navigationState();
        const activeFilter =
            state?.context.filters?.['status'];

        // Si un filtre de statut est actif et ne correspond plus, avancer dans la file filtrée.
        if (
            state &&
            activeFilter &&
            activeFilter !==
            updatedCandidate.candidature.status
        ) {
            this.reloadAfterFilteredStatusChange(
                state.context,
                state.localIndex
            );
            return;
        }

        // Sinon rester sur le dossier pour refléter clairement le nouveau statut.
        if (state) {
            this.detailNavigation.setContext({
                ...state.context,
                items: state.context.items.map((item) =>
                    item.id === updatedCandidate.id
                        ? {
                            ...item,
                            label: this.fullName(updatedCandidate)
                        }
                        : item
                )
            });
        }
    }

    private reloadAfterFilteredStatusChange(
        context: DetailNavigationContext,
        localIndex: number
    ): void {
        this.refreshing.set(true);

        this.candidateService
            .getAll({
                page: context.page,
                size: context.size,
                status: this.contextStatus(context),
                facultyId: this.contextFacultyId(context)
            })
            .subscribe({
                next: (response) => {
                    this.refreshing.set(false);
                    this.setNavigationContext(
                        context,
                        response
                    );

                    const replacement =
                        response.content[
                        Math.min(
                            localIndex,
                            response.content.length - 1
                        )
                        ];

                    if (replacement) {
                        this.navigateToCandidate(
                            replacement.id
                        );
                        return;
                    }

                    if (context.page > 0) {
                        this.loadNavigationPage(
                            context,
                            context.page - 1,
                            'last'
                        );
                        return;
                    }

                    this.goToList();
                },
                error: (error: unknown) => {
                    this.refreshing.set(false);
                    this.showError(
                        this.errorDetail(
                            error,
                            'Impossible de charger le candidat suivant.'
                        )
                    );
                }
            });
    }

    private goToNextCandidateOrList(): void {
        if (this.canGoNext()) {
            this.goToNextCandidate();
            return;
        }

        this.goToList();
    }

    private loadNavigationPage(
        context: DetailNavigationContext,
        page: number,
        target: 'first' | 'last'
    ): void {
        if (
            page < 0 ||
            page >= context.totalPages
        ) {
            this.goToList();
            return;
        }

        this.navigationLoading.set(true);

        this.candidateService
            .getAll({
                page,
                size: context.size,
                status: this.contextStatus(context),
                facultyId: this.contextFacultyId(context)
            })
            .subscribe({
                next: (response) => {
                    this.navigationLoading.set(false);
                    this.setNavigationContext(
                        context,
                        response
                    );

                    const candidate =
                        target === 'first'
                            ? response.content[0]
                            : response.content[
                            response.content.length - 1
                            ];

                    if (!candidate) {
                        this.goToList();
                        return;
                    }

                    this.navigateToCandidate(candidate.id);
                },
                error: (error: unknown) => {
                    this.navigationLoading.set(false);

                    this.showError(
                        this.errorDetail(
                            error,
                            'Impossible de charger la page suivante.'
                        )
                    );
                }
            });
    }

    private setNavigationContext(
        context: DetailNavigationContext,
        response: PagedResponse<CandidateListItem>
    ): void {
        this.detailNavigation.setContext({
            ...context,
            page: response.page,
            size: response.size,
            totalElements: response.total_elements,
            totalPages: response.total_pages,
            items: response.content.map((candidate) => ({
                id: candidate.id,
                label: this.fullName(candidate)
            }))
        });
    }

    private contextStatus(
        context: DetailNavigationContext
    ): CandidatureStatus | undefined {
        const status =
            context.filters?.['status'];

        return typeof status === 'string' &&
            status.length > 0
            ? (status as CandidatureStatus)
            : undefined;
    }

    private contextFacultyId(
        context: DetailNavigationContext
    ): string | undefined {
        const scoped = this.facultyScope.scopedId();
        if (scoped) {
            return scoped;
        }

        const facultyId =
            context.filters?.['facultyId'];

        return typeof facultyId === 'string' &&
            facultyId.length > 0
            ? facultyId
            : undefined;
    }

    private prefetchAdjacentCandidates(): void {
        const state = this.navigationState();

        if (!state) return;

        this.candidateService.prefetchCandidate(
            state.context.items[
                state.localIndex - 1
            ]?.id
        );

        this.candidateService.prefetchCandidate(
            state.context.items[
                state.localIndex + 1
            ]?.id
        );
    }

    private navigateToCandidate(id: string): void {
        void this.router.navigate([
            '/admission/candidates',
            id
        ]);
    }

    private errorDetail(
        error: unknown,
        fallback: string
    ): string {
        if (error instanceof HttpErrorResponse) {
            return apiErrorMessage(error, fallback);
        }

        if (error instanceof Error) {
            return error.message;
        }

        return fallback;
    }

    private showSuccess(detail: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail,
            life: 3000
        });
    }

    private showError(detail: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail,
            life: 3000
        });
    }
}