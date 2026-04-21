import { Component } from '@angular/core';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { UserList } from '../../components/user-list/user-list';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [ContentSubtopbar, UserList],
    template: `
        <app-content-subtopbar
            kicker="Identity"
            title="Gestion des utilisateurs"
            [actions]="actions"
        />

        <app-user-list />
    `,
    styleUrl : 'user-management.scss',
})
export class UserManagement {
    actions: SubtopbarAction[] = [
        {
            label: 'Exporter',
            icon: 'pi pi-download',
            severity: 'secondary',
            outlined: true,
            command: () => this.exportUsers()
        },
        {
            label: 'Filtrer',
            icon: 'pi pi-filter',
            severity: 'secondary',
            outlined: true,
            command: () => this.openFilters()
        },
        {
            label: 'Nouveau',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            routerLink: ['/identity/users/new']
        }
    ];

    exportUsers(): void {
        console.log('export users');
    }

    openFilters(): void {
        console.log('open filters');
    }
}
