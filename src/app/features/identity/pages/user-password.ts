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
    template: `
        <p-toast />

        <app-content-subtopbar
            kicker="Compte utilisateur"
            title="Mot de passe"
            [actions]="actions()"
        />

        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 xl:col-span-8">
                <div class="card">
                    <div class="font-semibold text-xl mb-6">Modifier le mot de passe</div>

                    <form [formGroup]="form" class="grid grid-cols-12 gap-4" (ngSubmit)="submit()">
                        <div class="col-span-12 md:col-span-6">
                            <label for="current_password" class="block text-sm text-color-secondary mb-1">
                                Mot de passe actuel
                            </label>
                            <p-password
                                id="current_password"
                                formControlName="current_password"
                                [toggleMask]="true"
                                [feedback]="false"
                                [fluid]="true"
                            />
                            @if (isInvalid('current_password')) {
                                <small class="text-red-500 block mt-1">Le mot de passe actuel est obligatoire.</small>
                            }
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="new_password" class="block text-sm text-color-secondary mb-1">
                                Nouveau mot de passe
                            </label>
                            <p-password
                                id="new_password"
                                formControlName="new_password"
                                [toggleMask]="true"
                                [feedback]="true"
                                [fluid]="true"
                            />
                            @if (isInvalid('new_password')) {
                                <small class="text-red-500 block mt-1">Le nouveau mot de passe doit contenir au moins 8 caractères.</small>
                            }
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="confirm_password" class="block text-sm text-color-secondary mb-1">
                                Confirmation du mot de passe
                            </label>
                            <p-password
                                id="confirm_password"
                                formControlName="confirm_password"
                                [toggleMask]="true"
                                [feedback]="false"
                                [fluid]="true"
                            />
                            @if (isInvalid('confirm_password')) {
                                <small class="text-red-500 block mt-1">La confirmation est obligatoire.</small>
                            }
                        </div>

                        <div class="col-span-12 flex justify-end pt-2">
                            <button
                                pButton
                                type="submit"
                                label="Enregistrer"
                                icon="pi pi-save"
                                [loading]="saving()"
                                [disabled]="saving()"
                            ></button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `
})
export class UserPassword {
    private readonly location = inject(Location);
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);

    readonly saving = signal(false);

    readonly form = this.fb.nonNullable.group({
        current_password: ['', Validators.required],
        new_password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', Validators.required]
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

        const payload = this.form.getRawValue();

        if (payload.new_password !== payload.confirm_password) {
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