import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
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
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '../../permissions/permission.model';
import { PrivilegeResponse } from '../../models/identity-management.model';
import { IdentityManagementService } from '../../services/identity-management.service';
import { SCOPE_SEVERITIES, describePrivilege } from '../../utils/privilege-label';

/** Une autorité `module:ressource:action`, suivie ou non d'une portée. */
export const PRIVILEGE_NAME_PATTERN = /^[a-z][a-z-]*(:[a-z][a-z-]*){2,3}$/;

type PrivilegeRow = PrivilegeResponse & {
    groupLabel: string;
    actionLabel: string;
    scopeLabel: string | null;
    scopeSeverity: string;
};

/**
 * Catalogue des privilèges : les autorités que les rôles regroupent. On en crée pour une
 * nouvelle ressource ou portée, on en supprime une obsolète ; leur attribution se fait par les rôles.
 */
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
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './privilege-management.html',
    styleUrl: './privilege-management.scss',
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

    readonly canDelete = computed(() => this.permissionService.hasAnyPermission([IdentityPermission.PrivilegeDeleteAll]));

    readonly rows = computed<PrivilegeRow[]>(() =>
        this.privileges()
            .map((privilege) => {
                const description = describePrivilege(privilege.name);
                return {
                    ...privilege,
                    groupLabel: description.group === privilege.name ? '—' : description.groupLabel,
                    actionLabel: description.actionLabel,
                    scopeLabel: description.scopeLabel,
                    scopeSeverity: description.scope ? SCOPE_SEVERITIES[description.scope] : 'secondary'
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name))
    );

    readonly createForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.pattern(PRIVILEGE_NAME_PATTERN)]]
    });

    /** Lecture de l'autorité saisie, pour vérifier avant de créer. */
    readonly preview = signal<string | null>(null);

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau',
            icon: 'pi pi-plus',
            command: () => this.openCreateDialog(),
            permissions: [IdentityPermission.PrivilegeCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.loadPrivileges();
        this.createForm.controls.name.valueChanges.subscribe((name) => {
            const value = name.trim();
            if (!PRIVILEGE_NAME_PATTERN.test(value)) {
                this.preview.set(null);
                return;
            }
            const description = describePrivilege(value);
            this.preview.set(`${description.groupLabel} — ${description.actionLabel}${description.scopeLabel ? ` (${description.scopeLabel})` : ''}`);
        });
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openCreateDialog(): void {
        this.createForm.reset({ name: '' });
        this.createDialogVisible.set(true);
    }

    submitCreate(): void {
        const name = this.createForm.controls.name.value.trim();
        this.createForm.controls.name.setValue(name);
        if (this.createForm.invalid || this.creating()) {
            this.createForm.markAllAsTouched();
            return;
        }
        if (this.privileges().some((privilege) => privilege.name === name)) {
            this.createForm.controls.name.setErrors({ duplicate: true });
            return;
        }
        this.creating.set(true);
        this.identityService.createPrivilege({ name }).subscribe({
            next: (privilege) => {
                this.creating.set(false);
                this.createDialogVisible.set(false);
                this.privileges.update((items) => [...items, privilege]);
                this.showSuccess(`Privilège ${privilege.name} créé. Ajoutez-le à un rôle pour l’attribuer.`);
            },
            error: (error: HttpErrorResponse) => {
                this.creating.set(false);
                this.showError(apiErrorMessage(error, 'Impossible de créer le privilège.'));
            }
        });
    }

    confirmDelete(privilege: PrivilegeRow): void {
        this.confirmationService.confirm({
            header: 'Supprimer le privilège',
            message: `Supprimer ${privilege.name} ? Les rôles qui le contiennent et les utilisateurs qui le portent le perdront.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deletePrivilege(privilege)
        });
    }

    private deletePrivilege(privilege: PrivilegeRow): void {
        if (this.deletingId()) {
            return;
        }
        this.deletingId.set(privilege.id);
        this.identityService.deletePrivilege(privilege.id).subscribe({
            next: () => {
                this.deletingId.set(null);
                this.privileges.update((items) => items.filter((item) => item.id !== privilege.id));
                this.showSuccess(`Privilège ${privilege.name} supprimé.`);
            },
            error: (error: HttpErrorResponse) => {
                this.deletingId.set(null);
                this.showError(apiErrorMessage(error, 'Impossible de supprimer le privilège.'));
            }
        });
    }

    private loadPrivileges(): void {
        this.loading.set(true);
        this.identityService.getAllPrivileges().subscribe({
            next: (privileges) => {
                this.privileges.set(privileges);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.showError(apiErrorMessage(error, 'Impossible de charger les privilèges.'));
            }
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 4000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
