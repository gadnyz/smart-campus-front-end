import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PagedResponse, ProgramReference } from '../../models/academic-reference.model';
import { Student, StudentQuery, formatStudentGender, studentDisplayName } from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { FacultyService } from '../../services/faculty.service';
import { StudentService } from '../../services/student.service';
import { FacultyScopeService } from '@/app/core/auth/services/faculty-scope.service';

type Option = { label: string; value: string };

/** Délai de saisie avant d'interroger l'API sur la recherche. */
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Liste des étudiants. Tous les filtres sont ceux de `GET /students` (faculté, programme,
 * promotion, recherche) : la pagination et le total viennent du serveur, sans filtrage local.
 */
@Component({
    selector: 'app-student-list',
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
        ToastModule,
        ContentSubtopbar
    ],
    templateUrl: './student-list.html',
    styleUrl: './student-list.scss',
    providers: [MessageService]
})
export class StudentListPage implements OnInit {
    private readonly studentService = inject(StudentService);
    private readonly catalog = inject(AcademicCatalogService);
    private readonly facultyService = inject(FacultyService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly facultyScope = inject(FacultyScopeService);
    private readonly navigationScope = 'academic.students';
    private readonly searchInput = new Subject<string>();

    readonly loading = signal(false);
    readonly loadingCatalog = signal(false);
    readonly advancedOpen = signal(false);
    readonly students = signal<Student[]>([]);
    readonly page = signal(0);
    readonly size = signal(10);
    readonly totalElements = signal(0);

    readonly search = signal('');
    readonly facultyFilter = signal<string | null>(null);
    readonly programFilter = signal<string | null>(null);
    readonly programLevelFilter = signal<string | null>(null);

    readonly faculties = signal<Option[]>([]);
    private readonly programRefs = signal<ProgramReference[]>([]);
    readonly programs = computed<Option[]>(() =>
        this.programRefs().map((program) => ({ label: program.code ? `${program.code} — ${program.name}` : program.name, value: program.id }))
    );
    /** Promotions du programme choisi : le filtre de l'API porte sur la promotion, pas sur le niveau seul. */
    readonly programLevels = computed<Option[]>(() => {
        const program = this.programRefs().find((item) => item.id === this.programFilter());
        return (program?.levels ?? [])
            .filter((item) => !!item.id)
            .map((item) => ({ label: item.level.code ? `${item.level.code} — ${item.level.name}` : item.level.name, value: item.id as string }));
    });

    readonly facultyLocked = computed(() => this.facultyScope.isScopedFor('academic:student:read'));

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Recherche avancée',
            icon: this.advancedOpen() ? 'pi pi-filter-slash' : 'pi pi-filter',
            severity: 'secondary',
            outlined: true,
            command: () => this.advancedOpen.update((open) => !open)
        },
        {
            label: 'Actualiser',
            icon: 'pi pi-refresh',
            severity: 'secondary',
            outlined: true,
            loading: this.loading(),
            disabled: this.loading(),
            command: () => this.loadStudents(this.page())
        }
    ]);

    ngOnInit(): void {
        this.applyQueryFilters();
        const locked = this.facultyScope.scopedIdFor('academic:student:read');
        if (locked) {
            this.facultyFilter.set(locked);
        } else if (!this.facultyFilter() && this.facultyScope.workingFacultyId()) {
            // Portée all : on reprend la dernière faculté choisie.
            this.facultyFilter.set(this.facultyScope.workingFacultyId());
            this.advancedOpen.set(true);
        }
        this.searchInput
            .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.applySearch(0));
        this.loadCatalog();
        this.loadStudents(0);
    }

    onSearchInput(value: string): void {
        this.search.set(value);
        this.searchInput.next(value.trim());
    }

    resetSearch(): void {
        if (!this.facultyLocked()) {
            this.facultyScope.rememberFaculty(null);
            this.facultyFilter.set(null);
            this.loadPrograms(null);
        }
        this.programFilter.set(null);
        this.programLevelFilter.set(null);
        this.search.set('');
        this.applySearch(0);
    }

    onFacultyChange(facultyId: string | null): void {
        this.facultyScope.rememberFaculty(facultyId);
        this.facultyFilter.set(facultyId);
        this.programFilter.set(null);
        this.programLevelFilter.set(null);
        this.loadPrograms(facultyId);
        this.applySearch(0);
    }

    onProgramChange(programId: string | null): void {
        this.programFilter.set(programId);
        this.programLevelFilter.set(null);
        this.applySearch(0);
    }

    onProgramLevelChange(programLevelId: string | null): void {
        this.programLevelFilter.set(programLevelId);
        this.applySearch(0);
    }

    onPageChange(event: PaginatorState): void {
        this.size.set(event.rows ?? this.size());
        this.loadStudents(event.page ?? 0);
    }

    applySearch(page = 0): void {
        this.syncQueryParams();
        this.loadStudents(page);
    }

    openDetail(student: Student): void {
        void this.router.navigate(['/academic/students', student.id]);
    }

    displayName(student: Student): string {
        return studentDisplayName(student);
    }

    genderLabel(student: Student): string {
        return formatStudentGender(student.gender);
    }

    private currentQuery(page: number): StudentQuery {
        return {
            page,
            size: this.size(),
            facultyId: this.facultyScope.scopedIdFor('academic:student:read') ?? this.facultyFilter(),
            programId: this.programFilter(),
            programLevelId: this.programLevelFilter(),
            search: this.search().trim() || null
        };
    }

    private loadStudents(page: number): void {
        this.loading.set(true);
        this.studentService.getAll(this.currentQuery(page)).subscribe({
            next: (response) => {
                this.students.set(response.content);
                this.page.set(response.page);
                this.size.set(response.size);
                this.totalElements.set(response.total_elements);
                this.registerNavigation(response);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.students.set([]);
                this.totalElements.set(0);
                this.loading.set(false);
                this.showError(this.errorDetail(error, 'Impossible de charger les étudiants.'));
            }
        });
    }

    private loadCatalog(): void {
        const locked = this.facultyScope.scopedIdFor('academic:student:read');
        this.loadingCatalog.set(true);
        const faculties$ = locked ? this.facultyService.getById(locked).pipe(map((faculty) => [faculty])) : this.catalog.getFaculties();
        faculties$.subscribe({
            next: (faculties) => {
                this.faculties.set(faculties.map((faculty) => ({ label: `${faculty.code} — ${faculty.name}`, value: faculty.id })));
                this.loadingCatalog.set(false);
            },
            error: () => {
                this.faculties.set([]);
                this.loadingCatalog.set(false);
            }
        });
        this.loadPrograms(this.facultyFilter());
    }

    private loadPrograms(facultyId: string | null): void {
        const request$ = facultyId ? this.catalog.getProgramsByFaculty(facultyId) : this.catalog.getPrograms();
        request$.subscribe({
            next: (programs) => this.programRefs.set(programs),
            error: () => this.programRefs.set([])
        });
    }

    private applyQueryFilters(): void {
        const params = this.route.snapshot.queryParamMap;
        this.facultyFilter.set(params.get('facultyId') || null);
        this.programFilter.set(params.get('programId') || null);
        this.programLevelFilter.set(params.get('programLevelId') || null);
        this.search.set(params.get('search') ?? '');
        if (this.facultyFilter() || this.programFilter() || this.programLevelFilter()) {
            this.advancedOpen.set(true);
        }
    }

    private syncQueryParams(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                facultyId: this.facultyFilter(),
                programId: this.programFilter(),
                programLevelId: this.programLevelFilter(),
                search: this.search().trim() || null
            },
            queryParamsHandling: 'merge'
        });
    }

    private registerNavigation(response: PagedResponse<Student>): void {
        this.detailNavigation.setContext({
            scope: this.navigationScope,
            listRoute: ['/academic/students'],
            page: response.page,
            size: response.size,
            totalElements: response.total_elements,
            totalPages: response.total_pages,
            items: response.content.map((student) => ({ id: student.id, label: studentDisplayName(student) })),
            filters: {
                facultyId: this.facultyFilter(),
                programId: this.programFilter(),
                programLevelId: this.programLevelFilter(),
                search: this.search()
            }
        });
    }

    private errorDetail(error: unknown, fallback: string): string {
        if (error instanceof HttpErrorResponse) {
            return apiErrorMessage(error, fallback);
        }
        return fallback;
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
