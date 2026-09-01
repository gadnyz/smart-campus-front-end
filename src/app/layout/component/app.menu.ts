import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { PermissionAwareItem } from '@/app/core/permissions/permission.model';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AppMenuitem } from './app.menuitem';
import { FeatureMenuItem } from '@/app/core/modules/app-feature.model';
import { appMenuItems, appSettingsTabs } from '@/app/core/modules/app-feature.registry';

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
                @if (!item['separator']) {
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
        const hasSettingsAccess = appSettingsTabs.some((tab) =>
            this.permissionService.canAccess({
                permissions: tab.permissions,
                mode: tab.mode
            })
        );

        const menu: FeatureMenuItem[] = [
            {
                label: 'Tableau de bord',
                order: 0,
                items: [
                    {
                        label: 'Dashboard',
                        icon: 'pi pi-fw pi-home',
                        routerLink: ['/']
                    }
                ]
            },
            ...appMenuItems,
            ...(hasSettingsAccess
                ? [
                      {
                          label: 'Configuration',
                          order: 90,
                          items: [
                              {
                                  label: 'Paramètres',
                                  icon: 'pi pi-fw pi-cog',
                                  routerLink: ['/settings']
                              }
                          ]
                      } satisfies FeatureMenuItem
                  ]
                : [])
        ];

        this.model = this.filterMenu(menu);
    }

    private filterMenu(items: FeatureMenuItem[]): FeatureMenuItem[] {
        return items.reduce<AppMenuItem[]>((visibleItems, item) => {
            if (item['separator']) {
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
