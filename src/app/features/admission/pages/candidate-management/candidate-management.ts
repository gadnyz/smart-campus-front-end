import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    Component,
    OnInit,
    computed,
    inject,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import {
    PaginatorModule,
    PaginatorState
} from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
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
    CandidatureStatus,
    PagedResponse
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
        ContentSubtopbar
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
                this.loadCandidates(this.page())
        }
    ]);

    ngOnInit(): void {
        this.applyQueryFilters();
        this.loadFaculties();
        this.loadCandidates(0);
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

    loadCandidates(page: number): void {
        this.loading.set(true);

        this.candidateService
            .getAll({
                page,
                size: this.size(),
                status:
                    this.statusFilter() ?? undefined,
                facultyId:
                    this.facultyFilter() ?? undefined
            })
            .subscribe({
                next: (response) => {
                    this.candidates.set(response.content);
                    this.page.set(response.page);
                    this.size.set(response.size);
                    this.totalElements.set(
                        response.total_elements
                    );

                    this.registerNavigationContext(response);
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
        this.loadCandidates(0);
    }

    onFacultyChange(facultyId: string | null): void {
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
        this.loadCandidates(0);
    }

    onPageChange(event: PaginatorState): void {
        const nextSize = event.rows ?? this.size();
        const nextPage = event.page ?? 0;

        this.size.set(nextSize);
        this.loadCandidates(nextPage);
    }

    onGlobalFilter(table: Table, event: Event): void {
        const value =
            (event.target as HTMLInputElement).value ?? '';
        table.filterGlobal(value, 'contains');
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
        return formatCandidateDateTime(candidate.submitted_at);
    }

    private loadFaculties(): void {
        this.loadingFaculties.set(true);

        this.academicReferenceService
            .getFacultyOptions()
            .subscribe({
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

    private registerNavigationContext(
        response: PagedResponse<CandidateListItem>
    ): void {
        this.detailNavigation.setContext({
            scope: this.navigationScope,
            listRoute: ['/admission/candidates'],
            page: response.page,
            size: response.size,
            totalElements: response.total_elements,
            totalPages: response.total_pages,
            items: response.content.map((candidate) => ({
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
            return error.error?.detail ?? fallback;
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
