import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Notfound } from './app/core/navigation/notfound';
import { authGuard } from './app/core/auth/guards/auth.guard';
import { Access } from './app/core/auth/access';
import { appFeatureRoutes } from './app/core/modules/app-feature.registry';


export const appRoutes: Routes = [
    {
        path: 'apply',
        loadComponent: () =>
            import('./app/features/admission/pages/candidate-create/candidate-create').then((m) => m.CandidateCreate),
        data: { publicMode: true }
    },
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            { path: '', component: Dashboard },
            { path: 'access-denied', component: Access },
            ...appFeatureRoutes
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/core/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];
