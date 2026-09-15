import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../../permissions/permission.model';
import { ProfessorGrade } from '../../../models/professor-grade.model';
import { ProfessorGradeService } from '../../../services/professor-grade.service';

@Component({
    selector: 'app-professor-grades',
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
        ContentSubtopbar
    ],
    templateUrl: './professor-grades.html',
    providers: [ConfirmationService, MessageService]
})
export class ProfessorGradesPage implements OnInit {
    private readonly professorGradeService = inject(ProfessorGradeService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly grades = signal<ProfessorGrade[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    readonly editingId = signal<string | null>(null);

    readonly dialogTitle = computed(() =>
        this.editingId() ? 'Modifier le grade' : 'Nouveau grade'
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.ProfessorGradeUpdateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.ProfessorGradeDeleteAll])
    );

    readonly form = this.fb.nonNullable.group({
        code: ['', Validators.required],
        name: ['', Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau grade',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.ProfessorGradeCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.load();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openCreateDialog(): void {
        this.editingId.set(null);
        this.form.reset({ code: '', name: '' });
        this.dialogVisible.set(true);
    }

    openEditDialog(grade: ProfessorGrade): void {
        this.editingId.set(grade.id);
        this.form.reset({ code: grade.code, name: grade.name });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingId.set(null);
    }

    isInvalid(controlName: 'code' | 'name'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const payload = { code: raw.code.trim(), name: raw.name.trim() };
        const editingId = this.editingId();
        this.saving.set(true);

        const request$ = editingId
            ? this.professorGradeService.update(editingId, payload)
            : this.professorGradeService.create(payload);

        request$.subscribe({
            next: (grade) => {
                this.saving.set(false);
                this.dialogVisible.set(false);
                this.editingId.set(null);
                this.load();
                this.showSuccess(
                    editingId ? `Grade ${grade.code} modifié.` : `Grade ${grade.code} créé.`
                );
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(
                    error.error?.detail ??
                        (error.status === 409
                            ? 'Ce code de grade existe déjà.'
                            : 'Impossible d’enregistrer le grade.')
                );
            }
        });
    }

    confirmDelete(grade: ProfessorGrade): void {
        this.confirmationService.confirm({
            header: 'Supprimer le grade',
            message: `Supprimer ${grade.code} — ${grade.name} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.delete(grade)
        });
    }

    private delete(grade: ProfessorGrade): void {
        this.professorGradeService.delete(grade.id).subscribe({
            next: () => {
                this.load();
                this.showSuccess(`Grade ${grade.code} supprimé.`);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer ce grade.');
            }
        });
    }

    private load(): void {
        this.loading.set(true);

        this.professorGradeService.getAll().subscribe({
            next: (grades) => {
                this.grades.set([...grades].sort((a, b) => a.code.localeCompare(b.code)));
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.grades.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les grades.');
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