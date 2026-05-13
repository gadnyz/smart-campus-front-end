import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';

import { User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
    templateUrl: './user-list.html',
    styleUrl: './user-list.scss'
})
export class UserList implements OnInit {
    private readonly usersService = inject(UsersService);

    users = signal<User[]>([]);
    loading = signal(false);

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        this.loading.set(true);

        this.usersService.getUsers({ page: 0, size: 10, sort: ['createdAt,desc']}).subscribe({
            next: (response) => {
                this.users.set(response.content);
                this.loading.set(false);
            },
            error: () => {
                this.users.set([]);
                this.loading.set(false);
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
