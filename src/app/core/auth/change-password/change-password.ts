import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { appBrand } from '@/app/core/config/app-brand';
import { AuthFooter } from "../auth-footer/auth-footer";

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [FormsModule, RouterModule, ButtonModule, PasswordModule, MessageModule, AuthFooter],
    templateUrl: './change-password.html',
    styleUrl: '../login.scss'
})
export class ChangePassword {
    brand = appBrand;

    password = '';
    confirmPassword = '';

    loading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    submit(form: HTMLFormElement): void {
        this.errorMessage.set('');
        this.successMessage.set('');

        if (!form.reportValidity()) {
            return;
        }

        if (this.password !== this.confirmPassword) {
            this.errorMessage.set('Les mots de passe ne correspondent pas.');
            return;
        }

        this.loading.set(true);

        // À brancher ensuite sur l’API de changement du mot de passe.
        setTimeout(() => {
            this.loading.set(false);
            this.successMessage.set('Votre mot de passe a été mis à jour.');
        }, 600);
    }
}
