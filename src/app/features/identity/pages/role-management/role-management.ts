import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PrivilegeGroups } from '../../components/privilege-groups/privilege-groups';
import { privilegeLabel } from '../../utils/privilege-label';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '../../permissions/permission.model';
import { PrivilegeResponse, RoleResponse } from '../../models/identity-management.model';
import { IdentityManagementService } from '../../services/identity-management.service';

type RoleTableRow = RoleResponse & {
    privilegesCount: number;
    privilegesLabel: string;
};

@Component({
    selector: 'app-role-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        IconFieldModule,
        InputIconModule,
        MultiSelectModule,
        ContentSubtopbar,
        PrivilegeGroups
    ],
    templateUrl: './role-management.html',
    styleUrl: './role-management.scss',
    providers: [ConfirmationService, MessageService]
})
export class RoleManagement implements OnInit {
    private readonly identityService = inject(IdentityManagementService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly roles = signal<RoleResponse[]>([]);
    readonly privileges = signal<PrivilegeResponse[]>([]);
    readonly loading = signal(false);
    readonly loadingPrivileges = signal(false);
    readonly creating = signal(false);
    readonly attaching = signal(false);
    readonly createDialogVisible = signal(false);
    readonly detailDialogVisible = signal(false);
    readonly selectedRole = signal<RoleResponse | null>(null);
    readonly selectedPrivilegeIds = signal<string[]>([]);
    readonly detailIndex = signal(-1);

    readonly canCreateRoles = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.RoleCreateAll])
    );

    readonly canUpdateRoles = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.RoleUpdateAll])
    );

    readonly rows = computed<RoleTableRow[]>(() =>
        this.roles().map((role) => ({
            ...role,
            privilegesCount: role.privileges?.length ?? 0,
            // Clés brutes et libellés lisibles : la recherche trouve « student » comme « Étudiants ».
            privilegesLabel: role.privileges?.length
                ? role.privileges.map((name) => `${name} ${privilegeLabel(name)}`).join(', ')
                : 'Aucun'
        }))
    );

    readonly availablePrivileges = computed(() => {
        const assigned = new Set(this.selectedRole()?.privileges ?? []);

        return this.privileges()
            .filter((privilege) => !assigned.has(privilege.name))
            .map((privilege) => ({
                label: privilegeLabel(privilege.name),
                name: privilege.name,
                value: privilege.id
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    });

    readonly canGoPreviousDetail = computed(() => this.detailIndex() > 0);

    readonly canGoNextDetail = computed(() => {
        const index = this.detailIndex();
        return index >= 0 && index < this.rows().length - 1;
    });

    readonly detailPositionLabel = computed(() => {
        const index = this.detailIndex();
        const total = this.rows().length;

        if (index < 0 || total === 0) {
            return '';
        }

        return `${index + 1}/${total}`;
    });

    readonly createForm = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.pattern(/^ROLE_[A-Z_]+$/)]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [IdentityPermission.RoleCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.loadRoles();
        // Les privilèges ne servent qu'à en ajouter : inutile de les charger en lecture seule.
        if (this.canUpdateRoles()) {
            this.loadPrivileges();
        }
    }

    loadRoles(): void {
        this.loading.set(true);

        this.identityService.getRoles({ page: 0, size: 200, sort: ['name,asc'] }).subscribe({
            next: (response) => {
                this.roles.set(response.content);
                this.loading.set(false);
            },
            error: () => {
                this.roles.set([]);
                this.loading.set(false);
                this.showError('Impossible de charger les rôles.');
            }
        });
    }

    loadPrivileges(): void {
        this.loadingPrivileges.set(true);

        this.identityService.getAllPrivileges().subscribe({
            next: (privileges) => {
                this.privileges.set(privileges);
                this.loadingPrivileges.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.privileges.set([]);
                this.loadingPrivileges.set(false);
                this.showError(this.privilegeLoadError(error));
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

        this.identityService.createRole(this.createForm.getRawValue()).subscribe({
            next: (role) => {
                this.roles.set([...this.roles(), role].sort((a, b) => a.name.localeCompare(b.name)));
                this.creating.set(false);
                this.createDialogVisible.set(false);
                this.showSuccess(`Rôle ${role.name} créé avec succès.`);
            },
            error: (error: HttpErrorResponse) => {
                this.creating.set(false);
                this.showError(apiErrorMessage(error, 'Impossible de créer le rôle.'));
            }
        });
    }

    openDetail(role: RoleTableRow): void {
        this.showRoleAtIndex(this.rows().findIndex((item) => item.id === role.id));
    }

    goToPreviousDetail(): void {
        if (!this.canGoPreviousDetail()) {
            return;
        }

        this.showRoleAtIndex(this.detailIndex() - 1);
    }

    goToNextDetail(): void {
        if (!this.canGoNextDetail()) {
            return;
        }

        this.showRoleAtIndex(this.detailIndex() + 1);
    }

    closeDetail(): void {
        this.detailDialogVisible.set(false);
        this.selectedRole.set(null);
        this.selectedPrivilegeIds.set([]);
        this.detailIndex.set(-1);
    }

    attachPrivileges(): void {
        const role = this.selectedRole();
        const privilegeIds = this.selectedPrivilegeIds();

        if (!role || !privilegeIds.length || this.attaching()) {
            return;
        }

        this.attaching.set(true);

        this.identityService.addPrivilegesToRole(role.id, { privilege_ids: privilegeIds }).subscribe({
            next: () => {
                const addedNames = this.privileges()
                    .filter((privilege) => privilegeIds.includes(privilege.id))
                    .map((privilege) => privilege.name);

                const updatedRole: RoleResponse = {
                    ...role,
                    privileges: [...new Set([...(role.privileges ?? []), ...addedNames])].sort()
                };

                this.roles.set(this.roles().map((item) => (item.id === role.id ? updatedRole : item)));
                this.selectedRole.set(updatedRole);
                this.selectedPrivilegeIds.set([]);
                this.attaching.set(false);
                this.showSuccess('Privilèges ajoutés au rôle.');
            },
            error: (error: HttpErrorResponse) => {
                this.attaching.set(false);
                this.showError(apiErrorMessage(error, 'Impossible d\'ajouter les privilèges.'));
            }
        });
    }

    private showRoleAtIndex(index: number): void {
        const rows = this.rows();

        if (index < 0 || index >= rows.length) {
            return;
        }

        this.detailIndex.set(index);
        this.selectedRole.set(rows[index]);
        this.selectedPrivilegeIds.set([]);
        this.detailDialogVisible.set(true);
    }

    private privilegeLoadError(error: HttpErrorResponse): string {
        if (error.status === 403) {
            return 'Accès refusé : permission identity:privilege:read:all requise pour charger les privilèges.';
        }

        return apiErrorMessage(error, 'Impossible de charger les privilèges.');
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
