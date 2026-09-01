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
import { IdentityPermission } from '../../permissions/permission.model';
import { PrivilegeResponse } from '../../models/identity-management.model';
import { IdentityManagementService } from '../../services/identity-management.service';

@Component({
    selector: 'app-privilege-management',
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
    templateUrl: './privilege-management.html',
    providers: [ConfirmationService, MessageService]
})
export class PrivilegeManagement implements OnInit {
    private readonly identityService = inject(IdentityManagementService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly privileges = signal<PrivilegeResponse[]>([]);
    readonly loading = signal(false);
    readonly creating = signal(false);
    readonly deletingId = signal<string | null>(null);
    readonly createDialogVisible = signal(false);

    readonly canCreate = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.PrivilegeCreateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.PrivilegeDeleteAll])
    );

    readonly createForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2)]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [IdentityPermission.PrivilegeCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.loadPrivileges();
    }

    loadPrivileges(): void {
        this.loading.set(true);

        this.identityService.getAllPrivileges().subscribe({
            next: (privileges) => {
                this.privileges.set(privileges);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.privileges.set([]);
                this.loading.set(false);

                const detail =
                    error.status === 403
                        ? 'Accès refusé : permission identity:privilege:read:all requise.'
                        : (error.error?.detail ?? 'Impossible de charger les privilèges.');

                this.showError(detail);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        table.filterGlobal(value, 'contains');
    }

    openCreateDialog(): void {
        this.createForm.reset({ name: '' });
        this.createDialogVisible.set(true);
    }

    closeCreateDialog(): void {
        this.createDialogVisible.set(false);
    }

    isCreateInvalid(): boolean {
        const control = this.createForm.controls.name;
        return control.invalid && (control.dirty || control.touched);
    }

    submitCreate(): void {
        if (this.createForm.invalid) {
            this.createForm.markAllAsTouched();
            return;
        }

        this.creating.set(true);

        this.identityService.createPrivilege(this.createForm.getRawValue()).subscribe({
            next: (privilege) => {
                this.privileges.set(
                    [...this.privileges(), privilege].sort((a, b) => a.name.localeCompare(b.name))
                );
                this.creating.set(false);
                this.createDialogVisible.set(false);
                this.showSuccess(`Privilège ${privilege.name} créé avec succès.`);
            },
            error: (error: HttpErrorResponse) => {
                this.creating.set(false);
                this.showError(error.error?.detail ?? 'Impossible de créer le privilège.');
            }
        });
    }

    confirmDelete(privilege: PrivilegeResponse): void {
        this.confirmationService.confirm({
            message: `Voulez-vous vraiment supprimer le privilège ${privilege.name} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deletePrivilege(privilege)
        });
    }

    private deletePrivilege(privilege: PrivilegeResponse): void {
        if (this.deletingId()) {
            return;
        }

        this.deletingId.set(privilege.id);

        this.identityService.deletePrivilege(privilege.id).subscribe({
            next: () => {
                this.privileges.set(this.privileges().filter((item) => item.id !== privilege.id));
                this.deletingId.set(null);
                this.showSuccess('Privilège supprimé avec succès.');
            },
            error: (error: HttpErrorResponse) => {
                this.deletingId.set(null);
                this.showError(error.error?.detail ?? 'Impossible de supprimer le privilège.');
            }
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }
}
