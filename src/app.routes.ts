import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Notfound } from './app/core/navigation/notfound';
import { UserManagement } from './app/features/identity/users/pages/user-management/user-management';


export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
             { path: 'identity', loadChildren: () => import('./app/features/identity/routes') }
            // { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/core/auth/auth.routes') },


    //
    // { path: 'identity', loadChildren: () => import('./app/features/identity/routes') },
    { path: '**', redirectTo: '/notfound' }
];
