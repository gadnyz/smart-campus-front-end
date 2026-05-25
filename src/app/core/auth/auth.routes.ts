import { Routes } from '@angular/router';
import { Access } from './access';
import { Login } from './login';
import { Error } from './error';
import { guestGuard } from './guards/guest.guard';
import { forgetPassword } from './forget-password/forget-password';
import { ChangePassword } from './change-password/change-password';

export default [
    { path: 'access', component: Access },
    { path: 'error', component: Error },
    { path: 'login', component: Login, canActivate: [guestGuard] },
    { path: 'forget-password', component: forgetPassword, canActivate: [guestGuard] },
    { path: 'change-password', component: ChangePassword, canActivate: [guestGuard] }
] as Routes;
