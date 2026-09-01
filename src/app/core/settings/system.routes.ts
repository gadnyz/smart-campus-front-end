import { Routes } from '@angular/router';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { IdentityPermission } from '@/app/features/identity/permissions/permission.model';
import { SystemSettingsPage } from './pages/system-settings/system-settings';

/** CORE system settings — mounted under /settings/system. */
export default [
    {
        path: '',
        component: SystemSettingsPage,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.ApiManage, IdentityPermission.UserUpdateAll],
            mode: 'any'
        }
    }
] as Routes;
