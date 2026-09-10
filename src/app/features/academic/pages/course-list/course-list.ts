import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
import { CourseUnit, KnowledgeSkillsBloc } from '../../models/course-unit.model';
import { Faculty } from '../../models/faculty.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';

@Component({
    selector: 'app-course-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        CheckboxModule,
        ToastModule,
        ConfirmDialogModule,
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
    providers: [ConfirmationService, MessageService]
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
    readonly editingId = signal<string | null>(null);

    readonly blocOptions: { label: string; value: KnowledgeSkillsBloc }[] = [
        { label: 'Fondamental', value: 'FONDAMENTAL' },
        { label: 'Développement', value: 'DEVELOPMENT' },
        { label: 'Transversal', value: 'CROSS_FUNCTIONAL' }
    ];

    readonly canReadAll = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseReadAll])
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUpdateAll])
    );

    readonly dialogTitle = computed(() => (this.editingId() ? 'Modifier le cours' : 'Nouveau cours'));

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
        create_unit: [false],
        course_unit_id: [null as string | null],
        unit_code: [''],
        knowledge_skills_bloc: [null as KnowledgeSkillsBloc | null],
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
        this.form.controls.create_unit.valueChanges.subscribe((createUnit) => {
            if (createUnit) {
                this.form.controls.course_unit_id.setValue(null);
            } else {
                this.form.controls.unit_code.setValue('');
                this.form.controls.knowledge_skills_bloc.setValue(null);
            }
        });

        this.form.controls.faculty_id.valueChanges.subscribe((facultyId) => {
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
        this.editingId.set(null);
        this.form.reset({
            faculty_id: this.scopedFacultyId() ?? this.selectedFacultyId(),
            create_unit: false,
            course_unit_id: null,
            unit_code: '',
            knowledge_skills_bloc: null,
            code: '',
            name: '',
            description: '',
            credits: 1
        });
        this.dialogVisible.set(true);
    }

    openEditDialog(course: Course): void {
        this.editingId.set(course.id);
        this.dialogVisible.set(true);

        this.courseUnitService.getById(course.course_unit_id).subscribe({
            next: (unit) => {
                this.form.reset({
                    faculty_id: unit.faculty_id,
                    create_unit: false,
                    course_unit_id: unit.id,
                    unit_code: '',
                    knowledge_skills_bloc: null,
                    code: course.code,
                    name: course.name,
                    description: course.description,
                    credits: course.credits
                });
            },
            error: () => {
                this.form.reset({
                    faculty_id: course.faculty_id ?? null,
                    create_unit: false,
                    course_unit_id: course.course_unit_id,
                    unit_code: '',
                    knowledge_skills_bloc: null,
                    code: course.code,
                    name: course.name,
                    description: course.description,
                    credits: course.credits
                });
            }
        });
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingId.set(null);
    }

    submit(): void {
        const raw = this.form.getRawValue();

        if (!raw.faculty_id || this.form.controls.code.invalid || this.form.controls.name.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (raw.create_unit) {
            if (!raw.unit_code.trim() || !raw.knowledge_skills_bloc) {
                this.form.markAllAsTouched();
                return;
            }
        } else if (!raw.course_unit_id) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        const wasEdit = !!this.editingId();
        const unit$ = raw.create_unit
            ? this.courseUnitService.create({
                  code: raw.unit_code.trim(),
                  knowledge_skills_bloc: raw.knowledge_skills_bloc as KnowledgeSkillsBloc,
                  faculty_id: raw.faculty_id
              })
            : this.courseUnitService.getById(raw.course_unit_id as string);

        unit$
            .pipe(
                switchMap((unit) => {
                    const payload = {
                        code: raw.code.trim(),
                        name: raw.name.trim(),
                        description: raw.description.trim(),
                        credits: raw.credits,
                        course_unit_id: unit.id
                    };
                    const editingId = this.editingId();

                    return editingId
                        ? this.courseService.update(editingId, payload)
                        : this.courseService.create(payload);
                })
            )
            .subscribe({
                next: (course) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.editingId.set(null);
                    this.load();
                    this.showSuccess(wasEdit ? `Cours ${course.code} modifié.` : `Cours ${course.code} créé.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(error.error?.detail ?? 'Impossible d’enregistrer le cours.');
                }
            });
    }

    blocLabel(bloc: string): string {
        return this.blocOptions.find((item) => item.value === bloc)?.label ?? bloc;
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
                this.courses.set([...courses].sort((a, b) => a.code.localeCompare(b.code)));
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