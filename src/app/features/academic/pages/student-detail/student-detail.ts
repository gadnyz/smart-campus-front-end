import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { DividerModule } from 'primeng/divider';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { catchError, of, switchMap } from 'rxjs';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { DetailNavigationService, DetailNavigationState } from '@/app/shared/navigation/detail-navigation.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { resolveAvatarUrl } from '@/app/shared/utils/avatar-url';
import { AcademicPermission } from '../../permissions/permission.model';
import {
    STUDENT_GENDER_OPTIONS,
    STUDENT_MARITAL_STATUS_OPTIONS,
    Student,
    formatStudentGender,
    formatStudentMaritalStatus,
    studentDisplayName
} from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { StudentService } from '../../services/student.service';
import { blankToNull, toApiDate, toDateValue } from '../../utils/academic-date';

@Component({
    selector: 'app-student-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        AvatarModule,
        ButtonModule,
        CardModule,
        DatePicker,
        DividerModule,
        InputNumber,
        InputTextModule,
        ProgressBarModule,
        SelectModule,
        SkeletonModule,
        ToastModule,
        ContentSubtopbar
    ],
    templateUrl: './student-detail.html',
    styleUrl: './student-detail.scss',
    providers: [MessageService]
})
export class StudentDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly studentService = inject(StudentService);
    private readonly catalog = inject(AcademicCatalogService);
    private readonly permissionService = inject(PermissionService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.students';

    readonly student = signal<Student | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly editing = signal(false);
    readonly photoFailed = signal(false);
    readonly navigationState = signal<DetailNavigationState | null>(null);

    readonly genderOptions = STUDENT_GENDER_OPTIONS;
    readonly maritalStatusOptions = STUDENT_MARITAL_STATUS_OPTIONS;
    readonly faculties = signal<{ label: string; value: string }[]>([]);
    readonly programs = signal<{ label: string; value: string }[]>([]);
    readonly levels = signal<{ label: string; value: string }[]>([]);

    readonly form = this.fb.nonNullable.group({
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        middle_name: [''],
        gender: [null as Student['gender'] | null, Validators.required],
        birth_date: [null as Date | string | null],
        birth_place: [''],
        marital_status: [null as Student['marital_status'] | null],
        nationality: [''],
        email: ['', Validators.email],
        phone: [''],
        matricule: [''],
        faculty_id: [null as string | null, Validators.required],
        program_id: [null as string | null],
        level_id: [null as string | null],
        origin: this.fb.nonNullable.group({
            province: [''],
            territory: [''],
            sector: [''],
            commune: ['']
        }),
        tutor: this.fb.nonNullable.group({
            full_name: [''],
            email: [''],
            phone: [''],
            profession: ['']
        }),
        emergency_contact: this.fb.nonNullable.group({
            full_name: [''],
            email: [''],
            phone: [''],
            relationship: ['']
        }),
        academic_background: this.fb.group({
            school_name: [''],
            option: [''],
            percentage: [null as number | null],
            graduation_year: [null as number | null],
            study_country: [''],
            study_city: ['']
        })
    });

    readonly canEdit = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.StudentUpdateAll])
    );

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);
    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    readonly title = computed(() => {
        const student = this.student();
        const name = student ? studentDisplayName(student) : 'Étudiant';
        const position = this.navigationState()?.label;
        return position ? `${name} (${position})` : name;
    });

    readonly displayName = computed(() => {
        const student = this.student();
        return student ? studentDisplayName(student) : 'Étudiant';
    });

    readonly initials = computed(() => {
        const student = this.student();
        return (student?.first_name?.trim().charAt(0) || student?.last_name?.trim().charAt(0) || '?').toUpperCase();
    });

    readonly photoUrl = computed(() => {
        if (this.photoFailed()) {
            return '';
        }

        const student = this.student();
        const photo = student?.documents?.find((document) => document.document_type === 'PHOTO' || document.type === 'PHOTO');
        return resolveAvatarUrl(photo?.file_url || student?.avatar_url);
    });

    readonly genderLabel = computed(() => formatStudentGender(this.student()?.gender));
    readonly maritalLabel = computed(() => formatStudentMaritalStatus(this.student()?.marital_status));

    readonly facultyLabel = computed(() => {
        const student = this.student();
        return (
            student?.faculty_name ||
            this.faculties().find((item) => item.value === student?.faculty_id)?.label ||
            '—'
        );
    });

    readonly programLabel = computed(() => {
        const student = this.student();
        return (
            student?.program_name ||
            student?.program_code ||
            this.programs().find((item) => item.value === student?.program_id)?.label ||
            '—'
        );
    });

    readonly levelLabel = computed(() => {
        const student = this.student();
        return (
            student?.level_code ||
            student?.level_name ||
            this.levels().find((item) => item.value === student?.level_id)?.label ||
            '—'
        );
    });
    readonly yearLabel = computed(() => this.student()?.academic_year_label || '—');

    readonly actions = computed<SubtopbarAction[]>(() => {
        if (this.editing()) {
            return [
                {
                    label: 'Annuler',
                    icon: 'pi pi-times',
                    severity: 'secondary',
                    command: () => this.cancelEdit()
                },
                {
                    label: 'Enregistrer',
                    icon: 'pi pi-save',
                    loading: this.saving(),
                    disabled: this.saving(),
                    command: () => this.save()
                }
            ];
        }

        return [
            {
                label: 'Liste',
                icon: 'pi pi-list',
                severity: 'secondary',
                command: () => void this.router.navigate(['/academic/students'])
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
                command: () => this.startEdit(),
                permissions: [AcademicPermission.StudentUpdateAll]
            }
        ];
    });

    ngOnInit(): void {
        this.catalog.getFaculties().subscribe({
            next: (faculties) =>
                this.faculties.set(faculties.map((faculty) => ({ label: faculty.name, value: faculty.id })))
        });
        this.catalog.getLevels().subscribe({
            next: (levels) =>
                this.levels.set(levels.map((level) => ({ label: `${level.code} — ${level.name}`, value: level.id })))
        });

        this.form.controls.faculty_id.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((facultyId) => {
            if (this.editing()) {
                this.loadPrograms(facultyId);
            }
        });

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');
            if (!id) {
                void this.router.navigate(['/notfound']);
                return;
            }

            this.editing.set(false);
            this.navigationState.set(this.detailNavigation.getState(this.navigationScope, id));
            this.loadStudent(id);
        });
    }

    onPhotoImageError(): void {
        this.photoFailed.set(true);
    }

    display(value: string | number | null | undefined): string {
        if (value == null || value === '') {
            return '—';
        }

        return String(value);
    }

    startEdit(): void {
        const student = this.student();
        if (!student || !this.canEdit()) {
            return;
        }

        this.patchForm(student);
        this.loadPrograms(student.faculty_id ?? null);
        this.editing.set(true);
    }

    cancelEdit(): void {
        const student = this.student();
        if (student) {
            this.patchForm(student);
        }
        this.editing.set(false);
    }

    save(): void {
        const student = this.student();
        if (!student || this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        this.saving.set(true);
        this.studentService
            .update(student.id, {
                faculty_id: raw.faculty_id,
                program_id: raw.program_id,
                level_id: raw.level_id,
                academic_year_id: student.academic_year_id ?? null,
                first_name: blankToNull(raw.first_name),
                last_name: blankToNull(raw.last_name),
                middle_name: blankToNull(raw.middle_name),
                gender: raw.gender,
                birth_date: toApiDate(raw.birth_date),
                birth_place: blankToNull(raw.birth_place),
                marital_status: raw.marital_status,
                nationality: blankToNull(raw.nationality),
                email: blankToNull(raw.email),
                phone: blankToNull(raw.phone),
                matricule: blankToNull(raw.matricule),
                origin: {
                    province: blankToNull(raw.origin.province),
                    territory: blankToNull(raw.origin.territory),
                    sector: blankToNull(raw.origin.sector),
                    commune: blankToNull(raw.origin.commune)
                },
                tutor: {
                    full_name: blankToNull(raw.tutor.full_name),
                    email: blankToNull(raw.tutor.email),
                    phone: blankToNull(raw.tutor.phone),
                    profession: blankToNull(raw.tutor.profession)
                },
                emergency_contact: {
                    full_name: blankToNull(raw.emergency_contact.full_name),
                    email: blankToNull(raw.emergency_contact.email),
                    phone: blankToNull(raw.emergency_contact.phone),
                    relationship: blankToNull(raw.emergency_contact.relationship)
                },
                academic_background: {
                    school_name: blankToNull(raw.academic_background.school_name),
                    option: blankToNull(raw.academic_background.option),
                    percentage: raw.academic_background.percentage,
                    graduation_year: raw.academic_background.graduation_year,
                    study_country: blankToNull(raw.academic_background.study_country),
                    study_city: blankToNull(raw.academic_background.study_city)
                }
            })
            .pipe(switchMap((updated) => this.studentService.getById(student.id).pipe(catchError(() => of(updated)))))
            .subscribe({
                next: (updated) => {
                    this.student.set({ ...updated, id: student.id });
                    this.saving.set(false);
                    this.editing.set(false);
                    this.showSuccess('Étudiant modifié.');
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(error.error?.detail ?? 'Impossible de modifier l’étudiant.');
                }
            });
    }

    private loadStudent(id: string): void {
        this.loading.set(true);
        this.photoFailed.set(false);
        this.studentService.getById(id).subscribe({
            next: (student) => {
                this.student.set(student);
                this.patchForm(student);
                this.loadPrograms(student.faculty_id ?? null);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                void this.router.navigate(['/notfound']);
            }
        });
    }

    private patchForm(student: Student): void {
        this.form.reset({
            first_name: student.first_name ?? '',
            last_name: student.last_name ?? '',
            middle_name: student.middle_name ?? '',
            gender: student.gender ?? null,
            birth_date: toDateValue(student.birth_date),
            birth_place: student.birth_place ?? '',
            marital_status: student.marital_status ?? null,
            nationality: student.nationality ?? '',
            email: student.email ?? '',
            phone: student.phone ?? '',
            matricule: student.matricule ?? '',
            faculty_id: student.faculty_id ?? null,
            program_id: student.program_id ?? null,
            level_id: student.level_id ?? null,
            origin: {
                province: student.origin?.province ?? '',
                territory: student.origin?.territory ?? '',
                sector: student.origin?.sector ?? '',
                commune: student.origin?.commune ?? ''
            },
            tutor: {
                full_name: student.tutor?.full_name ?? '',
                email: student.tutor?.email ?? '',
                phone: student.tutor?.phone ?? '',
                profession: student.tutor?.profession ?? ''
            },
            emergency_contact: {
                full_name: student.emergency_contact?.full_name ?? '',
                email: student.emergency_contact?.email ?? '',
                phone: student.emergency_contact?.phone ?? '',
                relationship: student.emergency_contact?.relationship ?? ''
            },
            academic_background: {
                school_name: student.academic_background?.school_name ?? '',
                option: student.academic_background?.option ?? '',
                percentage: student.academic_background?.percentage ?? null,
                graduation_year: student.academic_background?.graduation_year ?? null,
                study_country: student.academic_background?.study_country ?? '',
                study_city: student.academic_background?.study_city ?? ''
            }
        });
    }

    private loadPrograms(facultyId: string | null): void {
        const request$ = facultyId ? this.catalog.getProgramsByFaculty(facultyId) : this.catalog.getPrograms();
        request$.subscribe({
            next: (programs) =>
                this.programs.set(programs.map((program) => ({ label: program.name, value: program.id }))),
            error: () => this.programs.set([])
        });
    }

    private goToPrevious(): void {
        const state = this.navigationState();
        const previous = state?.hasPrevious ? state.context.items[state.localIndex - 1] : null;
        if (previous) {
            void this.router.navigate(['/academic/students', previous.id]);
        }
    }

    private goToNext(): void {
        const state = this.navigationState();
        const next = state?.hasNext ? state.context.items[state.localIndex + 1] : null;
        if (next) {
            void this.router.navigate(['/academic/students', next.id]);
        }
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
