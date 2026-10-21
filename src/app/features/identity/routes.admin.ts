import { Routes } from '@angular/router';
import { UserManagement } from './users/pages/user-management/user-management';
import { UserCreate } from './users/pages/user-create/user-create';
import { UserDetail } from './users/pages/user-detail/user-detail';
import { RoleManagement } from './pages/role-management/role-management';
import { ProfileManagement } from './pages/profile-management/profile-management';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { IdentityPermission } from './permissions/permission.model';

/**
 * Admin Identity screens mounted under /settings/identity.
 * Consulter suffit d'une autorité `read:all` ; les actions de chaque écran exigent create, update ou delete.
 */
export const identityAdminRoutes: Routes = [
    {
        path: 'users',
        component: UserManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserReadAll, IdentityPermission.UserUpdateAll],
            mode: 'any'
        }
    },
    {
        path: 'users/new',
        component: UserCreate,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserCreateAll],
            mode: 'any'
        }
    },
    {
        path: 'users/:id',
        component: UserDetail,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserReadAll, IdentityPermission.UserUpdateAll],
            mode: 'any'
        }
    },
    {
        path: 'roles',
        component: RoleManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.RoleReadAll, IdentityPermission.RoleUpdateAll],
            mode: 'any'
        }
    },
    {
        path: 'business-profiles',
        component: ProfileManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.ProfileReadAll, IdentityPermission.ProfileUpdateAll],
            mode: 'any'
        }
    },
    { path: '', redirectTo: 'users', pathMatch: 'full' }
];

export default identityAdminRoutes;
