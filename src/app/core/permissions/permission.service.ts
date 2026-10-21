import { Injectable, inject } from '@angular/core';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionCheck, PermissionMode, PermissionValue } from './permission.model';
import { PermissionScope, scopeRank, widestScope } from './permission-scope';

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

    /**
     * Portée la plus large détenue pour une autorité sans portée (`academic:student:read`) :
     * `all`, `faculty`, `program`, `promotion`, `own`, ou `null` si l'utilisateur ne l'a pas.
     */
    scopeOf(permission: PermissionValue): PermissionScope | null {
        return widestScope(this.getCurrentPermissions(), permission);
    }

    /** Vrai si l'utilisateur détient `permission` à une portée au moins égale à `minimum`. */
    hasScope(permission: PermissionValue, minimum: PermissionScope = 'own'): boolean {
        const scope = this.scopeOf(permission);
        return scope !== null && scopeRank(scope) >= scopeRank(minimum);
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