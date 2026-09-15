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
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { AcademicPermission } from '../../permissions/permission.model';
import { Course } from '../../models/course.model';
import { CourseUnit, UE_BLOC_OPTIONS } from '../../models/course-unit.model';
import { Faculty } from '../../models/faculty.model';
import { Program } from '../../models/program.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { ProgramService } from '../../services/program.service';

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
    private readonly programService = inject(ProgramService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.courses';

    readonly courses = signal<Course[]>([]);
    readonly faculties = signal<Faculty[]>([]);
    readonly programs = signal<Program[]>([]);
    readonly units = signal<CourseUnit[]>([]);
    readonly selectedFacultyId = signal<string | null>(null);
    readonly selectedProgramId = signal<string | null>(null);
    readonly selectedProgramLevelId = signal<string | null>(null);
    readonly formProgramId = signal<string | null>(null);
    readonly scopedFacultyId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);

    readonly canReadAll = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseReadAll])
    );

    readonly facultyOptions = computed(() =>
        this.faculties().map((faculty) => ({
            label: `${faculty.code} — ${faculty.name}`,
            value: faculty.id
        }))
    );

    readonly programOptions = computed(() =>
        this.programs().map((program) => ({
            label: `${program.code} — ${program.name}`,
            value: program.id
        }))
    );

    readonly programLevelOptions = computed(() => this.toLevelOptions(this.selectedProgramId()));

    readonly dialogProgramLevelOptions = computed(() => this.toLevelOptions(this.formProgramId()));

    readonly unitOptions = computed(() =>
        this.units().map((unit) => ({
            label: `${unit.code} — ${this.blocLabel(unit.knowledge_skills_bloc)}`,
            value: unit.id
        }))
    );

    readonly form = this.fb.nonNullable.group({
        faculty_id: [null as string | null, Validators.required],
        program_id: [null as string | null, Validators.required],
        program_level_id: [null as string | null, Validators.required],
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
            this.form.controls.program_id.setValue(null);
            this.form.controls.program_level_id.setValue(null);
            this.form.controls.course_unit_id.setValue(null);
            this.formProgramId.set(null);
            this.units.set([]);
            this.loadPrograms(facultyId);
        });
        this.form.controls.program_id.valueChanges.subscribe((programId) => {
            this.form.controls.program_level_id.setValue(null);
            this.form.controls.course_unit_id.setValue(null);
            this.formProgramId.set(programId);
            this.units.set([]);
        });
        this.form.controls.program_level_id.valueChanges.subscribe((programLevelId) => {
            this.form.controls.course_unit_id.setValue(null);
            if (programLevelId) {
                this.loadUnits(programLevelId);
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
        this.selectedProgramId.set(null);
        this.selectedProgramLevelId.set(null);
        this.courses.set([]);
        this.loadPrograms(facultyId);
        this.load();
    }

    onProgramFilterChange(programId: string | null): void {
        this.selectedProgramId.set(programId);
        this.selectedProgramLevelId.set(null);
        this.courses.set([]);
        this.load();
    }

    onProgramLevelFilterChange(programLevelId: string | null): void {
        this.selectedProgramLevelId.set(programLevelId);
        this.load();
    }

    openDetail(course: Course): void {
        void this.router.navigate(['/academic/courses', course.id]);
    }

    openCreateDialog(): void {
        const facultyId = this.scopedFacultyId() ?? this.selectedFacultyId();
        const programId = this.selectedProgramId();
        const programLevelId = this.selectedProgramLevelId();
        this.form.reset(
            {
                faculty_id: facultyId,
                program_id: programId,
                program_level_id: programLevelId,
                course_unit_id: null,
                code: '',
                name: '',
                description: '',
                credits: 1
            },
            { emitEvent: false }
        );
        this.formProgramId.set(programId);
        this.units.set([]);
        if (facultyId) {
            this.loadPrograms(facultyId);
        }
        if (programLevelId) {
            this.loadUnits(programLevelId);
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
                    this.selectedProgramId.set(raw.program_id);
                    this.selectedProgramLevelId.set(raw.program_level_id);
                    this.load();
                    this.showSuccess(`Cours ${course.code} créé.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(error.error?.detail ?? 'Impossible d’enregistrer le cours.');
                }
            });
    }

    private toLevelOptions(programId: string | null): { label: string; value: string }[] {
        const program = this.programs().find((item) => item.id === programId);

        return (program?.levels ?? []).map((item) => ({
            label: item.is_common ? `${item.level.code} (commun)` : item.level.code,
            value: item.id
        }));
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
                this.form.controls.faculty_id.disable({ emitEvent: false });
                this.loadPrograms(faculty.id);
                this.load();
            },
            error: () => void this.router.navigate(['/notfound'])
        });
    }

    private loadPrograms(facultyId: string | null): void {
        if (!facultyId) {
            this.programs.set([]);
            return;
        }

        this.programService.getByFaculty(facultyId).subscribe({
            next: (programs) => this.programs.set(programs),
            error: () => this.programs.set([])
        });
    }

    private load(): void {
        const programLevelId = this.selectedProgramLevelId();

        if (!programLevelId) {
            if (this.canReadAll() && !this.selectedFacultyId()) {
                this.loading.set(true);
                this.courseService.getAll().subscribe({
                    next: (courses) => this.afterCourses(courses, null),
                    error: (error: HttpErrorResponse) => this.onLoadError(error)
                });
                return;
            }

            this.courses.set([]);
            return;
        }

        this.loading.set(true);
        this.courseService.getByProgramLevel(programLevelId).subscribe({
            next: (courses) => this.afterCourses(courses, programLevelId),
            error: (error: HttpErrorResponse) => this.onLoadError(error)
        });
    }

    private afterCourses(courses: Course[], programLevelId: string | null): void {
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
            filters: { programLevelId }
        });
        this.loading.set(false);
    }

    private onLoadError(error: HttpErrorResponse): void {
        this.courses.set([]);
        this.loading.set(false);
        this.showError(error.error?.detail ?? 'Impossible de charger les cours.');
    }

    private loadUnits(programLevelId: string): void {
        this.courseUnitService.getByProgramLevel(programLevelId).subscribe({
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
