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
import { InputNumber } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicPermission } from '../../../permissions/permission.model';
import { Level } from '../../../models/level.model';
import { LevelService } from '../../../services/level.service';
import { AcademicCatalogService } from '../../../services/academic-catalog.service';

@Component({
    selector: 'app-levels',
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
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './levels.html',
    providers: [ConfirmationService, MessageService]
})
export class LevelsPage implements OnInit {
    private readonly levelService = inject(LevelService);
    private readonly academicCatalog = inject(AcademicCatalogService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly levels = signal<Level[]>([]);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    readonly editingId = signal<string | null>(null);

    readonly dialogTitle = computed(() =>
        this.editingId() ? 'Modifier le niveau' : 'Nouveau niveau'
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.LevelUpdateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.LevelDeleteAll])
    );

    readonly form = this.fb.nonNullable.group({
        code: ['', Validators.required],
        name: ['', Validators.required],
        order: [1 as number | null, [Validators.required, Validators.min(1)]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau niveau',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.LevelCreateAll],
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
        this.form.reset({ code: '', name: '', order: 1 });
        this.dialogVisible.set(true);
    }

    openEditDialog(level: Level): void {
        this.editingId.set(level.id);
        this.form.reset({
            code: level.code,
            name: level.name,
            order: level.level_order
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingId.set(null);
    }

    isInvalid(controlName: 'code' | 'name' | 'order'): boolean {
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
            code: raw.code.trim(),
            name: raw.name.trim(),
            order: raw.order as number
        };
        const editingId = this.editingId();
        this.saving.set(true);

        const request$ = editingId
            ? this.levelService.update(editingId, payload)
            : this.levelService.create(payload);

        request$.subscribe({
            next: (level) => {
                this.saving.set(false);
                this.dialogVisible.set(false);
                this.editingId.set(null);
                this.academicCatalog.invalidateLevels();
                this.load();
                this.showSuccess(
                    editingId ? `Niveau ${level.code} modifié.` : `Niveau ${level.code} créé.`
                );
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(
                    error.error?.detail ??
                        (error.status === 409
                            ? 'Ce code de niveau existe déjà.'
                            : 'Impossible d’enregistrer le niveau.')
                );
            }
        });
    }

    confirmDelete(level: Level): void {
        this.confirmationService.confirm({
            header: 'Supprimer le niveau',
            message: `Supprimer ${level.code} — ${level.name} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.delete(level)
        });
    }

    private delete(level: Level): void {
        this.levelService.delete(level.id).subscribe({
            next: () => {
                this.academicCatalog.invalidateLevels();
                this.load();
                this.showSuccess(`Niveau ${level.code} supprimé.`);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer ce niveau.');
            }
        });
    }

    private load(): void {
        this.loading.set(true);

        this.levelService.getAll().subscribe({
            next: (levels) => {
                this.levels.set(
                    [...levels].sort((a, b) => a.level_order - b.level_order || a.code.localeCompare(b.code))
                );
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.levels.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les niveaux.');
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