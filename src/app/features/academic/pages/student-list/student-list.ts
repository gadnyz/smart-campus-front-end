import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PagedResponse } from '../../models/academic-reference.model';
import {
    STUDENT_GENDER_OPTIONS,
    Student,
    StudentQuery,
    formatStudentGender,
    studentDisplayName,
    studentMatchesQuery
} from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { StudentService } from '../../services/student.service';

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
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.students';

    readonly loading = signal(false);
    readonly loadingCatalog = signal(false);
    readonly advancedOpen = signal(false);
    readonly students = signal<Student[]>([]);
    readonly page = signal(0);
    readonly size = signal(10);
    readonly totalElements = signal(0);

    readonly genderFilter = signal<Student['gender'] | null>(null);
    readonly facultyFilter = signal<string | null>(null);
    readonly programFilter = signal<string | null>(null);
    readonly levelFilter = signal<string | null>(null);
    readonly nationalityFilter = signal('');
    readonly matriculeFilter = signal('');

    readonly genderOptions = STUDENT_GENDER_OPTIONS;
    readonly faculties = signal<{ label: string; value: string }[]>([]);
    readonly programs = signal<{ label: string; value: string }[]>([]);
    readonly levels = signal<{ label: string; value: string }[]>([]);

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
        this.loadCatalog();
        this.loadStudents(0);
    }

    onFacultyChange(facultyId: string | null): void {
        this.facultyFilter.set(facultyId);
        this.programFilter.set(null);
        this.loadPrograms(facultyId);
        this.applySearch(0);
    }

    onPageChange(event: PaginatorState): void {
        this.size.set(event.rows ?? this.size());
        this.loadStudents(event.page ?? 0);
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value ?? '', 'contains');
    }

    applySearch(page = 0): void {
        this.syncQueryParams();
        this.loadStudents(page);
    }

    resetSearch(): void {
        this.genderFilter.set(null);
        this.facultyFilter.set(null);
        this.programFilter.set(null);
        this.levelFilter.set(null);
        this.nationalityFilter.set('');
        this.matriculeFilter.set('');
        this.programs.set([]);
        this.applySearch(0);
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

    private currentQuery(): StudentQuery {
        return {
            page: this.page(),
            size: this.size(),
            gender: this.genderFilter(),
            facultyId: this.facultyFilter(),
            programId: this.programFilter(),
            levelId: this.levelFilter(),
            nationality: this.nationalityFilter().trim() || null,
            matricule: this.matriculeFilter().trim() || null
        };
    }

    private loadStudents(page: number): void {
        this.loading.set(true);
        const query = { ...this.currentQuery(), page };

        this.studentService.getAll(query).subscribe({
            next: (response) => {
                const filtered = this.applyClientFilters(response.content, query);
                const paged: PagedResponse<Student> = {
                    ...response,
                    content: filtered,
                    page: response.page,
                    total_elements:
                        filtered.length === response.content.length
                            ? response.total_elements
                            : filtered.length
                };
                this.students.set(paged.content);
                this.page.set(paged.page);
                this.size.set(paged.size);
                this.totalElements.set(paged.total_elements);
                this.registerNavigation(paged);
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

    private applyClientFilters(students: Student[], query: StudentQuery): Student[] {
        return students.filter((student) => studentMatchesQuery(student, { ...query, page: undefined, size: undefined }));
    }

    private loadCatalog(): void {
        this.loadingCatalog.set(true);
        this.catalog.getFaculties().subscribe({
            next: (faculties) => {
                this.faculties.set(
                    faculties.map((faculty) => ({ label: `${faculty.code} — ${faculty.name}`, value: faculty.id }))
                );
                this.loadingCatalog.set(false);
            },
            error: () => {
                this.faculties.set([]);
                this.loadingCatalog.set(false);
            }
        });
        this.catalog.getLevels().subscribe({
            next: (levels) =>
                this.levels.set(levels.map((level) => ({ label: `${level.code} — ${level.name}`, value: level.id }))),
            error: () => this.levels.set([])
        });
        this.loadPrograms(this.facultyFilter());
    }

    private loadPrograms(facultyId: string | null): void {
        const request$ = facultyId ? this.catalog.getProgramsByFaculty(facultyId) : this.catalog.getPrograms();
        request$.subscribe({
            next: (programs) =>
                this.programs.set(
                    programs.map((program) => ({
                        label: program.code ? `${program.code} — ${program.name}` : program.name,
                        value: program.id
                    }))
                ),
            error: () => this.programs.set([])
        });
    }

    private applyQueryFilters(): void {
        const params = this.route.snapshot.queryParamMap;
        const gender = params.get('gender');
        if (gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER') {
            this.genderFilter.set(gender);
            this.advancedOpen.set(true);
        }

        this.facultyFilter.set(params.get('facultyId') || null);
        this.programFilter.set(params.get('programId') || null);
        this.levelFilter.set(params.get('levelId') || null);
        this.nationalityFilter.set(params.get('nationality') ?? '');
        this.matriculeFilter.set(params.get('matricule') ?? '');

        if (
            this.facultyFilter() ||
            this.programFilter() ||
            this.levelFilter() ||
            this.nationalityFilter() ||
            this.matriculeFilter()
        ) {
            this.advancedOpen.set(true);
        }
    }

    private syncQueryParams(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                gender: this.genderFilter(),
                facultyId: this.facultyFilter(),
                programId: this.programFilter(),
                levelId: this.levelFilter(),
                nationality: this.nationalityFilter().trim() || null,
                matricule: this.matriculeFilter().trim() || null
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
            items: response.content.map((student) => ({
                id: student.id,
                label: studentDisplayName(student)
            })),
            filters: {
                gender: this.genderFilter(),
                facultyId: this.facultyFilter(),
                programId: this.programFilter(),
                levelId: this.levelFilter(),
                nationality: this.nationalityFilter(),
                matricule: this.matriculeFilter()
            }
        });
    }

    private errorDetail(error: unknown, fallback: string): string {
        if (error instanceof HttpErrorResponse) {
            return error.error?.detail ?? fallback;
        }

        return fallback;
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
