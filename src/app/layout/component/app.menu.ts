import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { PermissionAwareItem } from '@/app/core/permissions/permission.model';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { AppMenuitem } from './app.menuitem';

type AppMenuItem = MenuItem &
    PermissionAwareItem & {
        items?: AppMenuItem[];
    };

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
        <ul class="layout-menu">
            @for (item of model; track item.label) {
                @if (!item.separator) {
                    <li app-menuitem [item]="item" [root]="true"></li>
                } @else {
                    <li class="menu-separator"></li>
                }
            }
        </ul>
    `
})
export class AppMenu implements OnInit {
    private readonly permissionService = inject(PermissionService);

    model: AppMenuItem[] = [];

    ngOnInit(): void {
        const menu: AppMenuItem[] = [
            {
                label: 'Tableau de bord',
                items: [
                    {
                        label: 'Dashboard',
                        icon: 'pi pi-fw pi-home',
                        routerLink: ['/']
                    }
                ]
            },
            {
                label: 'Identité',
                items: [
                    {
                        label: 'Utilisateurs',
                        icon: 'pi pi-fw pi-users',
                        routerLink: ['/identity/users'],
                        permissions: [IdentityPermission.UserReadAll]
                    },
                    // {
                    //     label: 'Rôles',
                    //     icon: 'pi pi-fw pi-shield',
                    //     routerLink: ['/identity/roles'],
                    //     permissions: [IdentityPermission.RoleRead]
                    // },
                    // {
                    //     label: 'Privilèges',
                    //     icon: 'pi pi-fw pi-key',
                    //     routerLink: ['/identity/privileges'],
                    //     permissions: [IdentityPermission.PrivilegeRead]
                    // },
                    // {
                    //     label: 'Profils métier',
                    //     icon: 'pi pi-fw pi-id-card',
                    //     routerLink: ['/identity/business-profiles'],
                    //     permissions: [IdentityPermission.ProfileRead]
                    // }
                ]
            }
        ];

        this.model = this.filterMenu(menu);
    }

    private filterMenu(items: AppMenuItem[]): AppMenuItem[] {
        return items.reduce<AppMenuItem[]>((visibleItems, item) => {
            if (item.separator) {
                visibleItems.push(item);
                return visibleItems;
            }

            const hasAccess = this.permissionService.canAccess({
                permissions: item.permissions,
                mode: item.mode
            });

            if (!hasAccess) {
                return visibleItems;
            }

            const filteredChildren = item.items ? this.filterMenu(item.items) : undefined;

            if (item.items && !filteredChildren?.length) {
                return visibleItems;
            }

            visibleItems.push({
                ...item,
                items: filteredChildren
            });

            return visibleItems;
        }, []);
    }
}