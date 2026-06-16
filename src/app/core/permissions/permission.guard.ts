import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from './permission.service';
import { PermissionRouteData } from './permission.model';

export const permissionGuard: CanActivateFn = (route) => {
    const permissionService = inject(PermissionService);
    const router = inject(Router);

    const data = route.data as PermissionRouteData;

    const canAccess = permissionService.canAccess({
        permissions: data.permissions,
        mode: data.mode
    });

    if (canAccess) {
        return true;
    }

    return router.createUrlTree(['/access-denied']);
};