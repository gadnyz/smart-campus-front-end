import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';

import { User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

type UserTableRow = User & {
    profilesLabel: string;
};

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, ToastModule, ConfirmDialogModule, InputTextModule, IconFieldModule, InputIconModule],
    templateUrl: './user-list.html',
    styleUrl: './user-list.scss',
    providers: [ConfirmationService, MessageService]
})
export class UserList implements OnInit {
    private readonly usersService = inject(UsersService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);

    readonly users = signal<User[]>([]);
    readonly loading = signal(false);
    readonly deletingUserId = signal<string | null>(null);

    readonly canDeleteUsers = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserDeleteAll])
    );

    readonly rows = computed<UserTableRow[]>(() =>
        this.users().map((user) => ({
            ...user,
            profilesLabel: this.formatProfiles(user)
        }))
    );

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        this.loading.set(true);

        this.usersService.getUsers({ page: 0, size: 100 }).subscribe({
            next: (response) => {
                this.users.set(response.content);
                this.loading.set(false);
            },
            error: () => {
                this.users.set([]);
                this.loading.set(false);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: 'Impossible de charger les utilisateurs.',
                    life: 3000
                });
            }
        });
    }

    formatProfiles(user: User): string {
        return user.profiles?.length ? user.profiles.join(', ') : 'Sans profil';
    }

    onGlobalFilter(table: Table, event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        table.filterGlobal(value, 'contains');
    }

    confirmDelete(user: UserTableRow): void {
        this.confirmationService.confirm({
            message: `Voulez-vous vraiment supprimer l'utilisateur ${user.username} ?`,
            header: 'Confirmation',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deleteUser(user)
        });
    }

    private deleteUser(user: UserTableRow): void {
        if (this.deletingUserId()) {
            return;
        }

        this.deletingUserId.set(user.id);

        this.usersService.deleteUser(user.id).subscribe({
            next: () => {
                this.users.set(this.users().filter((item) => item.id !== user.id));
                this.deletingUserId.set(null);

                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: 'Utilisateur supprimé avec succès.',
                    life: 3000
                });
            },
            error: (error) => {
                this.deletingUserId.set(null);

                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error.error?.detail ?? 'Une erreur est survenue lors de la suppression.',
                    life: 3000
                });
            }
        });
    }
}