import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import {
    DetailNavigationService,
    DetailNavigationState
} from '@/app/shared/navigation/detail-navigation.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '../../../permissions/permission.model';
import { PrivilegeResponse } from '../../../models/identity-management.model';
import { IdentityManagementService } from '../../../services/identity-management.service';
import { UpdateUserRequest, User, UserProfileResponse } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

type ProfileOption = {
    label: string;
    value: string;
};

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        InputTextModule,
        SelectModule,
        MultiSelectModule,
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './user-detail.html',
    providers: [ConfirmationService, MessageService]
})
export class UserDetail implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly usersService = inject(UsersService);
    private readonly identityService = inject(IdentityManagementService);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    private readonly navigationScope = 'identity.users';

    readonly user = signal<User | null>(null);
    readonly allProfiles = signal<UserProfileResponse[]>([]);
    readonly allPrivileges = signal<PrivilegeResponse[]>([]);
    readonly loading = signal(false);
    readonly loadingPrivileges = signal(false);
    readonly saving = signal(false);
    readonly togglingStatus = signal(false);
    readonly assigningProfile = signal(false);
    readonly removingProfileName = signal<string | null>(null);
    readonly grantingPrivilege = signal(false);
    readonly revokingPrivilegeName = signal<string | null>(null);
    readonly editing = signal(false);
    readonly validationErrors = signal<Record<string, string>>({});
    readonly selectedProfileId = signal<string | null>(null);
    readonly selectedPrivilegeIds = signal<string[]>([]);
    readonly navigationState = signal<DetailNavigationState | null>(null);

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserUpdateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserDeleteAll])
    );

    readonly canManagePrivileges = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserUpdateAll])
    );

    readonly profileNameToId = computed(() => {
        const map = new Map<string, string>();

        for (const profile of this.allProfiles()) {
            map.set(profile.name, profile.id);
        }

        return map;
    });

    readonly privilegeNameToId = computed(() => {
        const map = new Map<string, string>();

        for (const privilege of this.allPrivileges()) {
            map.set(privilege.name, privilege.id);
        }

        return map;
    });

    readonly assignableProfiles = computed<ProfileOption[]>(() => {
        const assigned = new Set(this.user()?.profiles ?? []);

        return this.allProfiles()
            .filter((profile) => !assigned.has(profile.name))
            .map((profile) => ({
                label: profile.name,
                value: profile.id
            }));
    });

    readonly grantablePrivileges = computed(() => {
        const authorities = new Set(this.user()?.authorities ?? []);

        return this.allPrivileges()
            .filter((privilege) => !authorities.has(privilege.name))
            .map((privilege) => ({
                label: privilege.name,
                value: privilege.id
            }));
    });

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);
    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    readonly form = this.fb.nonNullable.group({
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/)]],
        email: ['', [Validators.required, Validators.email]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Liste',
            icon: 'pi pi-list',
            severity: 'secondary',
            outlined: false,
            command: () => this.goToList()
        },
        {
            label: 'Précédent',
            icon: 'pi pi-chevron-left',
            severity: 'secondary',
            disabled: !this.canGoPrevious() || this.loading(),
            command: () => this.goToPreviousUser()
        },
        {
            label: 'Suivant',
            icon: 'pi pi-chevron-right',
            severity: 'secondary',
            disabled: !this.canGoNext() || this.loading(),
            command: () => this.goToNextUser()
        },
        ...(this.canUpdate()
            ? [
                  {
                      label: this.editing() ? 'Annuler' : 'Modifier',
                      icon: this.editing() ? 'pi pi-times' : 'pi pi-pencil',
                      severity: (this.editing() ? 'secondary' : 'info') as 'secondary' | 'info',
                      outlined: this.editing(),
                      command: () => this.toggleEdit()
                  }
              ]
            : [])
    ]);

    ngOnInit(): void {
        this.form.disable();
        this.loadProfiles();
        this.loadPrivileges();

        this.route.paramMap.subscribe((params) => {
            const userId = params.get('id');

            if (userId) {
                this.navigationState.set(this.detailNavigation.getState(this.navigationScope, userId));
                this.loadUser(userId);
            }
        });
    }

    loadProfiles(): void {
        this.usersService.getProfiles({ page: 0, size: 200, sort: ['name,asc'] }).subscribe({
            next: (response) => this.allProfiles.set(response.content),
            error: () => this.allProfiles.set([])
        });
    }

    loadPrivileges(): void {
        this.loadingPrivileges.set(true);

        this.identityService.getAllPrivileges().subscribe({
            next: (privileges) => {
                this.allPrivileges.set(privileges);
                this.loadingPrivileges.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.allPrivileges.set([]);
                this.loadingPrivileges.set(false);

                if (error.status === 403) {
                    this.showError(
                        'Accès refusé : permission identity:privilege:read:all requise pour gérer les privilèges.'
                    );
                    return;
                }

                this.showError(error.error?.detail ?? 'Impossible de charger les privilèges.');
            }
        });
    }

    loadUser(userId: string): void {
        this.loading.set(true);
        this.validationErrors.set({});
        this.editing.set(false);
        this.selectedPrivilegeIds.set([]);
        this.selectedProfileId.set(null);

        this.usersService.getUserById(userId).subscribe({
            next: (user) => {
                this.setUser(user);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.user.set(null);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger l\'utilisateur.');
            }
        });
    }

    toggleEdit(): void {
        const currentUser = this.user();

        if (!currentUser) {
            return;
        }

        this.validationErrors.set({});

        if (this.editing()) {
            this.editing.set(false);
            this.form.reset({
                username: currentUser.username,
                email: currentUser.email
            });
            this.form.disable();
            return;
        }

        this.editing.set(true);
        this.form.enable();
    }

    save(): void {
        const currentUser = this.user();

        if (!currentUser || this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: UpdateUserRequest = this.form.getRawValue();
        this.saving.set(true);
        this.validationErrors.set({});

        this.usersService.updateUser(currentUser.id, payload).subscribe({
            next: (updatedUser) => {
                this.setUser(updatedUser);
                this.editing.set(false);
                this.form.disable();
                this.saving.set(false);
                this.showSuccess('Utilisateur mis à jour avec succès.');
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);

                if (error.status === 400 && error.error?.invalid_fields) {
                    this.validationErrors.set(error.error.invalid_fields);
                }

                this.showError(error.error?.detail ?? 'Impossible de mettre à jour l\'utilisateur.');
            }
        });
    }

    enableUser(): void {
        this.toggleUserStatus(true);
    }

    disableUser(): void {
        this.toggleUserStatus(false);
    }

    private toggleUserStatus(enable: boolean): void {
        const currentUser = this.user();

        if (!currentUser || this.togglingStatus()) {
            return;
        }

        this.togglingStatus.set(true);

        const request$ = enable
            ? this.usersService.enableUser(currentUser.id)
            : this.usersService.disableUser(currentUser.id);

        request$.subscribe({
            next: () => {
                this.setUser({ ...currentUser, enabled: enable });
                this.togglingStatus.set(false);
                this.showSuccess(enable ? 'Utilisateur activé.' : 'Utilisateur désactivé.');
            },
            error: (error: HttpErrorResponse) => {
                this.togglingStatus.set(false);
                this.showError(error.error?.detail ?? 'Impossible de modifier le statut.');
            }
        });
    }

    assignProfile(): void {
        const currentUser = this.user();
        const profileId = this.selectedProfileId();

        if (!currentUser || !profileId || this.assigningProfile()) {
            return;
        }

        const profileName = this.allProfiles().find((profile) => profile.id === profileId)?.name;

        if (!profileName) {
            return;
        }

        this.assigningProfile.set(true);

        this.usersService.assignProfile(currentUser.id, profileId).subscribe({
            next: () => {
                this.selectedProfileId.set(null);
                this.assigningProfile.set(false);
                this.showSuccess('Profil assigné avec succès.');
                this.reloadUserAuthorities(currentUser.id);
            },
            error: (error: HttpErrorResponse) => {
                this.assigningProfile.set(false);
                this.showError(error.error?.detail ?? 'Impossible d\'assigner le profil.');
            }
        });
    }

    removeProfile(profileName: string): void {
        const currentUser = this.user();
        const profileId = this.profileNameToId().get(profileName);

        if (!currentUser || !profileId || this.removingProfileName()) {
            return;
        }

        this.removingProfileName.set(profileName);

        this.usersService.removeProfile(currentUser.id, profileId).subscribe({
            next: () => {
                this.removingProfileName.set(null);
                this.showSuccess('Profil retiré avec succès.');
                this.reloadUserAuthorities(currentUser.id);
            },
            error: (error: HttpErrorResponse) => {
                this.removingProfileName.set(null);
                this.showError(error.error?.detail ?? 'Impossible de retirer le profil.');
            }
        });
    }

    grantPrivileges(): void {
        const currentUser = this.user();
        const privilegeIds = this.selectedPrivilegeIds();

        if (!currentUser || !privilegeIds.length || this.grantingPrivilege()) {
            return;
        }

        this.grantingPrivilege.set(true);

        const grantNext = (index: number): void => {
            if (index >= privilegeIds.length) {
                this.grantingPrivilege.set(false);
                this.selectedPrivilegeIds.set([]);
                this.showSuccess('Privilège(s) accordé(s).');
                this.reloadUserAuthorities(currentUser.id);
                return;
            }

            this.usersService.grantPrivilege(currentUser.id, privilegeIds[index]).subscribe({
                next: () => grantNext(index + 1),
                error: (error: HttpErrorResponse) => {
                    this.grantingPrivilege.set(false);
                    this.showError(error.error?.detail ?? 'Impossible d\'accorder le privilège.');
                    this.reloadUserAuthorities(currentUser.id);
                }
            });
        };

        grantNext(0);
    }

    confirmRevokePrivilege(authority: string): void {
        const privilegeId = this.privilegeNameToId().get(authority);

        if (!privilegeId) {
            this.showError('Impossible de révoquer : privilège introuvable dans le catalogue.');
            return;
        }

        this.confirmationService.confirm({
            message: `Révoquer le privilège ${authority} pour cet utilisateur ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Révoquer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.revokePrivilege(authority, privilegeId)
        });
    }

    privilegeIdFor(authority: string): string | undefined {
        return this.privilegeNameToId().get(authority);
    }

    confirmDelete(): void {
        const currentUser = this.user();

        if (!currentUser) {
            return;
        }

        this.confirmationService.confirm({
            message: `Voulez-vous vraiment supprimer l'utilisateur ${currentUser.username} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deleteUser(currentUser.id)
        });
    }

    private revokePrivilege(authority: string, privilegeId: string): void {
        const currentUser = this.user();

        if (!currentUser || this.revokingPrivilegeName()) {
            return;
        }

        this.revokingPrivilegeName.set(authority);

        this.usersService.revokePrivilege(currentUser.id, privilegeId).subscribe({
            next: () => {
                this.revokingPrivilegeName.set(null);
                this.showSuccess('Privilège révoqué.');
                this.reloadUserAuthorities(currentUser.id);
            },
            error: (error: HttpErrorResponse) => {
                this.revokingPrivilegeName.set(null);
                this.showError(error.error?.detail ?? 'Impossible de révoquer le privilège.');
            }
        });
    }

    private reloadUserAuthorities(userId: string): void {
        this.usersService.getUserById(userId).subscribe({
            next: (user) => this.setUser(user),
            error: () => undefined
        });
    }

    private deleteUser(userId: string): void {
        this.usersService.deleteUser(userId).subscribe({
            next: () => {
                this.showSuccess('Utilisateur supprimé avec succès.');
                void this.router.navigate(['/identity/users']);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer l\'utilisateur.');
            }
        });
    }

    isInvalid(controlName: 'username' | 'email'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    statusLabel(user: User): string {
        return user.enabled ? 'Actif' : 'Inactif';
    }

    statusSeverity(user: User): 'success' | 'secondary' {
        return user.enabled ? 'success' : 'secondary';
    }

    goToList(): void {
        const route = this.navigationState()?.context.listRoute ?? ['/identity/users'];
        void this.router.navigate(route);
    }

    goToPreviousUser(): void {
        const state = this.navigationState();

        if (!state?.hasPrevious) {
            return;
        }

        const previous = state.context.items[state.localIndex - 1];

        if (previous) {
            void this.router.navigate(['/identity/users', previous.id]);
        }
    }

    goToNextUser(): void {
        const state = this.navigationState();

        if (!state?.hasNext) {
            return;
        }

        const next = state.context.items[state.localIndex + 1];

        if (next) {
            void this.router.navigate(['/identity/users', next.id]);
        }
    }

    goBack(): void {
        if (window.history.length > 1) {
            this.location.back();
            return;
        }

        void this.router.navigate(['/identity/users']);
    }

    private setUser(user: User): void {
        this.user.set(user);
        this.form.reset({
            username: user.username,
            email: user.email
        });

        if (!this.editing()) {
            this.form.disable();
        }
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
