import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { computed } from '@angular/core';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Table, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, TableModule, ButtonModule, TagModule, ToastModule, ConfirmDialogModule, InputTextModule, IconFieldModule, InputIconModule],
    templateUrl: './user-list.html',
    styleUrl: './user-list.scss',
    providers: [ConfirmationService, MessageService]
})
export class UserList implements OnInit {
    private readonly usersService = inject(UsersService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);

    readonly canDeleteUsers = computed(() =>
        this.permissionService.hasAnyPermission([IdentityPermission.UserDelete,IdentityPermission.UserManage])
    );

    @ViewChild('dt') dt!: Table;

    users = signal<User[]>([]);
    loading = signal(false);

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

    exportCSV(): void {
        this.dt.exportCSV();
    }

    onGlobalFilter(table: Table, event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        table.filterGlobal(value, 'contains');
    }

    confirmDelete(user: User): void {
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

    private deleteUser(user: User): void {
        this.usersService.deleteUser(user.id).subscribe({
            next: () => {
                this.users.set(this.users().filter((item) => item.id !== user.id));

                this.messageService.add({
                    severity: 'success',
                    summary: 'Succès',
                    detail: 'Utilisateur supprimé avec succès.',
                    life: 3000
                });
            },
            error: (error) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Erreur',
                    detail: error.error?.detail ?? 'Une erreur est survenue lors de la suppression.',
                    life: 3000
                });
            }
        });
    }

    statusLabel(user: User): string {
        return user.enabled ? 'Actif' : 'Inactif';
    }

    statusSeverity(user: User): 'success' | 'secondary' {
        return user.enabled ? 'success' : 'secondary';
    }
}
