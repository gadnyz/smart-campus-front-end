import { Injectable, inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionCheck, PermissionMode, PermissionValue } from './permission.model';

@Injectable({
    providedIn: 'root'
})
export class PermissionService {
    private readonly authService = inject(AuthService);

    getCurrentPermissions(): readonly PermissionValue[] {
        return this.authService.getCurrentUser()?.authorities ?? [];
    }

    hasPermission(permission: PermissionValue): boolean {
        return this.getCurrentPermissions().includes(permission);
    }

    hasAnyPermission(permissions: readonly PermissionValue[]): boolean {
        if (!permissions.length) {
            return true;
        }

        return permissions.some((permission) => this.hasPermission(permission));
    }

    hasAllPermissions(permissions: readonly PermissionValue[]): boolean {
        if (!permissions.length) {
            return true;
        }

        return permissions.every((permission) => this.hasPermission(permission));
    }

    canAccess(check?: PermissionCheck): boolean {
        if (!check?.permissions?.length) {
            return true;
        }

        const mode: PermissionMode = check.mode ?? 'any';

        if (mode === 'all') {
            return this.hasAllPermissions(check.permissions);
        }

        return this.hasAnyPermission(check.permissions);
    }
}