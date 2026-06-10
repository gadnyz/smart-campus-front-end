import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AuthService } from '@/app/core/auth/services/auth.service';

@Component({
    selector: 'app-user-password',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, PasswordModule, ToastModule, ContentSubtopbar],
    providers: [MessageService],
    templateUrl :'user-password.html'
})
export class UserPassword {
    private readonly location = inject(Location);
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);

    readonly saving = signal(false);

    readonly form = this.fb.nonNullable.group({
        current_password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16)]],
        new_password: [
            '',
            [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(16),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/)
            ]
        ],
        confirm_password: [
            '',
            [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(16),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/)
            ]
        ]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => this.location.back()
        }
    ]);

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const formValue = this.form.getRawValue();
        const refreshToken = this.authService.getRefreshToken();

        if (!refreshToken) {
            this.showError('Session expirée. Reconnecte-toi pour continuer.');
            return;
        }

        const payload = {
            old_password: formValue.current_password,
            new_password: formValue.new_password,
            confirm_password: formValue.confirm_password,
            refresh_token: refreshToken
        };

        if (formValue.new_password !== formValue.confirm_password) {
            this.showWarning('Les mots de passe ne correspondent pas.');
            return;
        }

        this.saving.set(true);

        this.authService
            .changeCurrentUserPassword(payload)
            .pipe(finalize(() => this.saving.set(false)))
            .subscribe({
                next: () => {
                    this.form.reset();
                    this.showSuccess('Mot de passe modifié avec succès.');
                },
                error: (error: HttpErrorResponse) => {
                    this.showError(error.error?.detail ?? 'Impossible de modifier le mot de passe.');
                }
            });
    }

    isInvalid(controlName: 'current_password' | 'new_password' | 'confirm_password'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showWarning(detail: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Attention', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }
}