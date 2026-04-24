import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';

import { environment } from '@/environments/environment';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { RegisterRequest, RegisterResponse } from '../../models/user.model';

@Component({
    selector: 'app-user-create',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FluidModule,
        InputTextModule,
        SelectModule,
        ButtonModule,
        MessageModule,
        ContentSubtopbar
    ],
    templateUrl: './user-create.html',
    styleUrl:'./user-create.scss',
})
export class UserCreate {
    private readonly fb = inject(FormBuilder);
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    readonly submitting = signal(false);
    readonly successMessage = signal('');
    readonly errorMessage = signal('');

    readonly profiles = [
        { label: 'Administrateur', value: 'ADMIN' },
        { label: 'Étudiant', value: 'STUDENT' },
        { label: 'Professeur', value: 'TEACHER' },
        { label: 'Assistant', value: 'ASSISTANT' },
        { label: 'SAF', value: 'SAF' }
    ];

    readonly form = this.fb.nonNullable.group({
        username: [
            '',
            [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(30),
                Validators.pattern(/^[a-zA-Z0-9]([._-](?![._-])|[a-zA-Z0-9]){1,28}[a-zA-Z0-9]$/)
            ]
        ],
        email: ['', [Validators.required, Validators.email]],
        profile: ['', Validators.required]
    });

    isInvalid(controlName: 'username' | 'email' | 'profile'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        this.errorMessage.set('');
        this.successMessage.set('');

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: RegisterRequest = this.form.getRawValue();

        this.submitting.set(true);

        this.http
            .post<RegisterResponse>(`${environment.apiBaseUrl}/api/v1/auth/register`, payload)
            .pipe(finalize(() => this.submitting.set(false)))
            .subscribe({
                next: (response) => {
                    this.successMessage.set(`Utilisateur ${response.username} créé avec succès.`);
                    this.form.reset({
                        username: '',
                        email: '',
                        profile: ''
                    });
                },
                error: (error: HttpErrorResponse) => {
                    this.errorMessage.set(this.resolveErrorMessage(error));
                }
            });
    }

    cancel(): void {
        void this.router.navigate(['/identity/users']);
    }

    private resolveErrorMessage(error: HttpErrorResponse): string {
        if (error.status === 409) {
            return 'Un utilisateur avec ces informations existe déjà.';
        }

        if (error.status === 403) {
            return 'Tu n’as pas les privilèges nécessaires pour créer un utilisateur.';
        }

        if (error.status === 400) {
            return error.error?.detail ?? 'La requête est invalide.';
        }

        return error.error?.detail ?? 'Une erreur est survenue lors de la création de l’utilisateur.';
    }
}
