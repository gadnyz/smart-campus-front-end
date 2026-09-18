import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { forkJoin } from 'rxjs';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { AcademicPermission } from '../../permissions/permission.model';
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
import { FacultyService } from '../../services/faculty.service';
import { ProfessorGradeService } from '../../services/professor-grade.service';
import { ProfessorService } from '../../services/professor.service';
import { blankToNull, toApiDate } from '../../utils/academic-date';

export interface ProfessorRow extends Professor {
    display_name: string;
    grade_label: string;
}

@Component({
    selector: 'app-professor-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        DialogModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        SelectModule,
        DatePicker,
        ContentSubtopbar
    ],
    templateUrl: './professor-list.html',
    providers: [MessageService]
})
export class ProfessorListPage implements OnInit {
    private readonly professorService = inject(ProfessorService);
    private readonly professorGradeService = inject(ProfessorGradeService);
    private readonly facultyService = inject(FacultyService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.professors';

    readonly professors = signal<Professor[]>([]);
    readonly grades = signal<ProfessorGrade[]>([]);
    readonly faculties = signal<Faculty[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);

    readonly genderOptions = PROFESSOR_GENDER_OPTIONS;
    readonly maritalStatusOptions = PROFESSOR_MARITAL_STATUS_OPTIONS;

    readonly facultyOptions = computed(() =>
        this.faculties().map((faculty) => ({
            label: faculty.name,
            value: faculty.id
        }))
    );

    readonly gradeOptions = computed(() =>
        this.grades().map((grade) => ({
            label: `${grade.code} — ${grade.name}`,
            value: grade.id
        }))
    );

    readonly rows = computed<ProfessorRow[]>(() => {
        const gradeById = new Map(this.grades().map((grade) => [grade.id, grade]));
        const facultyById = new Map(this.faculties().map((faculty) => [faculty.id, faculty]));

        return this.professors()
            .map((professor) => ({
                ...professor,
                faculty_name: professor.faculty_name || facultyById.get(professor.faculty_id)?.name,
                display_name: professorDisplayName(professor),
                grade_label:
                    professor.professor_grade_name ||
                    gradeById.get(professor.professor_grade_id ?? '')?.name ||
                    'Sans grade'
            }))
            .sort(
                (left, right) =>
                    left.grade_label.localeCompare(right.grade_label) ||
                    left.display_name.localeCompare(right.display_name)
            );
    });

    readonly form = this.fb.nonNullable.group({
        faculty_id: [null as string | null, Validators.required],
        professor_grade_id: [null as string | null, Validators.required],
        first_name: ['', Validators.required],
        last_name: ['', Validators.required],
        middle_name: [''],
        gender: ['MALE' as ProfessorGender, Validators.required],
        birth_date: [null as Date | string | null],
        birth_place: [''],
        marital_status: [null as ProfessorMaritalStatus | null],
        nationality: [''],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        matricule: ['']
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau professeur',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.ProfessorCreateAll]
        }
    ]);

    ngOnInit(): void {
        this.load();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openDetail(professor: ProfessorRow): void {
        void this.router.navigate(['/academic/professors', professor.id]);
    }

    openCreateDialog(): void {
        this.form.reset({
            faculty_id: null,
            professor_grade_id: null,
            first_name: '',
            last_name: '',
            middle_name: '',
            gender: 'MALE',
            birth_date: null,
            birth_place: '',
            marital_status: null,
            nationality: '',
            email: '',
            phone: '',
            matricule: ''
        });
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
        this.professorService
            .create({
                faculty_id: raw.faculty_id as string,
                professor_grade_id: raw.professor_grade_id as string,
                first_name: raw.first_name.trim(),
                last_name: raw.last_name.trim(),
                middle_name: blankToNull(raw.middle_name),
                gender: raw.gender,
                birth_date: toApiDate(raw.birth_date),
                birth_place: blankToNull(raw.birth_place),
                marital_status: raw.marital_status,
                nationality: blankToNull(raw.nationality),
                email: blankToNull(raw.email),
                phone: blankToNull(raw.phone),
                matricule: blankToNull(raw.matricule)
            })
            .subscribe({
                next: (professor) => {
                    this.saving.set(false);
                    this.dialogVisible.set(false);
                    this.load();
                    this.showSuccess(`${professorDisplayName(professor)} créé.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(
                        error.error?.detail ??
                            (error.status === 409
                                ? 'Un professeur existe déjà avec cet e-mail.'
                                : 'Impossible d’enregistrer le professeur.')
                    );
                }
            });
    }

    private load(): void {
        this.loading.set(true);

        forkJoin({
            professors: this.professorService.getAll(),
            grades: this.professorGradeService.getAll(),
            faculties: this.facultyService.getAll()
        }).subscribe({
            next: ({ professors, grades, faculties }) => {
                const sortedGrades = [...grades].sort((a, b) => a.name.localeCompare(b.name));
                this.grades.set(sortedGrades);
                this.faculties.set([...faculties].sort((a, b) => a.name.localeCompare(b.name)));
                this.professors.set(professors);
                const rows = this.rows();
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/academic/professors'],
                    page: 0,
                    size: rows.length,
                    totalElements: rows.length,
                    totalPages: 1,
                    items: rows.map((row) => ({
                        id: row.id,
                        label: row.display_name
                    }))
                });
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.professors.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les professeurs.');
            }
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
