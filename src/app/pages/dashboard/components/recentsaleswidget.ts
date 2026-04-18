import { Component } from '@angular/core';
import { RippleModule } from 'primeng/ripple';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-recent-sales-widget',
    imports: [CommonModule, TableModule, ButtonModule, RippleModule],
    template: `<div class="card mb-8!">
        <div class="font-semibold text-xl mb-4">Utilisateurs récents</div>
        <p-table [value]="users" [paginator]="true" [rows]="5" responsiveLayout="scroll">
            <ng-template #header>
                <tr>
                    <th>Photo</th>
                    <th pSortableColumn="name">Nom <p-sortIcon field="name"></p-sortIcon></th>
                    <th pSortableColumn="profile">Profil métier <p-sortIcon field="profile"></p-sortIcon></th>
                    <th pSortableColumn="status">Statut <p-sortIcon field="status"></p-sortIcon></th>
                    <th>Voir</th>
                </tr>
            </ng-template>
            <ng-template #body let-user>
                <tr>
                    <td style="width: 15%; min-width: 5rem;">
                        <img [src]="user.photo" [alt]="user.name" class="shadow-lg rounded-full object-cover" width="50" height="50" />
                    </td>
                    <td style="width: 35%; min-width: 10rem;">{{ user.name }}</td>
                    <td style="width: 30%; min-width: 10rem;">{{ user.profile }}</td>
                    <td style="width: 20%; min-width: 8rem;">{{ user.status }}</td>
                    <td style="width: 15%;">
                        <button pButton pRipple type="button" icon="pi pi-search" class="p-button p-component p-button-text p-button-icon-only"></button>
                    </td>
                </tr>
            </ng-template>
        </p-table>
    </div>`
})
export class RecentSalesWidget {
    users = [
        {
            name: 'Amina Diallo',
            profile: 'Assistant d’enseignement',
            status: 'Actif',
            photo: 'https://i.pravatar.cc/100?img=5'
        },
        {
            name: 'Jean Mbala',
            profile: 'SAF',
            status: 'Actif',
            photo: 'https://i.pravatar.cc/100?img=12'
        },
        {
            name: 'Claire Mbuyi',
            profile: 'Responsable de filière',
            status: 'En attente',
            photo: 'https://i.pravatar.cc/100?img=20'
        },
        {
            name: 'David Kanku',
            profile: 'Comptable',
            status: 'Actif',
            photo: 'https://i.pravatar.cc/100?img=33'
        },
        {
            name: 'Sarah Ilunga',
            profile: 'Administrateur',
            status: 'Suspendu',
            photo: 'https://i.pravatar.cc/100?img=47'
        }
    ];
}
