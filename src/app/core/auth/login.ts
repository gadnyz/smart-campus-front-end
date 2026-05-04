import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';

import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';
import { appBrand } from '@/app/core/config/app-brand';
import { AuthService } from './services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [MessageModule, ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RippleModule, AppFloatingConfigurator],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})

export class Login {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    brand = appBrand;
    email = '';
    password = '';
    checked = false;

    loading = signal(false);
    errorMessage = signal('');
    validationErrors = signal<Record<string, string>>({});

    private clearErrors(): void {
        this.errorMessage.set('');
        this.validationErrors.set({});
    }
    private resolveError(error: HttpErrorResponse): void {
        if (error.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur. Vérifie la connexion ou la configuration CORS.');
            return;
        }

        const apiError = error.error;

        if (error.status === 400 && apiError?.invalid_fields) {
            this.errorMessage.set(apiError.detail ?? apiError.title ?? 'La requête contient des champs non valides.');
            this.validationErrors.set(apiError.invalid_fields);
            return;
        }

        if (error.status === 401) {
            this.errorMessage.set(apiError?.detail ?? 'Email ou mot de passe invalide.');
            return;
        }

        if (error.status === 403) {
            this.errorMessage.set(apiError?.detail ?? 'Accès refusé.');
            return;
        }

        if (error.status >= 500) {
            this.errorMessage.set(apiError?.detail ?? 'Une erreur serveur est survenue. Réessaie plus tard.');
            return;
        }

        this.errorMessage.set(apiError?.detail ?? error.message ?? 'Une erreur est survenue lors de la connexion.');
    }

    submit(): void {
        this.clearErrors();
        this.loading.set(true);

        this.authService.login({
            email: this.email,
            password: this.password
        }).subscribe({
            next: (response) => {
                this.authService.storeToken(response.access_token);
                this.loading.set(false);
                void this.router.navigate(['/']);
            },
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.resolveError(error);
            }
        });
    }
}
