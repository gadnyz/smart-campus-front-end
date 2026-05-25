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

@Component({
    selector: 'app-change-password',
    standalone: true,
    imports: [FormsModule, RouterModule, ButtonModule, PasswordModule, MessageModule, AuthFooter],
    templateUrl: './change-password.html',
    styleUrl: '../login.scss'
})
export class ChangePassword implements OnInit {
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
                    this.successMessage.set('Votre mot de passe a été mis à jour.');
                    this.password = '';
                    this.confirmPassword = '';

                    setTimeout(() => {
                        void this.router.navigate(['/auth/login']);
                    }, 1200);
                },
                error: (error: HttpErrorResponse) => {
                    this.errorMessage.set(
                        error.error?.detail ?? 'Impossible de réinitialiser le mot de passe.'
                    );
                }
            });
    }
}