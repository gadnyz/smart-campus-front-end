import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AcademicPermission } from '../../permissions/permission.model';
import { Course } from '../../models/course.model';
import { CourseUnit, UE_BLOC_OPTIONS } from '../../models/course-unit.model';
import { Faculty } from '../../models/faculty.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';

@Component({
    selector: 'app-course-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        DialogModule,
        InputTextModule,
        InputNumber,
        TextareaModule,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './course-list.html',
    providers: [MessageService]
})
export class CourseListPage implements OnInit {
    private readonly courseService = inject(CourseService);
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly facultyService = inject(FacultyService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly courses = signal<Course[]>([]);
    readonly faculties = signal<Faculty[]>([]);
    readonly units = signal<CourseUnit[]>([]);
    readonly selectedFacultyId = signal<string | null>(null);
    readonly scopedFacultyId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.courses';

    readonly canReadAll = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseReadAll])
    );

    readonly facultyOptions = computed(() =>
        this.faculties().map((faculty) => ({
            label: `${faculty.code} — ${faculty.name}`,
            value: faculty.id
        }))
    );

    readonly unitOptions = computed(() =>
        this.units().map((unit) => ({
            label: `${unit.code} — ${this.blocLabel(unit.knowledge_skills_bloc)}`,
            value: unit.id
        }))
    );

    readonly form = this.fb.nonNullable.group({
        faculty_id: [null as string | null, Validators.required],
        course_unit_id: [null as string | null, Validators.required],
        code: ['', Validators.required],
        name: ['', Validators.required],
        description: ['', Validators.required],
        credits: [1, [Validators.required, Validators.min(1)]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau cours',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.CourseCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.form.controls.faculty_id.valueChanges.subscribe((facultyId) => {
            this.form.controls.course_unit_id.setValue(null);

            if (facultyId) {
                this.loadUnits(facultyId);
            } else {
                this.units.set([]);
            }
        });

        if (this.canReadAll()) {
            this.facultyService.getAll().subscribe({
                next: (faculties) =>
                    this.faculties.set([...faculties].sort((a, b) => a.name.localeCompare(b.name)))
            });
            this.load();
            return;
        }

        this.resolveOwnFaculty();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    onFacultyFilterChange(facultyId: string | null): void {
        this.selectedFacultyId.set(facultyId);
        this.load();
    }

    openDetail(course: Course): void {
        void this.router.navigate(['/academic/courses', course.id]);
    }

    openCreateDialog(): void {
        const facultyId = this.scopedFacultyId() ?? this.selectedFacultyId();
        this.form.reset({
            faculty_id: facultyId,
            course_unit_id: null,
            code: '',
            name: '',
            description: '',
            credits: 1
        });

        if (facultyId) {
            this.loadUnits(facultyId);
        }

        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        this.saving.set(true);
        this.courseService
            .create({
                code: raw.code.trim(),
                name: raw.name.trim(),
                description: raw.description.trim(),
                credits: raw.credits,
                course_unit_id: raw.course_unit_id as string
            })
            .subscribe({
                next: (course) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.load();
                    this.showSuccess(`Cours ${course.code} créé.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(error.error?.detail ?? 'Impossible d’enregistrer le cours.');
                }
            });
    }

    private blocLabel(bloc: string): string {
        return UE_BLOC_OPTIONS.find((item) => item.value === bloc)?.label ?? bloc;
    }

    private resolveOwnFaculty(): void {
        const session = this.authService.getCurrentUser();

        if (!session?.id) {
            void this.router.navigate(['/notfound']);
            return;
        }

        this.facultyService.resolveAttachedFaculty(session.id, session.faculty_id).subscribe({
            next: (faculty) => {
                if (!faculty) {
                    void this.router.navigate(['/notfound']);
                    return;
                }

                this.scopedFacultyId.set(faculty.id);
                this.selectedFacultyId.set(faculty.id);
                this.faculties.set([faculty]);
                this.load();
            },
            error: () => void this.router.navigate(['/notfound'])
        });
    }

    private load(): void {
        this.loading.set(true);
        const facultyId = this.selectedFacultyId();
        const request$ = facultyId ? this.courseService.getByFaculty(facultyId) : this.courseService.getAll();

        request$.subscribe({
            next: (courses) => {
                const sorted = [...courses].sort((a, b) => a.code.localeCompare(b.code));
                this.courses.set(sorted);
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/academic/courses'],
                    page: 0,
                    size: sorted.length,
                    totalElements: sorted.length,
                    totalPages: 1,
                    items: sorted.map((course) => ({
                        id: course.id,
                        label: `${course.code} — ${course.name}`
                    })),
                    filters: { facultyId }
                });
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.courses.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les cours.');
            }
        });
    }
    private loadUnits(facultyId: string): void {
        this.courseUnitService.getByFaculty(facultyId).subscribe({
            next: (units) => this.units.set(units),
            error: () => this.units.set([])
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
