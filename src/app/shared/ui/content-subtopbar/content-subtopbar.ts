import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { PermissionMode, PermissionValue } from '@/app/core/permissions/permission.model';

export type SubtopbarAction = {
    label: string;
    icon?: string;
    severity?: 'secondary' | 'contrast' | 'success' | 'info' | 'warn' | 'help' | 'danger';
    outlined?: boolean;
    text?: boolean;
    routerLink?: string | string[];
    command?: () => void;
    disabled?: boolean;
    permissions?: readonly PermissionValue[];
    mode?: PermissionMode;
};

@Component({
    selector: 'app-content-subtopbar',
    standalone: true,
    imports: [CommonModule, RouterModule, ButtonModule],
    templateUrl: './content-subtopbar.html',
    styleUrl: './content-subtopbar.scss'
})

export class ContentSubtopbar {
    private readonly permissionService = inject(PermissionService);

    kicker = input('Module');
    title = input('Vue');
    actions = input<SubtopbarAction[]>([]);

    visibleActions = computed(() =>
        this.actions().filter((action) =>
            this.permissionService.canAccess({
                permissions: action.permissions,
                mode: action.mode
            })
        )
    );
}
