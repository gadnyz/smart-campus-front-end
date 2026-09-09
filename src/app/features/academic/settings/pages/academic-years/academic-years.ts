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
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../../permissions/permission.model';
import { AcademicYear } from '../../../models/academic-year.model';
import { AcademicYearService } from '../../../services/academic-year.service';
import { AcademicCatalogService } from '../../../services/academic-catalog.service';

@Component({
    selector: 'app-academic-years',
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
        IconFieldModule,
        InputIconModule,
        TagModule,
        DatePicker,
        ContentSubtopbar
    ],
    templateUrl: './academic-years.html',
    providers: [ConfirmationService, MessageService]
})
export class AcademicYearsPage implements OnInit {
    private readonly academicYearService = inject(AcademicYearService);
    private readonly academicCatalog = inject(AcademicCatalogService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly years = signal<AcademicYear[]>([]);
    readonly currentYearId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly creating = signal(false);
    readonly createDialogVisible = signal(false);
    readonly mutatingId = signal<string | null>(null);

    readonly canCreate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.AcademicYearCreateAll])
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.AcademicYearUpdateAll])
    );

    readonly createForm = this.fb.nonNullable.group(
        {
            label: ['', Validators.required],
            start_date: [null as Date | null, Validators.required],
            end_date: [null as Date | null, Validators.required]
        },
        { validators: AcademicYearsPage.dateRangeValidator }
    );

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouvelle année',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.AcademicYearCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);

        this.academicYearService.getAll().subscribe({
            next: (years) => {
                this.years.set(years);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.years.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les années académiques.');
            }
        });

        this.academicYearService.getCurrent().subscribe({
            next: (year) => this.currentYearId.set(year.id),
            error: () => this.currentYearId.set(null)
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    statusSeverity(status: string): 'success' | 'secondary' | 'warn' {
        if (status === 'ACTIVE') {
            return 'success';
        }

        if (status === 'CLOSED') {
            return 'secondary';
        }

        return 'warn';
    }

    statusLabel(status: string): string {
        if (status === 'ACTIVE') {
            return 'Active';
        }

        if (status === 'CLOSED') {
            return 'Clôturée';
        }

        return status;
    }

    openCreateDialog(): void {
        this.createForm.reset({ label: '', start_date: null, end_date: null });
        this.createDialogVisible.set(true);
    }

    closeCreateDialog(): void {
        this.createDialogVisible.set(false);
    }

    isInvalid(controlName: 'label' | 'start_date' | 'end_date'): boolean {
        const control = this.createForm.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submitCreate(): void {
        if (this.createForm.invalid) {
            this.createForm.markAllAsTouched();
            return;
        }

        const raw = this.createForm.getRawValue();
        this.creating.set(true);

        this.academicYearService
            .create({
                label: raw.label.trim(),
                start_date: this.toApiDate(raw.start_date as Date),
                end_date: this.toApiDate(raw.end_date as Date)
            })
            .subscribe({
                next: (year) => {
                    this.years.set([year, ...this.years()]);
                    this.academicCatalog.invalidateAcademicYears();
                    this.creating.set(false);
                    this.createDialogVisible.set(false);
                    this.showSuccess(`Année ${year.label} créée.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.creating.set(false);
                    this.showError(error.error?.detail ?? 'Impossible de créer l’année académique.');
                }
            });
    }

    confirmActivate(year: AcademicYear): void {
        this.confirmationService.confirm({
            header: 'Activer l’année',
            message: `Activer ${year.label} ? Elle deviendra l’année académique courante.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Activer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-info',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.activate(year)
        });
    }

    confirmClose(year: AcademicYear): void {
        this.confirmationService.confirm({
            header: 'Clôturer l’année',
            message: `Clôturer ${year.label} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Clôturer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-warn',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.close(year)
        });
    }

    private activate(year: AcademicYear): void {
        this.mutatingId.set(year.id);

        this.academicYearService.activate(year.id).subscribe({
            next: (updated) => {
                this.replaceYear(updated);
                this.currentYearId.set(updated.id);
                this.academicCatalog.invalidateAcademicYears();
                this.mutatingId.set(null);
                this.showSuccess(`${updated.label} est maintenant active.`);
            },
            error: (error: HttpErrorResponse) => {
                this.mutatingId.set(null);
                this.showError(error.error?.detail ?? 'Impossible d’activer cette année.');
            }
        });
    }

    private close(year: AcademicYear): void {
        this.mutatingId.set(year.id);

        this.academicYearService.close(year.id).subscribe({
            next: (updated) => {
                this.replaceYear(updated);
                if (this.currentYearId() === year.id) {
                    this.currentYearId.set(null);
                }
                this.academicCatalog.invalidateAcademicYears();
                this.mutatingId.set(null);
                this.showSuccess(`${updated.label} a été clôturée.`);
            },
            error: (error: HttpErrorResponse) => {
                this.mutatingId.set(null);
                this.showError(error.error?.detail ?? 'Impossible de clôturer cette année.');
            }
        });
    }

    private replaceYear(updated: AcademicYear): void {
        this.years.set(this.years().map((item) => (item.id === updated.id ? updated : {
            ...item,
            status: updated.status === 'ACTIVE' && item.status === 'ACTIVE' ? 'CLOSED' : item.status
        })));
    }

    private toApiDate(date: Date): string {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T00:00:00Z`;
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

    canActivate(year: AcademicYear): boolean {
        return year.status !== 'ACTIVE' && year.status !== 'CLOSED';
    }

    canClose(year: AcademicYear): boolean {
        return year.status === 'ACTIVE';
    }
}