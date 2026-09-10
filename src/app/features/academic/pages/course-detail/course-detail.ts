import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AcademicPermission } from '../../permissions/permission.model';
import { AcademicYear } from '../../models/academic-year.model';
import { Course } from '../../models/course.model';
import { CourseAssignment, CourseAssignmentType } from '../../models/course-assignment.model';
import { CourseUnit } from '../../models/course-unit.model';
import { Professor } from '../../models/professor.model';
import { AcademicYearService } from '../../services/academic-year.service';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorService } from '../../services/professor.service';

@Component({
    selector: 'app-course-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        SelectModule,
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './course-detail.html',
    providers: [ConfirmationService, MessageService]
})
export class CourseDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly courseService = inject(CourseService);
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly assignmentService = inject(CourseAssignmentService);
    private readonly professorService = inject(ProfessorService);
    private readonly academicYearService = inject(AcademicYearService);
    private readonly facultyService = inject(FacultyService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    readonly course = signal<Course | null>(null);
    readonly unit = signal<CourseUnit | null>(null);
    readonly assignments = signal<CourseAssignment[]>([]);
    readonly professors = signal<Professor[]>([]);
    readonly years = signal<AcademicYear[]>([]);
    readonly loading = signal(false);
    readonly dialogVisible = signal(false);
    readonly saving = signal(false);

    readonly typeOptions: { label: string; value: CourseAssignmentType }[] = [
        { label: 'Titulaire', value: 'LEAD_INSTRUCTOR' },
        { label: 'Assistant', value: 'CO_INSTRUCTOR' }
    ];

    readonly canAssign = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseAssignmentCreateAll])
    );

    readonly canRetract = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseAssignmentUpdateAll])
    );

    readonly canShowAssignmentActions = computed(() => this.canRetract());

    readonly title = computed(() => {
        const course = this.course();
        return course ? `${course.code} — ${course.name}` : 'Cours';
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => void this.router.navigate(['/academic/courses'])
        }
    ]);

    readonly professorOptions = computed(() =>
        this.professors().map((professor) => ({
            label: this.professorLabel(professor),
            value: professor.id
        }))
    );

    readonly yearOptions = computed(() =>
        this.years().map((year) => ({ label: year.label, value: year.id }))
    );

    readonly form = this.fb.nonNullable.group({
        professor_id: [null as string | null, Validators.required],
        academic_year_id: [null as string | null, Validators.required],
        assignment_type: [null as CourseAssignmentType | null, Validators.required]
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            void this.router.navigate(['/notfound']);
            return;
        }

        this.academicYearService.getAll().subscribe({
            next: (years) => this.years.set(years)
        });

        this.loadCourse(id);
    }

    openAssign(): void {
        const currentYear = this.years().find((year) => year.status === 'ACTIVE');
        this.form.reset({
            professor_id: null,
            academic_year_id: currentYear?.id ?? null,
            assignment_type: 'LEAD_INSTRUCTOR'
        });
        this.dialogVisible.set(true);
        this.loadProfessors();
    }

    submitAssign(): void {
        const course = this.course();

        if (!course || this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        this.saving.set(true);

        this.assignmentService
            .create({
                course_id: course.id,
                professor_id: raw.professor_id as string,
                academic_year_id: raw.academic_year_id as string,
                assignment_type: raw.assignment_type as CourseAssignmentType
            })
            .subscribe({
                next: () => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.loadAssignments(course.id);
                    this.showSuccess('Professeur assigné.');
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(error.error?.detail ?? 'Impossible d’assigner ce professeur.');
                }
            });
    }

    confirmRetract(item: CourseAssignment): void {
        this.confirmationService.confirm({
            header: 'Retirer l’assignation',
            message: `Retirer ${this.assignmentProfessorLabel(item)} de ce cours ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Retirer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.retract(item)
        });
    }

    typeLabel(type: string): string {
        return this.typeOptions.find((item) => item.value === type)?.label ?? type;
    }

    assignmentProfessorLabel(item: CourseAssignment): string {
        if (item.professor_name) {
            return item.professor_name;
        }

        const name = [item.professor_last_name, item.professor_first_name].filter(Boolean).join(' ');
        return name || item.professor_id;
    }

    professorLabel(professor: Professor): string {
        return [professor.last_name, professor.first_name].filter(Boolean).join(' ');
    }

    private loadCourse(id: string): void {
        this.loading.set(true);

        if (this.permissionService.hasAnyPermission([AcademicPermission.CourseReadAll])) {
            this.courseService.findById(id).subscribe({
                next: (course) => this.afterCourse(course),
                error: () => this.goToNotFound()
            });
            return;
        }

        const session = this.authService.getCurrentUser();

        if (!session?.id) {
            this.goToNotFound();
            return;
        }

        this.facultyService.resolveAttachedFaculty(session.id, session.faculty_id).subscribe({
            next: (faculty) => {
                if (!faculty) {
                    this.goToNotFound();
                    return;
                }

                this.courseService.findById(id, faculty.id).subscribe({
                    next: (course) => this.afterCourse(course),
                    error: () => this.goToNotFound()
                });
            },
            error: () => this.goToNotFound()
        });
    }

    private afterCourse(course: Course | null): void {
        if (!course) {
            this.goToNotFound();
            return;
        }

        this.course.set(course);
        this.loading.set(false);
        this.loadAssignments(course.id);
        this.courseUnitService.getById(course.course_unit_id).subscribe({
            next: (unit) => this.unit.set(unit)
        });
    }

    private loadAssignments(courseId: string): void {
        this.assignmentService.getByCourse(courseId).subscribe({
            next: (items) => this.assignments.set(items.filter((item) => item.status !== 'INACTIVE')),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les enseignants.')
        });
    }

    private loadProfessors(): void {
        const facultyId = this.unit()?.faculty_id ?? this.course()?.faculty_id;
        const request$ = facultyId
            ? this.professorService.getByFaculty(facultyId)
            : this.professorService.getAll();

        request$.subscribe({
            next: (professors) => this.professors.set(professors),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les professeurs.')
        });
    }

    private retract(item: CourseAssignment): void {
        this.assignmentService
            .update(item.id, {
                assignment_type: item.assignment_type,
                status: 'INACTIVE'
            })
            .subscribe({
                next: () => {
                    const course = this.course();
                    if (course) {
                        this.loadAssignments(course.id);
                    }
                    this.showSuccess('Assignation retirée.');
                },
                error: (error: HttpErrorResponse) => {
                    this.showError(error.error?.detail ?? 'Impossible de retirer cette assignation.');
                }
            });
    }

    private goToNotFound(): void {
        this.loading.set(false);
        void this.router.navigate(['/notfound']);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}