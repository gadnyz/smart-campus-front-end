import { Routes } from '@angular/router';
import { UserManagement } from './users/pages/user-management/user-management';
import { UserCreate } from './users/pages/user-create/user-create';
import { UserDetail } from './users/pages/user-detail/user-detail';
import { UserProfile } from './users/pages/user-profile/user-profile';
import { RoleManagement } from './pages/role-management/role-management';
import { PrivilegeManagement } from './pages/privilege-management/privilege-management';
import { ProfileManagement } from './pages/profile-management/profile-management';
import { Preferences } from './users/pages/preferences/preferences';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { IdentityPermission } from './permissions/permission.model';

export default [
    {
        path: 'users',
        component: UserManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserReadAll],
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
            permissions: [IdentityPermission.UserReadAll],
            mode: 'any'
        }
    },
    {
        path: 'roles',
        component: RoleManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.RoleReadAll],
            mode: 'any'
        }
    },
    {
        path: 'privileges',
        component: PrivilegeManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.PrivilegeReadAll],
            mode: 'any'
        }
    },
    {
        path: 'business-profiles',
        component: ProfileManagement,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.ProfileReadAll],
            mode: 'any'
        }
    },
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
