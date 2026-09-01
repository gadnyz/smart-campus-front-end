import { CommonModule } from '@angular/common';
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
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '../../permissions/permission.model';
import { RoleResponse, UserProfileResponse } from '../../models/identity-management.model';
import { IdentityManagementService } from '../../services/identity-management.service';

type ProfileTableRow = UserProfileResponse & {
    rolesLabel: string;
};

@Component({
    selector: 'app-profile-management',
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
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './profile-management.html',
    providers: [ConfirmationService, MessageService]
})
export class ProfileManagement implements OnInit {
    private readonly identityService = inject(IdentityManagementService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly profiles = signal<UserProfileResponse[]>([]);
    readonly roles = signal<RoleResponse[]>([]);
    readonly loading = signal(false);
    readonly loadingRoles = signal(false);
    readonly creating = signal(false);
    readonly attaching = signal(false);
    readonly deletingId = signal<string | null>(null);
    readonly createDialogVisible = signal(false);
    readonly detailDialogVisible = signal(false);
    readonly selectedProfile = signal<UserProfileResponse | null>(null);
    readonly selectedRoleIds = signal<string[]>([]);
    readonly detailIndex = signal(-1);

    readonly canCreate = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.ProfileCreateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.ProfileDeleteAll])
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.ProfileUpdateAll])
    );

    readonly rows = computed<ProfileTableRow[]>(() =>
        this.profiles().map((profile) => ({
            ...profile,
            rolesLabel: profile.roles?.length ? profile.roles.join(', ') : 'Aucun'
        }))
    );

    readonly availableRoles = computed(() => {
        const assigned = new Set(this.selectedProfile()?.roles ?? []);

        return this.roles()
            .filter((role) => !assigned.has(role.name))
            .map((role) => ({
                label: role.name,
                value: role.id
            }));
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
        name: ['', [Validators.required, Validators.minLength(2)]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouveau',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [IdentityPermission.ProfileCreateAll],
            mode: 'any'
        }
    ]);

    ngOnInit(): void {
        this.loadProfiles();
        this.loadRoles();
    }

    loadProfiles(): void {
        this.loading.set(true);

        this.identityService.getProfiles({ page: 0, size: 200, sort: ['name,asc'] }).subscribe({
            next: (response) => {
                this.profiles.set(response.content);
                this.loading.set(false);
            },
            error: () => {
                this.profiles.set([]);
                this.loading.set(false);
                this.showError('Impossible de charger les profils métier.');
            }
        });
    }

    loadRoles(): void {
        this.loadingRoles.set(true);

        this.identityService.getRoles({ page: 0, size: 200, sort: ['name,asc'] }).subscribe({
            next: (response) => {
                this.roles.set(response.content);
                this.loadingRoles.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.roles.set([]);
                this.loadingRoles.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les rôles.');
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

        this.identityService.createProfile(this.createForm.getRawValue()).subscribe({
            next: (profile) => {
                this.profiles.set(
                    [...this.profiles(), profile].sort((a, b) => a.name.localeCompare(b.name))
                );
                this.creating.set(false);
                this.createDialogVisible.set(false);
                this.showSuccess(`Profil ${profile.name} créé avec succès.`);
            },
            error: (error: HttpErrorResponse) => {
                this.creating.set(false);
                this.showError(error.error?.detail ?? 'Impossible de créer le profil.');
            }
        });
    }

    confirmDelete(profile: ProfileTableRow): void {
        this.confirmationService.confirm({
            message: `Voulez-vous vraiment supprimer le profil ${profile.name} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deleteProfile(profile)
        });
    }

    private deleteProfile(profile: ProfileTableRow): void {
        if (this.deletingId()) {
            return;
        }

        this.deletingId.set(profile.id);

        this.identityService.deleteProfile(profile.id).subscribe({
            next: () => {
                this.profiles.set(this.profiles().filter((item) => item.id !== profile.id));
                this.deletingId.set(null);
                this.showSuccess('Profil supprimé avec succès.');
            },
            error: (error: HttpErrorResponse) => {
                this.deletingId.set(null);
                this.showError(error.error?.detail ?? 'Impossible de supprimer le profil.');
            }
        });
    }

    openDetail(profile: ProfileTableRow): void {
        this.showProfileAtIndex(this.rows().findIndex((item) => item.id === profile.id));
    }

    goToPreviousDetail(): void {
        if (!this.canGoPreviousDetail()) {
            return;
        }

        this.showProfileAtIndex(this.detailIndex() - 1);
    }

    goToNextDetail(): void {
        if (!this.canGoNextDetail()) {
            return;
        }

        this.showProfileAtIndex(this.detailIndex() + 1);
    }

    closeDetail(): void {
        this.detailDialogVisible.set(false);
        this.selectedProfile.set(null);
        this.selectedRoleIds.set([]);
        this.detailIndex.set(-1);
    }

    attachRoles(): void {
        const profile = this.selectedProfile();
        const roleIds = this.selectedRoleIds();

        if (!profile || !roleIds.length || this.attaching()) {
            return;
        }

        this.attaching.set(true);

        this.identityService.addRolesToProfile(profile.id, { role_ids: roleIds }).subscribe({
            next: () => {
                const addedNames = this.roles()
                    .filter((role) => roleIds.includes(role.id))
                    .map((role) => role.name);

                const updatedProfile: UserProfileResponse = {
                    ...profile,
                    roles: [...new Set([...(profile.roles ?? []), ...addedNames])].sort()
                };

                this.profiles.set(this.profiles().map((item) => (item.id === profile.id ? updatedProfile : item)));
                this.selectedProfile.set(updatedProfile);
                this.selectedRoleIds.set([]);
                this.attaching.set(false);
                this.showSuccess('Rôles ajoutés au profil.');
            },
            error: (error: HttpErrorResponse) => {
                this.attaching.set(false);
                this.showError(error.error?.detail ?? 'Impossible d\'ajouter les rôles.');
            }
        });
    }

    private showProfileAtIndex(index: number): void {
        const rows = this.rows();

        if (index < 0 || index >= rows.length) {
            return;
        }

        this.detailIndex.set(index);
        this.selectedProfile.set(rows[index]);
        this.selectedRoleIds.set([]);
        this.detailDialogVisible.set(true);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
