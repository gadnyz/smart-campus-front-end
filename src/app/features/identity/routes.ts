import { Routes } from '@angular/router';
import { UserManagement } from './users/pages/user-management/user-management';
import { UserCreate } from './users/pages/user-create/user-create';
import { UserDetail } from './users/pages/user-detail/user-detail';
import { IdentityPlaceholder } from './pages/identity-placeholder/identity-placeholder';

export default [
    { path: 'users', component: UserManagement },
    { path: 'users/new', component: UserCreate },
    { path: 'users/:id', component: UserDetail },

    { path: 'roles', component: IdentityPlaceholder, data: { title: 'Rôles' } },
    { path: 'privileges', component: IdentityPlaceholder, data: { title: 'Privilèges' } },
    { path: 'business-profiles', component: IdentityPlaceholder, data: { title: 'Profils métier' } },
    { path: 'profile', component: IdentityPlaceholder, data: { title: 'Mon profil' } },
    { path: 'preferences', component: IdentityPlaceholder, data: { title: 'Préférences' } },

    { path: '', redirectTo: 'users', pathMatch: 'full' }
] as Routes;
