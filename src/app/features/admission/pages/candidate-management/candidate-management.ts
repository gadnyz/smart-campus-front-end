import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    OnInit,
    computed,
    effect,
    inject,
    signal,
    viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ColumnDef } from '@/app/shared/data-table/column.model';
import { DataFilter } from '@/app/shared/data-table/data-filter/data-filter';
import { TableToolbar } from '@/app/shared/data-table/table-toolbar/table-toolbar';
import { listState } from '@/app/shared/data-table/list-state';
import { resetPageOnChange } from '@/app/shared/data-table/reset-page';

/** Candidatures chargées en une fois pour la faculté et le statut choisis. */
export const CANDIDATE_LOAD_LIMIT = 1000;

const fullNameOf = (candidate: CandidateListItem) => [candidate.first_name, candidate.middle_name, candidate.last_name].filter(Boolean).join(' ');

/** Les colonnes des candidatures : affichage, recherche, filtres, impression et export. */
export const CANDIDATE_COLUMNS: ColumnDef<CandidateListItem>[] = [
    { key: 'name', label: 'Candidat', type: 'text', value: (row) => fullNameOf(row), searchable: true, hideable: false, exportWidth: 2 },
    { key: 'email', label: 'E-mail', type: 'text', value: (row) => row.email, searchable: true, exportWidth: 2 },
    { key: 'phone', label: 'Téléphone', type: 'text', value: (row) => row.phone, searchable: true },
    {
        key: 'submitted',
        label: 'Soumise le',
        type: 'date',
        value: (row) => (row.status === 'DRAFT' ? null : row.submitted_at),
        format: (row) => (row.status === 'DRAFT' || !row.submitted_at ? '' : formatCandidateDateTime(row.submitted_at))
    },
    // Le statut est une liste de l'API, au-dessus du tableau : pas repris dans les filtres.
    { key: 'status', label: 'Statut', type: 'text', value: (row) => formatCandidatureStatus(row.status), apiKey: 'status' },
    { key: 'gender', label: 'Genre', type: 'text', value: (row) => formatCandidateGender(row.gender), visible: false }
];
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import {
    DetailNavigationService
} from '@/app/shared/navigation/detail-navigation.service';
import {
    ContentSubtopbar,
    SubtopbarAction
} from '@/app/shared/ui/content-subtopbar/content-subtopbar';

import {
    CandidateListItem,
    CandidatureStatus
} from '../../models/candidate.model';
import { AdmissionAcademicReferenceService } from '../../services/admission-academic-reference.service';
import { CandidateService } from '../../services/candidate.service';
import {
    CandidateStatusSeverity,
    candidateStatusSeverity,
    formatCandidateDateTime,
    formatCandidateGender,
    formatCandidatureStatus
} from '../../utils/candidate-format';
import { FacultyScopeService } from '@/app/core/auth/services/faculty-scope.service';
import { FacultyService } from '@/app/features/academic/services/faculty.service';

type FacultyOption = {
    label: string;
    value: string;
};

@Component({
    selector: 'app-candidate-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        CardModule,
        IconFieldModule,
        InputIconModule,
        InputTextModule,
        PaginatorModule,
        SelectModule,
        TableModule,
        TagModule,
        ToastModule,
        ContentSubtopbar,
        DataFilter,
        TableToolbar
    ],
    templateUrl: './candidate-management.html',
    styleUrl: './candidate-management.scss',
    providers: [MessageService]
})
export class CandidateManagement implements OnInit {
    private readonly candidateService =
        inject(CandidateService);

    private readonly academicReferenceService =
        inject(AdmissionAcademicReferenceService);

    private readonly facultyService = inject(FacultyService);

    private readonly messageService =
        inject(MessageService);

    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    private readonly detailNavigation =
        inject(DetailNavigationService);

    private readonly navigationScope =
        'admission.candidates';

    readonly loading = signal(false);
    readonly loadingFaculties = signal(false);
    readonly candidates = signal<CandidateListItem[]>([]);
    /** Recherche, filtres et colonnes affichées ; `list.rows()` est aussi ce qu'on imprime. */
    readonly list = listState(CANDIDATE_COLUMNS, this.candidates);
    private readonly table = viewChild(Table);
    readonly page = signal(0);
    readonly size = signal(10);
    readonly totalElements = signal(0);
    readonly faculties = signal<FacultyOption[]>([]);

    readonly statusFilter =
        signal<CandidatureStatus | null>(null);

    readonly facultyFilter = signal<string | null>(null);

    readonly statusOptions: {
        label: string;
        value: CandidatureStatus;
    }[] = [
            { label: 'Brouillon', value: 'DRAFT' },
            { label: 'En attente', value: 'PENDING' },
            { label: 'Validée', value: 'VALIDATED' },
            { label: 'Rejetée', value: 'REJECTED' },
            { label: 'Annulée', value: 'CANCELLED' }
        ];

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouvelle candidature',
            icon: 'pi pi-external-link',
            severity: 'secondary',
            outlined: true,
            command: () => this.openPublicApply()
        },
        {
            label: 'Actualiser',
            icon: 'pi pi-refresh',
            severity: 'secondary',
            outlined: true,
            loading: this.loading(),
            disabled: this.loading(),
            command: () =>
                this.loadCandidates()
        }
    ]);

    constructor() {
        resetPageOnChange(this.list.query, this.table);
        // Fiche précédente / suivante : dans l'ordre affiché, filtres compris.
        effect(() => this.registerNavigationContext(this.list.rows()));
    }


    private readonly facultyScope = inject(FacultyScopeService);
    readonly facultyLocked = computed(() => this.facultyScope.isScopedFor('admission:candidate:read'));

    ngOnInit(): void {
        this.applyQueryFilters();
        const locked = this.facultyScope.scopedIdFor('admission:candidate:read');
        if (locked) {
            this.facultyFilter.set(locked);
        } else if (!this.facultyFilter() && this.facultyScope.workingFacultyId()) {
            // Portée all : on reprend la dernière faculté choisie.
            this.facultyFilter.set(this.facultyScope.workingFacultyId());
        }
        this.loadFaculties();
        this.loadCandidates();
    }
    private loadFaculties(): void {
        this.loadingFaculties.set(true);
        const locked = this.facultyScope.scopedIdFor('admission:candidate:read');

        if (locked) {
            this.facultyService.getById(locked).subscribe({
                next: (faculty) => {
                    this.faculties.set([
                        {
                            label: faculty.code ? `${faculty.code} - ${faculty.name}` : faculty.name,
                            value: faculty.id
                        }
                    ]);
                    this.loadingFaculties.set(false);
                },
                error: () => {
                    this.faculties.set([]);
                    this.loadingFaculties.set(false);
                }
            });
            return;
        }

        this.academicReferenceService.getFacultyOptions().subscribe({
            next: (options) => {
                this.faculties.set(options);
                this.loadingFaculties.set(false);
            },
            error: () => {
                this.faculties.set([]);
                this.loadingFaculties.set(false);
            }
        });
    }


    private applyQueryFilters(): void {
        const params = this.route.snapshot.queryParamMap;
        const status = params.get('status');
        const facultyId = params.get('facultyId');

        const allowed = this.statusOptions.map((option) => option.value);
        if (status && allowed.includes(status as CandidatureStatus)) {
            this.statusFilter.set(status as CandidatureStatus);
        }

        if (facultyId) {
            this.facultyFilter.set(facultyId);
        }
    }

    loadCandidates(): void {
        this.loading.set(true);
        this.candidateService
            .getAll({
                // Fonctionnement mixte : la faculté et le statut passent par l'API, le reste
                // (recherche, filtres, pagination) se fait sur les candidatures chargées.
                page: 0,
                size: CANDIDATE_LOAD_LIMIT,
                status: this.statusFilter() ?? undefined,
                facultyId: this.facultyScope.scopedIdFor('admission:candidate:read') ?? this.facultyFilter() ?? undefined
            })
            .subscribe({
                next: (response) => {
                    this.candidates.set(response.content);
                    this.page.set(response.page);
                    this.size.set(response.size);
                    this.totalElements.set(
                        response.total_elements
                    );

                    this.loading.set(false);
                },
                error: (error: unknown) => {
                    this.candidates.set([]);
                    this.totalElements.set(0);
                    this.loading.set(false);

                    this.showError(
                        this.errorDetail(
                            error,
                            'Impossible de charger les candidatures.'
                        )
                    );
                }
            });
    }

    onStatusChange(
        status: CandidatureStatus | null
    ): void {
        this.statusFilter.set(status);
        this.page.set(0);
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                status: status ?? null,
                facultyId: this.facultyFilter()
            },
            queryParamsHandling: 'merge'
        });
        this.loadCandidates();
    }

    onFacultyChange(facultyId: string | null): void {
        this.facultyScope.rememberFaculty(facultyId);
        this.facultyFilter.set(facultyId);
        this.page.set(0);
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                status: this.statusFilter(),
                facultyId: facultyId ?? null
            },
            queryParamsHandling: 'merge'
        });
        this.loadCandidates();
    }

    openCandidate(candidate: CandidateListItem): void {
        void this.router.navigate([
            '/admission/candidates',
            candidate.id
        ]);
    }

    openPublicApply(): void {
        window.open('/apply', '_blank', 'noopener');
    }

    fullName(candidate: CandidateListItem): string {
        return [
            candidate.first_name,
            candidate.middle_name,
            candidate.last_name
        ]
            .filter(Boolean)
            .join(' ');
    }

    genderLabel(candidate: CandidateListItem): string {
        return formatCandidateGender(candidate.gender);
    }

    statusLabel(status: CandidatureStatus): string {
        return formatCandidatureStatus(status);
    }

    statusSeverity(
        status: CandidatureStatus
    ): CandidateStatusSeverity {
        return candidateStatusSeverity(status);
    }

    submittedLabel(candidate: CandidateListItem): string {
        if (candidate.status === 'DRAFT' || !candidate.submitted_at) {
            return '—';
        }

        return formatCandidateDateTime(candidate.submitted_at);
    }



    private registerNavigationContext(candidates: readonly CandidateListItem[]): void {
        this.detailNavigation.setContext({
            scope: this.navigationScope,
            listRoute: ['/admission/candidates'],
            page: 0,
            size: Math.max(candidates.length, 1),
            totalElements: candidates.length,
            totalPages: 1,
            items: candidates.map((candidate) => ({
                id: candidate.id,
                label: this.fullName(candidate)
            })),
            filters: {
                status: this.statusFilter(),
                facultyId: this.facultyFilter()
            }
        });
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

    private showError(detail: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail,
            life: 3000
        });
    }
}
