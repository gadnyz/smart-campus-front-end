import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import {
    DetailNavigationService,
    DetailNavigationState
} from '@/app/shared/navigation/detail-navigation.service';
import { AcademicPermission } from '../../permissions/permission.model';
import { AcademicYear } from '../../models/academic-year.model';
import { Course } from '../../models/course.model';
import { CourseAssignment, CourseAssignmentType } from '../../models/course-assignment.model';
import { Faculty } from '../../models/faculty.model';
import {
    PROFESSOR_GENDER_OPTIONS,
    PROFESSOR_MARITAL_STATUS_OPTIONS,
    Professor,
    ProfessorGender,
    ProfessorMaritalStatus,
    professorDisplayName
} from '../../models/professor.model';
import { ProfessorGrade } from '../../models/professor-grade.model';
import { AcademicYearService } from '../../services/academic-year.service';
import { CourseAssignmentService } from '../../services/course-assignment.service';
import { CourseService } from '../../services/course.service';
import { FacultyService } from '../../services/faculty.service';
import { ProfessorGradeService } from '../../services/professor-grade.service';
import { ProfessorService } from '../../services/professor.service';
import { toApiDate, toDateValue } from '../../utils/academic-date';

@Component({
    selector: 'app-professor-detail',
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
        SelectModule,
        DatePicker,
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './professor-detail.html',
    providers: [ConfirmationService, MessageService]
})
export class ProfessorDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly professorService = inject(ProfessorService);
    private readonly professorGradeService = inject(ProfessorGradeService);
    private readonly facultyService = inject(FacultyService);
    private readonly assignmentService = inject(CourseAssignmentService);
    private readonly courseService = inject(CourseService);
    private readonly academicYearService = inject(AcademicYearService);
    private readonly permissionService = inject(PermissionService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.professors';

    readonly professor = signal<Professor | null>(null);
    readonly grades = signal<ProfessorGrade[]>([]);
    readonly faculties = signal<Faculty[]>([]);
    readonly courses = signal<Course[]>([]);
    readonly allAssignments = signal<CourseAssignment[]>([]);
    readonly currentYear = signal<AcademicYear | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly savingAssignment = signal(false);
    readonly professorDialogVisible = signal(false);
    readonly assignmentDialogVisible = signal(false);
    readonly navigationState = signal<DetailNavigationState | null>(null);

    readonly genderOptions = PROFESSOR_GENDER_OPTIONS;
    readonly maritalStatusOptions = PROFESSOR_MARITAL_STATUS_OPTIONS;

    private readonly typeLabels: Record<CourseAssignmentType, string> = {
        LEAD_INSTRUCTOR: 'Titulaire',
        CO_INSTRUCTOR: 'Assistant'
    };

    readonly assignments = computed(() =>
        this.allAssignments().filter((item) => item.status !== 'INACTIVE')
    );

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);
    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    readonly canAssign = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseAssignmentCreateAll])
    );

    readonly title = computed(() => {
        const professor = this.professor();
        const name = professor ? professorDisplayName(professor) : 'Professeur';
        const position = this.navigationState()?.label;
        return position ? `${name} (${position})` : name;
    });

    readonly gradeLabel = computed(() => {
        const professor = this.professor();
        if (!professor) {
            return '—';
        }

        return (
            professor.professor_grade_name ||
            this.grades().find((grade) => grade.id === professor.professor_grade_id)?.name ||
            '—'
        );
    });

    readonly facultyOptions = computed(() =>
        this.faculties().map((faculty) => ({ label: faculty.name, value: faculty.id }))
    );

    readonly gradeOptions = computed(() =>
        this.grades().map((grade) => ({ label: `${grade.code} — ${grade.name}`, value: grade.id }))
    );

    readonly courseOptions = computed(() => {
        const yearId = this.currentYear()?.id;
        const taken = new Set(
            this.assignments()
                .filter((item) => !yearId || item.academic_year_id === yearId)
                .map((item) => item.course_id)
        );

        return this.courses()
            .filter((course) => !taken.has(course.id))
            .map((course) => ({
                label: `${course.code} — ${course.name}`,
                value: course.id
            }));
    });

    readonly yearOptions = computed(() => {
        const year = this.currentYear();
        return year ? [{ label: year.label, value: year.id }] : [];
    });

    readonly typeOptions: { label: string; value: CourseAssignmentType }[] = [
        { label: this.typeLabels.LEAD_INSTRUCTOR, value: 'LEAD_INSTRUCTOR' },
        { label: this.typeLabels.CO_INSTRUCTOR, value: 'CO_INSTRUCTOR' }
    ];

    readonly professorForm = this.fb.nonNullable.group({
        faculty_id: [null as string | null, Validators.required],
        professor_grade_id: [null as string | null, Validators.required],
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        middle_name: [''],
        gender: ['MALE' as ProfessorGender, Validators.required],
        birth_date: [null as Date | string | null, Validators.required],
        birth_place: ['', Validators.required],
        marital_status: ['SINGLE' as ProfessorMaritalStatus, Validators.required],
        nationality: ['Congolaise', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required]
    });

    readonly assignmentForm = this.fb.nonNullable.group({
        course_id: [null as string | null, Validators.required],
        academic_year_id: [null as string | null, Validators.required],
        assignment_type: [null as CourseAssignmentType | null, Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Liste',
            icon: 'pi pi-list',
            severity: 'secondary',
            outlined: false,
            command: () => void this.router.navigate(['/academic/professors'])
        },
        {
            label: 'Précédent',
            icon: 'pi pi-chevron-left',
            severity: 'secondary',
            disabled: !this.canGoPrevious() || this.loading(),
            command: () => this.goToPrevious()
        },
        {
            label: 'Suivant',
            icon: 'pi pi-chevron-right',
            severity: 'secondary',
            disabled: !this.canGoNext() || this.loading(),
            command: () => this.goToNext()
        },
        {
            label: 'Modifier',
            icon: 'pi pi-pencil',
            command: () => this.openEdit(),
            permissions: [AcademicPermission.ProfessorUpdateAll]
        },
        {
            label: 'Supprimer',
            icon: 'pi pi-trash',
            severity: 'danger',
            outlined: true,
            command: () => this.confirmDelete(),
            permissions: [AcademicPermission.ProfessorDeleteAll]
        }
    ]);

    ngOnInit(): void {
        this.academicYearService.getCurrent().subscribe({
            next: (year) => this.currentYear.set(year),
            error: () => this.currentYear.set(null)
        });
        this.professorGradeService.getAll().subscribe({
            next: (grades) => this.grades.set(grades)
        });
        this.facultyService.getAll().subscribe({
            next: (faculties) => this.faculties.set(faculties)
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');

            if (!id) {
                this.goToNotFound();
                return;
            }

            this.syncNavigation(id);
            this.loadProfessor(id);
        });
    }

    typeLabel(type: string): string {
        return this.typeLabels[type as CourseAssignmentType] ?? type;
    }

    courseLabel(item: CourseAssignment): string {
        if (item.course_code && item.course_name) {
            return `${item.course_code} — ${item.course_name}`;
        }

        const course = this.courses().find((entry) => entry.id === item.course_id);
        if (course) {
            return `${course.code} — ${course.name}`;
        }

        return item.course_name || item.course_code || item.course_id;
    }

    openCourse(item: CourseAssignment): void {
        void this.router.navigate(['/academic/courses', item.course_id]);
    }

    openEdit(): void {
        const professor = this.professor();

        if (!professor) {
            return;
        }

        this.professorForm.reset({
            faculty_id: professor.faculty_id,
            professor_grade_id: professor.professor_grade_id ?? null,
            first_name: professor.first_name,
            last_name: professor.last_name,
            middle_name: professor.middle_name ?? '',
            gender: professor.gender ?? 'MALE',
            birth_date: toDateValue(professor.birth_date),
            birth_place: professor.birth_place ?? '',
            marital_status: professor.marital_status ?? 'SINGLE',
            nationality: professor.nationality ?? 'Congolaise',
            email: professor.email ?? '',
            phone: professor.phone ?? ''
        });
        this.professorDialogVisible.set(true);
    }

    submitProfessor(): void {
        const professor = this.professor();

        if (!professor || this.professorForm.invalid) {
            this.professorForm.markAllAsTouched();
            return;
        }

        const raw = this.professorForm.getRawValue();
        this.saving.set(true);
        this.professorService
            .update(professor.id, {
                faculty_id: raw.faculty_id as string,
                professor_grade_id: raw.professor_grade_id as string,
                first_name: raw.first_name.trim(),
                last_name: raw.last_name.trim(),
                middle_name: raw.middle_name.trim() || null,
                gender: raw.gender,
                birth_date: toApiDate(raw.birth_date),
                birth_place: raw.birth_place.trim(),
                marital_status: raw.marital_status,
                nationality: raw.nationality.trim(),
                email: raw.email.trim(),
                phone: raw.phone.trim()
            })
            .subscribe({
                next: (updated) => {
                    this.saving.set(false);
                    this.professorDialogVisible.set(false);
                    this.professor.set({ ...professor, ...updated, id: professor.id });
                    this.refreshNavigationLabel(this.professor() as Professor);
                    this.showSuccess('Professeur modifié.');
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(error.error?.detail ?? 'Impossible de modifier le professeur.');
                }
            });
    }

    confirmDelete(): void {
        const professor = this.professor();

        if (!professor) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Supprimer le professeur',
            message: `Supprimer ${professorDisplayName(professor)} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deleteProfessor(professor)
        });
    }

    openAssign(): void {
        const year = this.currentYear();

        if (!year) {
            this.showError('Aucune année académique active.');
            return;
        }

        this.assignmentForm.reset({
            course_id: null,
            academic_year_id: year.id,
            assignment_type: 'LEAD_INSTRUCTOR'
        });
        this.assignmentForm.controls.academic_year_id.disable({ emitEvent: false });
        this.assignmentDialogVisible.set(true);
        this.ensureCourses();
    }

    submitAssignment(): void {
        const professor = this.professor();

        if (!professor || this.assignmentForm.invalid) {
            this.assignmentForm.markAllAsTouched();
            return;
        }

        const raw = this.assignmentForm.getRawValue();
        const courseId = raw.course_id as string;
        const yearId = raw.academic_year_id as string;
        const type = raw.assignment_type as CourseAssignmentType;

        const alreadyActive = this.assignments().some(
            (item) => item.course_id === courseId && item.academic_year_id === yearId
        );

        if (alreadyActive) {
            this.showError('Ce cours est déjà affecté à ce professeur pour cette année.');
            return;
        }

        const inactive = this.allAssignments().find(
            (item) =>
                item.course_id === courseId &&
                item.academic_year_id === yearId &&
                item.status === 'INACTIVE'
        );

        this.savingAssignment.set(true);
        const request$ = inactive
            ? this.assignmentService.update(inactive.id, { assignment_type: type, status: 'ACTIVE' })
            : this.assignmentService.create({
                  course_id: courseId,
                  professor_id: professor.id,
                  academic_year_id: yearId,
                  assignment_type: type
              });

        request$.subscribe({
            next: () => {
                this.savingAssignment.set(false);
                this.assignmentDialogVisible.set(false);
                this.loadAssignments(professor.id);
                this.showSuccess('Cours affecté.');
            },
            error: (error: HttpErrorResponse) => {
                this.savingAssignment.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’affecter ce cours.');
            }
        });
    }

    private loadProfessor(id: string): void {
        this.loading.set(true);
        this.professorService.getById(id).subscribe({
            next: (professor) => {
                this.professor.set(professor);
                this.loading.set(false);
                this.loadAssignments(id);
            },
            error: () => {
                this.loading.set(false);
                this.goToNotFound();
            }
        });
    }

    private loadAssignments(professorId: string): void {
        this.assignmentService.getByProfessor(professorId).subscribe({
            next: (items) => {
                this.allAssignments.set(items);
                this.ensureCourses();
            },
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les cours.')
        });
    }

    private ensureCourses(): void {
        if (this.courses().length) {
            return;
        }

        this.courseService.getAll().subscribe({
            next: (courses) => this.courses.set(courses),
            error: () => this.courses.set([])
        });
    }

    private deleteProfessor(professor: Professor): void {
        this.professorService.delete(professor.id).subscribe({
            next: () => {
                this.showSuccess(`${professorDisplayName(professor)} supprimé.`);
                void this.router.navigate(['/academic/professors']);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer ce professeur.');
            }
        });
    }

    private syncNavigation(id: string): void {
        const state = this.detailNavigation.getState(this.navigationScope, id);
        this.navigationState.set(state);

        if (state) {
            return;
        }

        this.professorService.getAll().subscribe({
            next: (professors) => {
                const sorted = [...professors].sort((a, b) =>
                    professorDisplayName(a).localeCompare(professorDisplayName(b))
                );
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/academic/professors'],
                    page: 0,
                    size: sorted.length,
                    totalElements: sorted.length,
                    totalPages: 1,
                    items: sorted.map((item) => ({
                        id: item.id,
                        label: professorDisplayName(item)
                    }))
                });
                this.navigationState.set(this.detailNavigation.getState(this.navigationScope, id));
            }
        });
    }

    private refreshNavigationLabel(professor: Professor): void {
        const context = this.detailNavigation.getContext(this.navigationScope);

        if (!context) {
            this.syncNavigation(professor.id);
            return;
        }

        this.detailNavigation.setContext({
            ...context,
            items: context.items.map((item) =>
                item.id === professor.id ? { id: professor.id, label: professorDisplayName(professor) } : item
            )
        });
        this.navigationState.set(this.detailNavigation.getState(this.navigationScope, professor.id));
    }

    private goToPrevious(): void {
        const state = this.navigationState();
        const previous = state?.hasPrevious ? state.context.items[state.localIndex - 1] : null;

        if (previous) {
            void this.router.navigate(['/academic/professors', previous.id]);
        }
    }

    private goToNext(): void {
        const state = this.navigationState();
        const next = state?.hasNext ? state.context.items[state.localIndex + 1] : null;

        if (next) {
            void this.router.navigate(['/academic/professors', next.id]);
        }
    }

    private goToNotFound(): void {
        void this.router.navigate(['/notfound']);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
