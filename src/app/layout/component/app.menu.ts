import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Tableau de bord',
                items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
            },
            {
                label: 'Paramètres administrateur',
                items: [
                    { label: 'Gestion des utilisateurs', icon: 'pi pi-fw pi-users', routerLink: ['/identity/users'] },
                    { label: 'Rôles', icon: 'pi pi-fw pi-id-card', routerLink: ['/identity/roles'] },
                    { label: 'Privilèges', icon: 'pi pi-fw pi-lock', routerLink: ['/identity/privileges'] },
                    { label: 'Profils métier', icon: 'pi pi-fw pi-briefcase', routerLink: ['/identity/business-profiles'] },
                    { label: 'Mon profil', icon: 'pi pi-fw pi-user', routerLink: ['/identity/profile'] }
                ]
            },
            {
                label: 'Profile utilisateur',
                items: [
                    { label: 'Mon profile', icon: 'pi pi-fw pi-user', routerLink: ['/identity/profile'] },
                    { label: 'Préférences', icon: 'pi pi-fw pi-cog', routerLink: ['/identity/preferences'] }
                ]
            }
        ];

    }
}
