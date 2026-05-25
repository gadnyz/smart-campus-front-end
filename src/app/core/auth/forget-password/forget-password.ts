import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { appBrand } from '@/app/core/config/app-brand';
import { AuthFooter } from '../auth-footer/auth-footer';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-forget-password',
    standalone: true,
    imports: [FormsModule, RouterModule, ButtonModule, InputTextModule, MessageModule, AuthFooter],
    templateUrl: './forget-password.html',
    styleUrl: '../login.scss'
})
export class forgetPassword {
    private readonly authService = inject(AuthService);

    brand = appBrand;

    email = '';
    loading = signal(false);
    successMessage = signal('');
    errorMessage = signal('');


    submit(form: HTMLFormElement): void {
        this.successMessage.set('');
        this.errorMessage.set('');

        if (!form.reportValidity()) {
            return;
        }

        this.loading.set(true);

        this.authService.forgotPassword({ email: this.email.trim() }).subscribe({
            next: () => {
                this.loading.set(false);
                this.successMessage.set(
                    "Si cette adresse existe, un lien de récupération sera envoyé."
                );
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.errorMessage.set(
                    error.error?.detail ?? "Impossible d'envoyer le lien de récupération."
                );
            }
        });
    }
}
