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

    private resolveError(error: HttpErrorResponse): void {
        const apiError = error.error;

        if (error.status === 0) {
            this.errorMessage.set('Le service de récupération de mot de passe est momentanément indisponible. Veuillez patienter puis réessayer.');
            return;
        }

        if (error.status === 400 && apiError?.invalid_fields) {
            this.errorMessage.set('Veuillez vérifier les informations saisies.');
            return;
        }

        if (error.status === 403) {
            this.successMessage.set('Si cette adresse email est associée à un compte, un lien de récupération vous sera envoyé.'); // Ceci est fais exprès pour eviter que les utilisateurs se mettent à tenter plusieurs mails
            return;
        }

        if (error.status === 429) {
            this.errorMessage.set('Trop de tentatives ont été effectuées. Veuillez patienter avant de réessayer.');
            return;
        }

        if ([500, 502, 503, 504].includes(error.status)) {
            this.errorMessage.set('Une erreur est survenue lors de l’envoi du lien de récupération. Veuillez réessayer plus tard.');
            return;
        }

        this.errorMessage.set('Impossible d’envoyer le lien de récupération pour le moment. Veuillez réessayer plus tard.');
    }

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
                    'Si cette adresse email est associée à un compte, un lien de récupération vous sera envoyé.'
                );
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.resolveError(error);
            }
        });
    }
}
