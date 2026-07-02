import { CommonModule } from '@angular/common';
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
import {
    DomSanitizer,
    SafeResourceUrl
} from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { ImageModule } from 'primeng/image';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
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

import { PermissionService } from '@/app/core/permissions/permission.service';
import {
    DetailNavigationContext,
    DetailNavigationService
} from '@/app/shared/navigation/detail-navigation.service';
import {
    ContentSubtopbar,
    SubtopbarAction
} from '@/app/shared/ui/content-subtopbar/content-subtopbar';

import {
    CandidateDocument,
    CandidateListItem,
    CandidateResponse,
    CandidatureStatus,
    PagedResponse
} from '../../models/candidate.model';
import { AdmissionPermission } from '../../permissions/permission.model';
import {
    AdmissionAcademicReferenceService,
    CandidateAcademicLabels
} from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import {
    CandidateStatusSeverity,
    candidateStatusSeverity,
    formatCandidateDate,
    formatCandidateDateTime,
    formatCandidateDocumentType,
    formatCandidateGender,
    formatCandidatureStatus,
    formatCandidatureType,
    formatMaritalStatus
} from '../../utils/candidate-format';

type CandidateDetailRow = {
    label: string;
    value: string | number | null | undefined;
};

type CandidateDetailSection = {
    title: string;
    description: string;
    icon: string;
    rows: CandidateDetailRow[];
};

type CandidateName = Pick<
    CandidateResponse,
    'first_name' | 'middle_name' | 'last_name'
>;

@Component({
    selector: 'app-candidate-detail',
    standalone: true,
    imports: [
        CommonModule,
        AvatarModule,
        ButtonModule,
        CardModule,
        ConfirmDialogModule,
        DialogModule,
        DividerModule,
        ImageModule,
        ProgressBarModule,
        SkeletonModule,
        TagModule,
        ToastModule,
        ContentSubtopbar
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
    private readonly sanitizer = inject(DomSanitizer);

    private readonly candidateService =
        inject(CandidateService);

    private readonly academicReferenceService =
        inject(AdmissionAcademicReferenceService);

    private readonly detailNavigation =
        inject(DetailNavigationService);

    private readonly permissionService =
        inject(PermissionService);

    private readonly confirmationService =
        inject(ConfirmationService);

    private readonly messageService =
        inject(MessageService);

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
    readonly previewDocument =
        signal<CandidateDocument | null>(null);

    readonly previewVisible = signal(false);

    readonly busy = computed(
        () =>
            this.refreshing() ||
            this.navigationLoading() ||
            this.processingAction() !== null
    );

    readonly canManageCandidate =
        this.permissionService.hasPermission(
            AdmissionPermission.AdmissionCandidateUpdateAll
        );

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

    readonly candidateInitial = computed(() => {
        const current = this.candidate();

        return (
            current?.first_name?.trim().charAt(0) ||
            current?.last_name?.trim().charAt(0) ||
            '?'
        ).toUpperCase();
    });

    readonly photoDocument = computed(
        () =>
            this.candidate()?.documents?.find(
                (document) =>
                    document.document_type === 'PHOTO'
            ) ?? null
    );

    readonly photoUrl = computed(() =>
        this.photoLoadFailed()
            ? ''
            : this.photoDocument()?.file_url ?? ''
    );

    readonly supportingDocuments = computed(
        () =>
            this.candidate()?.documents?.filter(
                (document) =>
                    document.document_type !== 'PHOTO'
            ) ?? []
    );

    readonly previewTitle = computed(() => {
        const document = this.previewDocument();

        return document
            ? formatCandidateDocumentType(
                document.document_type
            )
            : 'Prévisualisation du document';
    });

    readonly safePreviewUrl =
        computed<SafeResourceUrl | null>(() => {
            const document = this.previewDocument();

            if (
                !document ||
                this.documentKind(document) !== 'pdf'
            ) {
                return null;
            }

            try {
                const url = new URL(
                    document.file_url,
                    window.location.origin
                );

                if (
                    url.protocol !== 'http:' &&
                    url.protocol !== 'https:'
                ) {
                    return null;
                }

                return this.sanitizer
                    .bypassSecurityTrustResourceUrl(
                        url.toString()
                    );
            } catch {
                return null;
            }
        });

    readonly detailSections =
        computed<CandidateDetailSection[]>(() => {
            const candidate = this.candidate();
            const labels = this.academicLabels();

            if (!candidate) return [];

            return [
                {
                    title: 'Informations personnelles',
                    description:
                        'Identité, contact et origine du candidat.',
                    icon: 'pi pi-user',
                    rows: [
                        {
                            label: 'Prénom',
                            value: candidate.first_name
                        },
                        {
                            label: 'Post-nom',
                            value: candidate.middle_name
                        },
                        {
                            label: 'Nom',
                            value: candidate.last_name
                        },
                        {
                            label: 'Genre',
                            value: formatCandidateGender(
                                candidate.gender
                            )
                        },
                        {
                            label: 'Date de naissance',
                            value: formatCandidateDate(
                                candidate.birth_date
                            )
                        },
                        {
                            label: 'Lieu de naissance',
                            value: candidate.birth_place
                        },
                        {
                            label: 'État civil',
                            value: formatMaritalStatus(
                                candidate.marital_status
                            )
                        },
                        {
                            label: 'Nationalité',
                            value: candidate.nationality
                        },
                        {
                            label: 'Email',
                            value: candidate.email
                        },
                        {
                            label: 'Téléphone',
                            value: candidate.phone
                        },
                        {
                            label: 'Province',
                            value: candidate.origin.province
                        },
                        {
                            label: 'Territoire',
                            value: candidate.origin.territory
                        },
                        {
                            label: 'Secteur',
                            value: candidate.origin.sector
                        },
                        {
                            label: 'Commune',
                            value: candidate.origin.commune
                        }
                    ]
                },
                {
                    title: 'Choix académiques',
                    description:
                        'Cursus demandé et parcours scolaire.',
                    icon: 'pi pi-graduation-cap',
                    rows: [
                        {
                            label: 'Type de candidature',
                            value: formatCandidatureType(
                                candidate.candidature.type
                            )
                        },
                        {
                            label: 'Soumise le',
                            value: formatCandidateDateTime(
                                candidate.candidature
                                    .submitted_at
                            )
                        },
                        {
                            label: 'Année académique',
                            value:
                                labels?.academicYearLabel ??
                                candidate.academic_year_id
                        },
                        {
                            label: 'Faculté',
                            value:
                                labels?.facultyLabel ??
                                candidate.faculty_id
                        },
                        {
                            label: 'Programme',
                            value:
                                labels?.programLabel ??
                                candidate.program_id
                        },
                        {
                            label: 'Niveau',
                            value:
                                labels?.levelLabel ??
                                candidate.level_id
                        },
                        {
                            label: 'École',
                            value:
                                candidate.academic_background
                                    .school_name
                        },
                        {
                            label: 'Option',
                            value:
                                candidate.academic_background
                                    .option
                        },
                        {
                            label: 'Pourcentage',
                            value:
                                `${candidate.academic_background.percentage}%`
                        },
                        {
                            label: 'Année de fin',
                            value:
                                candidate.academic_background
                                    .graduation_year
                        },
                        {
                            label: 'Pays des études',
                            value:
                                candidate.academic_background
                                    .study_country
                        },
                        {
                            label: 'Ville des études',
                            value:
                                candidate.academic_background
                                    .study_city
                        }
                    ]
                },
                {
                    title: 'Famille et urgence',
                    description:
                        'Tuteur et personne à contacter.',
                    icon: 'pi pi-users',
                    rows: [
                        {
                            label: 'Nom du tuteur',
                            value: candidate.tutor.full_name
                        },
                        {
                            label: 'Email du tuteur',
                            value: candidate.tutor.email
                        },
                        {
                            label: 'Téléphone du tuteur',
                            value: candidate.tutor.phone
                        },
                        {
                            label: 'Profession du tuteur',
                            value: candidate.tutor.profession
                        },
                        {
                            label: 'Contact d’urgence',
                            value:
                                candidate.emergency_contact
                                    .full_name
                        },
                        {
                            label: 'Email d’urgence',
                            value:
                                candidate.emergency_contact.email
                        },
                        {
                            label: 'Téléphone d’urgence',
                            value:
                                candidate.emergency_contact.phone
                        },
                        {
                            label: 'Lien avec le candidat',
                            value:
                                candidate.emergency_contact
                                    .relationship
                        }
                    ]
                }
            ];
        });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Liste',
            icon: 'pi pi-list',
            severity: 'secondary',
            outlined: false,
            command: () => this.goToList()
        },
        {
            label: 'Précédent',
            icon: 'pi pi-chevron-left',
            severity: 'secondary',
            disabled:
                !this.canGoPrevious() || this.busy(),
            command: () => this.goToPreviousCandidate()
        },
        {
            label: 'Suivant',
            icon: 'pi pi-chevron-right',
            severity: 'secondary',
            disabled:
                !this.canGoNext() || this.busy(),
            command: () => this.goToNextCandidate()
        },
        {
            label: 'Valider',
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
        }
    ]);

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

        this.confirmationService.confirm({
            header: 'Confirmation',
            message:
                `Voulez-vous vraiment valider la candidature de ` +
                `${this.fullName(candidate)} ?`,
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

        this.confirmationService.confirm({
            header: 'Confirmation',
            message:
                `Voulez-vous vraiment rejeter la candidature de ` +
                `${this.fullName(candidate)} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Rejeter',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () =>
                this.rejectCandidate(candidate.id)
        });
    }

    canValidate(): boolean {
        const status =
            this.candidate()?.candidature.status;

        return (
            status === 'DRAFT' ||
            status === 'PENDING'
        );
    }

    canReject(): boolean {
        const status =
            this.candidate()?.candidature.status;

        return (
            status === 'DRAFT' ||
            status === 'PENDING'
        );
    }

    fullName(candidate: CandidateName): string {
        return [
            candidate.first_name,
            candidate.middle_name,
            candidate.last_name
        ]
            .filter(Boolean)
            .join(' ');
    }

    statusLabel(status: CandidatureStatus): string {
        return formatCandidatureStatus(status);
    }

    statusSeverity(
        status: CandidatureStatus
    ): CandidateStatusSeverity {
        return candidateStatusSeverity(status);
    }

    documentLabel(
        document: CandidateDocument
    ): string {
        return formatCandidateDocumentType(
            document.document_type
        );
    }

    documentKind(
        document: CandidateDocument
    ): 'image' | 'pdf' | 'unknown' {
        const source = [
            document.content_type,
            document.file_name,
            document.file_url
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (
            source.includes('image/') ||
            /\.(png|jpe?g|webp|gif)(?:[?#]|$)/.test(
                source
            )
        ) {
            return 'image';
        }

        if (
            source.includes('application/pdf') ||
            /\.pdf(?:[?#]|$)/.test(source)
        ) {
            return 'pdf';
        }

        return 'unknown';
    }

    openDocument(document: CandidateDocument): void {
        this.previewDocument.set(document);
        this.previewVisible.set(true);
    }

    onPreviewVisibleChange(visible: boolean): void {
        this.previewVisible.set(visible);

        if (!visible) {
            this.previewDocument.set(null);
        }
    }

    displayValue(
        value: string | number | null | undefined
    ): string {
        return value === null ||
            value === undefined ||
            value === ''
            ? '-'
            : String(value);
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
        this.requestedCandidateId.set(id);
        this.photoLoadFailed.set(false);
        this.academicLabels.set(null);

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
        this.processingAction.set('validate');

        this.candidateService.validate(id).subscribe({
            next: (updatedCandidate) =>
                this.applyStatusChange(
                    updatedCandidate,
                    'Candidature validée avec succès.'
                ),
            error: (error: unknown) => {
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

    private rejectCandidate(id: string): void {
        this.processingAction.set('reject');

        this.candidateService.reject(id).subscribe({
            next: (updatedCandidate) =>
                this.applyStatusChange(
                    updatedCandidate,
                    'Candidature rejetée avec succès.'
                ),
            error: (error: unknown) => {
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

    private applyStatusChange(
        updatedCandidate: CandidateResponse,
        message: string
    ): void {
        this.candidate.set(updatedCandidate);
        this.processingAction.set(null);
        this.showSuccess(message);

        const state = this.navigationState();
        const activeFilter =
            state?.context.filters?.['status'];

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

        this.goToNextCandidateOrList();
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
                status: this.contextStatus(context)
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
                status: this.contextStatus(context)
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
            return error.error?.detail ?? fallback;
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