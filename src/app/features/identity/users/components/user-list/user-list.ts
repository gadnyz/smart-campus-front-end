import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { RouterLink } from '@angular/router';

type UserRow = {
    id: string;
    fullName: string;
    email: string;
    businessProfile: string;
    status: 'Actif' | 'Inactif' | 'En attente' | 'Suspendu';
    photo: string;
};

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
    templateUrl: './user-list.html',
    styleUrl: './user-list.scss',
})
export class UserList {
    users: UserRow[] = [
        {
            id: 'USR-001',
            fullName: 'Amina Diallo',
            email: 'amina.diallo@unh.edu',
            businessProfile: 'Assistant d’enseignement',
            status: 'Actif',
            photo: 'https://i.pravatar.cc/100?img=5'
        },
        {
            id: 'USR-002',
            fullName: 'Jean Mbala',
            email: 'jean.mbala@unh.edu',
            businessProfile: 'SAF',
            status: 'Actif',
            photo: 'https://i.pravatar.cc/100?img=12'
        },
        {
            id: 'USR-003',
            fullName: 'Claire Mbuyi',
            email: 'claire.mbuyi@unh.edu',
            businessProfile: 'Doyen',
            status: 'En attente',
            photo: 'https://i.pravatar.cc/100?img=20'
        },
        {
            id: 'USR-004',
            fullName: 'David Kanku',
            email: 'david.kanku@unh.edu',
            businessProfile: 'Comptable',
            status: 'Inactif',
            photo: 'https://i.pravatar.cc/100?img=33'
        },
        {
            id: 'USR-005',
            fullName: 'Sarah Ilunga',
            email: 'sarah.ilunga@unh.edu',
            businessProfile: 'Doyen',
            status: 'Suspendu',
            photo: 'https://i.pravatar.cc/100?img=47'
        }
    ];

    statusSeverity(status: UserRow['status']): 'success' | 'secondary' | 'warn' | 'danger' {
        switch (status) {
            case 'Actif':
                return 'success';
            case 'En attente':
                return 'warn';
            case 'Suspendu':
                return 'danger';
            default:
                return 'secondary';
        }
    }
}
