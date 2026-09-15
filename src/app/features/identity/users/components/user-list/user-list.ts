import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
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
    imports: [CommonModule, RouterModule, TableModule, ButtonModule, ToastModule, InputTextModule, IconFieldModule, InputIconModule],
    templateUrl: './user-list.html',
    styleUrl: './user-list.scss',
    providers: [MessageService]
})
export class UserList implements OnInit {
    private readonly usersService = inject(UsersService);
    private readonly messageService = inject(MessageService);
    private readonly detailNavigation = inject(DetailNavigationService);

    private readonly navigationScope = 'identity.users';
    private readonly pageSize = 100;

    readonly users = signal<User[]>([]);
    readonly loading = signal(false);

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

        this.usersService.getUsers({ page: 0, size: this.pageSize }).subscribe({
            next: (response) => {
                this.users.set(response.content);
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/settings/identity/users'],
                    page: response.page,
                    size: response.size,
                    totalElements: response.total_elements,
                    totalPages: response.total_pages,
                    items: response.content.map((user) => ({
                        id: user.id,
                        label: user.username
                    }))
                });
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

}
