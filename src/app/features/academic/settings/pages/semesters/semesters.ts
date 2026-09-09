import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../../permissions/permission.model';
import { AcademicYear } from '../../../models/academic-year.model';
import { Semester } from '../../../models/semester.model';
import { AcademicYearService } from '../../../services/academic-year.service';
import { SemesterService } from '../../../services/semester.service';
import { FormsModule } from '@angular/forms';

type YearOption = { label: string; value: string | null };

@Component({
    selector: 'app-semesters',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        InputNumber,
        IconFieldModule,
        InputIconModule,
        SelectModule,
        DatePicker,
        ContentSubtopbar
    ],
    templateUrl: './semesters.html',
    providers: [ConfirmationService, MessageService]
})
export class SemestersPage implements OnInit {
    private readonly semesterService = inject(SemesterService);
    private readonly academicYearService = inject(AcademicYearService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly years = signal<AcademicYear[]>([]);
    readonly semesters = signal<Semester[]>([]);
    readonly selectedYearId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    readonly editingId = signal<string | null>(null);

    readonly yearFilterOptions = computed(() =>
        this.years().map((year) => ({
            label: `${year.label}${year.status === 'ACTIVE' ? ' (active)' : ''}`,
            value: year.id
        }))
    );

    readonly yearFormOptions = computed<YearOption[]>(() =>
        this.years().map((year) => ({ label: year.label, value: year.id }))
    );

    readonly dialogTitle = computed(() =>
        this.editingId() ? 'Modifier le semestre' : 'Nouveau semestre'
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.SemesterUpdateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.SemesterDeleteAll])
    );

    readonly form = this.fb.nonNullable.group(
        {
            academic_year_id: [null as string | null, Validators.required],
            code: ['', Validators.required],
            name: ['', Validators.required],
            semester_order: [1 as number | null, [Validators.required, Validators.min(1)]],
            start_date: [null as Date | null, Validators.required],
            end_date: [null as Date | null, Validators.required]
        },
        { validators: SemestersPage.dateRangeValidator }
    );

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau semestre',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.SemesterCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.academicYearService.getAll().subscribe({
            next: (years) => {
                this.years.set(years);
                this.loadSemesters();
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de charger les années académiques.');
            }
        });
    }

    onYearFilterChange(yearId: string | null): void {
        this.selectedYearId.set(yearId);
        this.loadSemesters();
    }

    yearLabel(academicYearId: string): string {
        return this.years().find((year) => year.id === academicYearId)?.label ?? academicYearId;
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openCreateDialog(): void {
        this.editingId.set(null);
        this.form.reset({
            academic_year_id: this.selectedYearId(),
            code: '',
            name: '',
            semester_order: 1,
            start_date: null,
            end_date: null
        });
        this.dialogVisible.set(true);
    }

    openEditDialog(semester: Semester): void {
        this.editingId.set(semester.id);
        this.form.reset({
            academic_year_id: semester.academic_year_id,
            code: semester.code,
            name: semester.name,
            semester_order: semester.semester_order,
            start_date: new Date(semester.start_date),
            end_date: new Date(semester.end_date)
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingId.set(null);
    }

    isInvalid(controlName: 'academic_year_id' | 'code' | 'name' | 'semester_order' | 'start_date' | 'end_date'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const payload = {
            academic_year_id: raw.academic_year_id as string,
            code: raw.code.trim(),
            name: raw.name.trim(),
            semester_order: raw.semester_order as number,
            start_date: this.toApiDate(raw.start_date as Date),
            end_date: this.toApiDate(raw.end_date as Date)
        };

        this.saving.set(true);
        const request$ = this.editingId()
            ? this.semesterService.update(this.editingId() as string, payload)
            : this.semesterService.create(payload);

        request$.subscribe({
            next: (semester) => {
                this.saving.set(false);
                this.dialogVisible.set(false);
                this.loadSemesters();
                this.showSuccess(
                    this.editingId()
                        ? `Semestre ${semester.code} modifié.`
                        : `Semestre ${semester.code} créé.`
                );
                this.editingId.set(null);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(
                    error.error?.detail ??
                    (error.status === 409
                        ? 'Ce code de semestre existe déjà.'
                        : 'Impossible d’enregistrer le semestre.')
                );
            }
        });
    }

    confirmDelete(semester: Semester): void {
        this.confirmationService.confirm({
            header: 'Supprimer le semestre',
            message: `Supprimer ${semester.code} — ${semester.name} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.delete(semester)
        });
    }

    private delete(semester: Semester): void {
        this.semesterService.delete(semester.id).subscribe({
            next: () => {
                this.loadSemesters();
                this.showSuccess(`Semestre ${semester.code} supprimé.`);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer ce semestre.');
            }
        });
    }

    private loadSemesters(): void {
        this.loading.set(true);
        const yearId = this.selectedYearId();
        const request$ = yearId
            ? this.semesterService.getByAcademicYear(yearId)
            : this.semesterService.getAll();

        request$.subscribe({
            next: (semesters) => {
                this.semesters.set(
                    [...semesters].sort((a, b) => a.semester_order - b.semester_order)
                );
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.semesters.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les semestres.');
            }
        });
    }

    private toApiDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }

    private static dateRangeValidator(group: AbstractControl): ValidationErrors | null {
        const start = group.get('start_date')?.value as Date | null;
        const end = group.get('end_date')?.value as Date | null;

        if (!start || !end) {
            return null;
        }

        return end.getTime() > start.getTime() ? null : { dateRange: true };
    }
}