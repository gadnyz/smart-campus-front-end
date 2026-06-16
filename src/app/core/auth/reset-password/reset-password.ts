import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { appBrand } from '@/app/core/config/app-brand';
import { AuthFooter } from '../auth-footer/auth-footer';
import { AuthService } from '../services/auth.service';
import { DividerModule } from 'primeng/divider';

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [FormsModule, RouterModule, ButtonModule, DividerModule, PasswordModule, MessageModule, AuthFooter],
    templateUrl: './reset-password.html',
    styleUrl: '../login.scss'
})
export class ResetPassword implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);

    brand = appBrand;

    token = signal('');
    password = '';
    confirmPassword = '';

    loading = signal(false);
    errorMessage = signal('');
    successMessage = signal('');

    ngOnInit(): void {
        this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');

        if (!this.token()) {
            this.errorMessage.set('Le lien de réinitialisation est invalide ou incomplet.');
        }
    }

    private getPasswordValidationMessage(password: string): string | null {
        if (!/[a-z]/.test(password)) {
            return 'Le mot de passe doit contenir au moins une lettre minuscule.';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Le mot de passe doit contenir au moins une lettre majuscule.';
        }

        if (!/[0-9]/.test(password)) {
            return 'Le mot de passe doit contenir au moins un chiffre.';
        }

        if (!/[@$!%*?&]/.test(password)) {
            return 'Le mot de passe doit contenir au moins un caractère spécial accepté : @ $ ! % * ? & ';
        }

        if (password.length < 8) {
            return 'Le mot de passe doit contenir au minimum 8 caractères.';
        }

        if (password.length > 12) {
            return 'Le mot de passe ne doit pas dépasser 12 caractères.';
        }

        return null;
    }

    submit(form: HTMLFormElement): void {
        this.errorMessage.set('');
        this.successMessage.set('');

        if (!this.token()) {
            this.errorMessage.set('Le lien de réinitialisation est invalide ou incomplet.');
            return;
        }

        if (!form.reportValidity()) {
            return;
        }

        const passwordValidationMessage = this.getPasswordValidationMessage(this.password);

        if (passwordValidationMessage) {
            this.errorMessage.set(passwordValidationMessage);
            return;
        }

        if (this.password !== this.confirmPassword) {
            this.errorMessage.set('Les mots de passe ne correspondent pas.');
            return;
        }

        this.loading.set(true);

        this.authService.resetPassword({
            reset_password_token: this.token(),
            password: this.password,
            confirm_password: this.confirmPassword
        })
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: () => {
                    this.errorMessage.set('');
                    this.successMessage.set('');
                    this.password = '';
                    this.confirmPassword = '';

                    void this.router.navigate(['/auth/login'], {
                        queryParams: { reset: 'success' }
                    });
                },
                error: (error: HttpErrorResponse) => {
                    this.errorMessage.set(
                        error.error?.detail ?? 'Impossible de réinitialiser le mot de passe.'
                    );
                }
            });
    }
}