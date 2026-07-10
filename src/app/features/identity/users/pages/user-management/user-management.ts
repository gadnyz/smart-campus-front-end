import { Component } from '@angular/core';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { UserList } from '../../components/user-list/user-list';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [ContentSubtopbar, UserList],
    template: `
        <app-content-subtopbar kicker="Gestion des utilisateurs" title="Liste" [actions]="actions" />

        <app-user-list />
    `,
    styleUrl: 'user-management.scss'
})
export class UserManagement {
    actions: SubtopbarAction[] = [
        {
            label: 'Nouveau',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            routerLink: ['/identity/users/new'],
            permissions: [IdentityPermission.UserCreateAll],
            mode: 'any'
        }
    ];
}
