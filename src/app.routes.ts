import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Notfound } from './app/core/navigation/notfound';
import { authGuard } from './app/core/auth/guards/auth.guard';
import { Access } from './app/core/auth/access';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', component: Dashboard },
            { path: 'access-denied', component: Access },
            { path: 'identity', loadChildren: () => import('./app/features/identity/routes') }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/core/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
