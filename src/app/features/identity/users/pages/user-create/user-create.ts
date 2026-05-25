import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { RegisterRequest } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

@Component({
    selector: 'app-user-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FluidModule, InputTextModule, SelectModule, ButtonModule, ToastModule, ContentSubtopbar],
    templateUrl: './user-create.html',
    styleUrl: './user-create.scss',
    providers: [MessageService]
})
export class UserCreate implements OnInit {
    private readonly location = inject(Location);
    private readonly fb = inject(FormBuilder);
    private readonly usersService = inject(UsersService);
    private readonly router = inject(Router);
    private readonly messageService = inject(MessageService);

    readonly submitting = signal(false);
    readonly loadingProfiles = signal(false);
    readonly validationErrors = signal<Record<string, string>>({});

    readonly profiles = signal<{ label: string; value: string }[]>([]);

    readonly form = this.fb.nonNullable.group({
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30)]],
        email: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
        profile: ['', Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => this.goBack()
        }
    ]);

    ngOnInit(): void {
        this.loadProfiles();
    }

    loadProfiles(): void {
        this.loadingProfiles.set(true);
        this.validationErrors.set({});

        this.usersService.getProfiles().subscribe({
            next: (response) => {
                this.profiles.set(
                    response.content.map((profile) => ({
                        label: profile.name,
                        value: profile.name
                    }))
                );
                this.loadingProfiles.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.loadingProfiles.set(false);

                if (error.status === 401) {
                    this.showError('Session expirée ou non authentifiée.');
                    return;
                }

                if (error.status === 403) {
                    this.showError('Accès refusé au chargement des profils.');
                    return;
                }

                this.showError(error.error?.detail ?? 'Impossible de charger les profils.');
            }
        });
    }

    isInvalid(controlName: 'username' | 'email' | 'profile'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        this.validationErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.showWarning('Veuillez compléter correctement les champs obligatoires.');
            return;
        }

        const payload: RegisterRequest = this.form.getRawValue();

        this.submitting.set(true);

        this.usersService.createUser(payload).subscribe({
            next: (response) => {
                this.showSuccess(`Utilisateur ${response.username} créé avec succès.`);

                this.form.reset({
                    username: '',
                    email: '',
                    profile: ''
                });

                this.submitting.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.submitting.set(false);

                if (error.status === 400 && error.error?.invalid_fields) {
                    this.validationErrors.set(error.error.invalid_fields);
                    this.showError(error.error?.detail ?? 'La requête contient des champs non valides.');
                    return;
                }

                if (error.status === 409) {
                    this.showError(error.error?.detail ?? 'Un utilisateur avec ces informations existe déjà.');
                    return;
                }

                if (error.status === 403) {
                    this.showError(error.error?.detail ?? 'Tu n’as pas les privilèges nécessaires pour créer un utilisateur.');
                    return;
                }

                this.showError(error.error?.detail ?? 'Une erreur est survenue lors de la création de l’utilisateur.');
            }
        });
    }

    cancel(): void {
        void this.router.navigate(['/identity/users']);
    }

    goBack(): void {
        if (window.history.length > 1) {
            this.location.back();
            return;
        }

        void this.router.navigate(['/identity/users']);
    }

    private showSuccess(detail: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail,
            life: 3000
        });
    }

    private showError(detail: string): void {
        this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail,
            life: 3000
        });
    }

    private showWarning(detail: string): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Attention',
            detail,
            life: 3000
        });
    }
}
