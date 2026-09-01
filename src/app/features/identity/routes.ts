import { Routes } from '@angular/router';
import { UserProfile } from './users/pages/user-profile/user-profile';
import { Preferences } from './users/pages/preferences/preferences';
import { IdentityUserRedirect } from './pages/identity-user-redirect';
import { permissionGuard } from '@/app/core/permissions/permission.guard';
import { IdentityPermission } from './permissions/permission.model';

/** Personal account routes kept at /identity (topbar). Admin moved to /settings/identity. */
export default [
    {
        path: 'profile',
        component: UserProfile,
        canActivate: [permissionGuard],
        data: {
            permissions: [IdentityPermission.UserReadOwn, IdentityPermission.UserUpdateOwn],
            mode: 'any'
        }
    },
    { path: 'preferences', component: Preferences },
    { path: 'users/new', redirectTo: '/settings/identity/users/new', pathMatch: 'full' },
    { path: 'users/:id', component: IdentityUserRedirect },
    { path: 'users', redirectTo: '/settings/identity/users', pathMatch: 'full' },
    { path: 'roles', redirectTo: '/settings/identity/roles', pathMatch: 'full' },
    { path: 'privileges', redirectTo: '/settings/identity/privileges', pathMatch: 'full' },
    { path: 'business-profiles', redirectTo: '/settings/identity/business-profiles', pathMatch: 'full' },
    { path: '', redirectTo: 'profile', pathMatch: 'full' }
] as Routes;
