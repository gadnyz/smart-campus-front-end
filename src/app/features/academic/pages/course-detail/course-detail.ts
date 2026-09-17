import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AcademicPermission } from '../../permissions/permission.model';
import { AcademicYear } from '../../models/academic-year.model';
import { Course } from '../../models/course.model';
import { CourseAssignment, CourseAssignmentType } from '../../models/course-assignment.model';
import { CourseUnit, UE_BLOC_OPTIONS } from '../../models/course-unit.model';
import { Professor } from '../../models/professor.model';
import { AcademicYearService } from '../../services/academic-year.service';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorService } from '../../services/professor.service';
import { StudentService } from '../../services/student.service';
import { Student, studentDisplayName } from '../../models/student.model';
import {
    DetailNavigationService,
    DetailNavigationState
} from '@/app/shared/navigation/detail-navigation.service';
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
        InputTextModule,
        InputNumber,
        TextareaModule,
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
    private readonly studentService = inject(StudentService);
    private readonly academicYearService = inject(AcademicYearService);
    private readonly facultyService = inject(FacultyService);
    private readonly authService = inject(AuthService);
    private readonly permissionService = inject(PermissionService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    readonly course = signal<Course | null>(null);
    readonly unit = signal<CourseUnit | null>(null);
    readonly units = signal<CourseUnit[]>([]);
    readonly allAssignments = signal<CourseAssignment[]>([]);
    readonly students = signal<Student[]>([]);
    readonly professors = signal<Professor[]>([]);
    readonly currentYear = signal<AcademicYear | null>(null);
    readonly loading = signal(false);
    readonly dialogVisible = signal(false);
    readonly courseDialogVisible = signal(false);
    readonly saving = signal(false);
    readonly savingCourse = signal(false);

    readonly assignments = computed(() =>
        this.allAssignments().filter((item) => item.status !== 'INACTIVE')
    );

    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.courses';

    readonly navigationState = signal<DetailNavigationState | null>(null);

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);
    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    private readonly typeLabels: Record<CourseAssignmentType, string> = {
        LEAD_INSTRUCTOR: 'Titulaire',
        CO_INSTRUCTOR: 'Assistant'
    };

    readonly canAssign = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseAssignmentCreateAll])
    );

    readonly canRetract = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseAssignmentUpdateAll])
    );

    readonly canShowAssignmentActions = computed(() => this.canRetract());

    readonly title = computed(() => {
        const course = this.course();
        const name = course ? `${course.code} — ${course.name}` : 'Cours';
        const position = this.navigationState()?.label;

        return position ? `${name} (${position})` : name;
    });

    readonly unitOptions = computed(() =>
        this.units().map((unit) => ({
            label: `${unit.code} — ${this.blocLabel(unit.knowledge_skills_bloc)}`,
            value: unit.id
        }))
    );

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
            disabled: !this.canGoPrevious() || this.loading(),
            command: () => this.goToPreviousCourse()
        },
        {
            label: 'Suivant',
            icon: 'pi pi-chevron-right',
            severity: 'secondary',
            disabled: !this.canGoNext() || this.loading(),
            command: () => this.goToNextCourse()
        },
        {
            label: 'Modifier',
            icon: 'pi pi-pencil',
            command: () => this.openEditCourse(),
            permissions: [AcademicPermission.CourseUpdateAll]
        }
    ]);

    readonly courseForm = this.fb.nonNullable.group({
        course_unit_id: [null as string | null, Validators.required],
        code: ['', Validators.required],
        name: ['', Validators.required],
        description: ['', Validators.required],
        credits: [1, [Validators.required, Validators.min(1)]]
    });

    readonly professorOptions = computed(() => {
        const yearId = this.currentYear()?.id;
        const taken = new Set(
            this.assignments()
                .filter((item) => !yearId || item.academic_year_id === yearId)
                .map((item) => item.professor_id)
        );

        return this.professors()
            .filter((professor) => !taken.has(professor.id))
            .map((professor) => ({
                label: this.professorLabel(professor),
                value: professor.id
            }));
    });

    readonly yearOptions = computed(() => {
        const year = this.currentYear();
        return year ? [{ label: year.label, value: year.id }] : [];
    });

    readonly typeOptions = computed(() => {
        const yearId = this.currentYear()?.id;
        const hasLead = this.assignments().some(
            (item) =>
                (!yearId || item.academic_year_id === yearId) && item.assignment_type === 'LEAD_INSTRUCTOR'
        );
        const options: { label: string; value: CourseAssignmentType }[] = [
            { label: this.typeLabels.CO_INSTRUCTOR, value: 'CO_INSTRUCTOR' }
        ];

        if (!hasLead) {
            options.unshift({ label: this.typeLabels.LEAD_INSTRUCTOR, value: 'LEAD_INSTRUCTOR' });
        }

        return options;
    });

    readonly form = this.fb.nonNullable.group({
        professor_id: [null as string | null, Validators.required],
        academic_year_id: [null as string | null, Validators.required],
        assignment_type: [null as CourseAssignmentType | null, Validators.required]
    });

    ngOnInit(): void {
        this.academicYearService.getCurrent().subscribe({
            next: (year) => this.currentYear.set(year),
            error: () => this.currentYear.set(null)
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');

            if (!id) {
                void this.router.navigate(['/notfound']);
                return;
            }

            this.navigationState.set(this.detailNavigation.getState(this.navigationScope, id));
            this.loadCourse(id);
        });
    }

    openAssign(): void {
        const year = this.currentYear();

        if (!year) {
            this.showError('Aucune année académique active.');
            return;
        }

        const hasLead = this.assignments().some(
            (item) => item.academic_year_id === year.id && item.assignment_type === 'LEAD_INSTRUCTOR'
        );

        this.form.reset({
            professor_id: null,
            academic_year_id: year.id,
            assignment_type: hasLead ? 'CO_INSTRUCTOR' : 'LEAD_INSTRUCTOR'
        });
        this.form.controls.academic_year_id.disable({ emitEvent: false });
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
        const professorId = raw.professor_id as string;
        const yearId = raw.academic_year_id as string;
        const type = raw.assignment_type as CourseAssignmentType;

        const alreadyActive = this.assignments().some(
            (item) => item.professor_id === professorId && item.academic_year_id === yearId
        );

        if (alreadyActive) {
            this.showError('Ce professeur est déjà assigné à ce cours pour cette année.');
            return;
        }

        if (
            type === 'LEAD_INSTRUCTOR' &&
            this.assignments().some(
                (item) => item.academic_year_id === yearId && item.assignment_type === 'LEAD_INSTRUCTOR'
            )
        ) {
            this.showError('Ce cours a déjà un titulaire pour cette année.');
            return;
        }

        const inactive = this.allAssignments().find(
            (item) =>
                item.professor_id === professorId &&
                item.academic_year_id === yearId &&
                item.status === 'INACTIVE'
        );

        this.saving.set(true);

        const request$ = inactive
            ? this.assignmentService.update(inactive.id, { assignment_type: type, status: 'ACTIVE' })
            : this.assignmentService.create({
                  course_id: course.id,
                  professor_id: professorId,
                  academic_year_id: yearId,
                  assignment_type: type
              });

        request$.subscribe({
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
        return this.typeLabels[type as CourseAssignmentType] ?? type;
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

    blocLabel(bloc: string): string {
        return UE_BLOC_OPTIONS.find((item) => item.value === bloc)?.label ?? bloc;
    }

    openEditCourse(): void {
        const course = this.course();

        if (!course) {
            return;
        }

        this.courseForm.reset({
            course_unit_id: course.course_unit_id,
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits
        });
        this.courseDialogVisible.set(true);

        const programLevelId = this.unit()?.program_level_id;
        if (programLevelId) {
            this.courseUnitService.getByProgramLevel(programLevelId).subscribe({
                next: (units) => this.units.set(units)
            });
        }
    }

    submitCourse(): void {
        const course = this.course();

        if (!course || this.courseForm.invalid) {
            this.courseForm.markAllAsTouched();
            return;
        }

        const raw = this.courseForm.getRawValue();
        this.savingCourse.set(true);
        this.courseService
            .update(course.id, {
                code: raw.code.trim(),
                name: raw.name.trim(),
                description: raw.description.trim(),
                credits: raw.credits,
                course_unit_id: raw.course_unit_id as string
            })
            .subscribe({
                next: (updated) => {
                    this.savingCourse.set(false);
                    this.courseDialogVisible.set(false);
                    this.afterCourse({ ...course, ...updated, id: course.id });
                    this.showSuccess(`Cours ${updated.code} modifié.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.savingCourse.set(false);
                    this.showError(error.error?.detail ?? 'Impossible de modifier le cours.');
                }
            });
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

                this.courseService.findById(id).subscribe({
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
        this.loadStudents(course.id);
        this.courseUnitService.getById(course.course_unit_id).subscribe({
            next: (unit) => this.unit.set(unit)
        });
    }

    studentName(student: Student): string {
        return studentDisplayName(student);
    }

    studentProgram(student: Student): string {
        return student.program_name || student.program_code || '—';
    }

    studentLevel(student: Student): string {
        return student.level_code || student.level_name || '—';
    }

    private loadAssignments(courseId: string): void {
        this.assignmentService.getByCourse(courseId).subscribe({
            next: (items) => this.allAssignments.set(items),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les collaborateurs.')
        });
    }

    private loadStudents(courseId: string): void {
        this.studentService.getByCourse(courseId).subscribe({
            next: (students) => this.students.set(students),
            error: (error: HttpErrorResponse) => {
                this.students.set([]);
                if (error.status !== 404) {
                    this.showError(error.error?.detail ?? 'Impossible de charger les étudiants inscrits.');
                }
            }
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


    goToList(): void {
        const route = this.navigationState()?.context.listRoute ?? ['/academic/courses'];
        void this.router.navigate(route);
    }

    goToPreviousCourse(): void {
        const state = this.navigationState();

        if (!state?.hasPrevious) {
            return;
        }

        const previous = state.context.items[state.localIndex - 1];

        if (previous) {
            void this.router.navigate(['/academic/courses', previous.id]);
        }
    }

    goToNextCourse(): void {
        const state = this.navigationState();

        if (!state?.hasNext) {
            return;
        }

        const next = state.context.items[state.localIndex + 1];

        if (next) {
            void this.router.navigate(['/academic/courses', next.id]);
        }
    }
}