import { Routes } from '@angular/router';
import { UserManagement } from './users/pages/user-management/user-management';
import { UserCreate } from './users/pages/user-create/user-create';
import { UserDetail } from './users/pages/user-detail/user-detail';
import { UserProfile } from './users/pages/user-profile/user-profile';
import { IdentityPlaceholder } from './pages/identity-placeholder/identity-placeholder';
import { Preferences } from './users/pages/preferences/preferences';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { IdentityPermission } from './permissions/permission.model';
import { UserPassword } from './pages/user-password';
export default [
    {
        path: 'users',
        component: UserManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserRead, IdentityPermission.UserManage],
            mode: 'any'
        }
    },
    {
        path: 'users/new',
        component: UserCreate,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserCreate, IdentityPermission.UserManage],
            mode: 'any'
        }
    },
    {
        path: 'users/:id',
        component: UserDetail,
        canActivate: [permissionGuard],
        data: {
            permissions: [
                IdentityPermission.UserRead,
                IdentityPermission.UserReadOwn
            ],
            mode: 'any'
        }
    },
    {
        path: 'roles',
        component: IdentityPlaceholder,
        canActivate: [permissionGuard],
        data: {
            title: 'Rôles',
            permissions: [IdentityPermission.RoleRead],
            mode: 'any'
        }
    },
    {
        path: 'privileges',
        component: IdentityPlaceholder,
        canActivate: [permissionGuard],
        data: {
            title: 'Privilèges',
            permissions: [IdentityPermission.PrivilegeRead],
            mode: 'any'
        }
    },
    { path: 'business-profiles', component: IdentityPlaceholder, data: { title: 'Profils métier' } },
    {
        path: 'profile',
        component: UserProfile,
        canActivate: [permissionGuard],
        data: {
            permissions: [
                IdentityPermission.UserReadOwn,
                IdentityPermission.UserUpdateOwn
            ],
            mode: 'any'
        }
    },
    
    { path: 'preferences', component: Preferences },

    { path: '', redirectTo: 'users', pathMatch: 'full' }
] as Routes;
