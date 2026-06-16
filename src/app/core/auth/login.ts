import { Component, inject, signal, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { appBrand } from '@/app/core/config/app-brand';
import { AuthService } from './services/auth.service';
import { AuthFooter } from './auth-footer/auth-footer';
import { ActivatedRoute } from '@angular/router';
import { OnInit } from '@angular/core';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        MessageModule,
        ToastModule,
        ButtonModule,
        AuthFooter,
        CheckboxModule,
        InputTextModule,
        PasswordModule,
        FormsModule,
        RippleModule,
        RouterModule
    ],
    providers: [MessageService],
    templateUrl: './login.html',
    styleUrl: './login.scss'
})
export class Login implements AfterViewInit {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly messageService = inject(MessageService);

    brand = appBrand;
    email = '';
    password = '';
    checked = false;

    loading = signal(false);
    errorMessage = signal('');
    validationErrors = signal<Record<string, string>>({});

    private showSuccess(detail: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail,
            life: 3000
        });
    }

    ngAfterViewInit(): void {
        const reset = this.route.snapshot.queryParamMap.get('reset');

        if (reset === 'success') {
            setTimeout(() => {
                this.showSuccess('Votre mot de passe a été réinitialisé avec succès. Veuillez vous connecter.');

                setTimeout(() => {
                    void this.router.navigate([], {
                        relativeTo: this.route,
                        queryParams: {},
                        replaceUrl: true
                    });
                }, 300);
            });
        }
    }

    private clearErrors(): void {
        this.errorMessage.set('');
        this.validationErrors.set({});
    }
    private resolveError(error: HttpErrorResponse): void {

        if (error.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur.');
            return;
        }

        const apiError = error.error;

        if (error.status === 0) {
            this.errorMessage.set('Le service de connexion est momentanément indisponible. Veuillez patienter puis réessayer.');
            return;
        }

        if (error.status === 400 && apiError?.invalid_fields) {
            this.errorMessage.set('Veuillez vérifier les informations saisies.');
            this.validationErrors.set(apiError.invalid_fields);
            return;
        }

        if (error.status === 401) {
            this.errorMessage.set('Email ou mot de passe incorrect. Veuillez réessayer.');
            return;
        }

        if (error.status === 403) {
            this.errorMessage.set('Votre compte ne dispose pas des autorisations nécessaires pour accéder à la plateforme.');
            return;
        }

        if ([500, 502, 503, 504].includes(error.status)) {
            this.errorMessage.set('Une erreur est survenue lors de la connexion. Veuillez réessayer plus tard.');
            return;
        }

        this.errorMessage.set('Connexion impossible pour le moment. Veuillez réessayer plus tard.');
    }

    submit(form: HTMLFormElement): void {
        this.clearErrors();

        if (!form.reportValidity()) {
            return;
        }

        this.loading.set(true);

        this.authService
            .login({
                email: this.email.trim(),
                password: this.password
            })
            .subscribe({
                next: (response) => {
                    this.authService.storeSession(response);
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
