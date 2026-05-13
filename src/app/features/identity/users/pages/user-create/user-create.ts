import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { RegisterRequest } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

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
    styleUrl: './user-create.scss',
})
export class UserCreate implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly usersService = inject(UsersService);
    private readonly router = inject(Router);

    readonly submitting = signal(false);
    readonly loadingProfiles = signal(false);
    readonly successMessage = signal('');
    readonly errorMessage = signal('');
    readonly validationErrors = signal<Record<string, string>>({});

    readonly profiles = signal<{ label: string; value: string }[]>([]);

    readonly form = this.fb.nonNullable.group({
        username: [
            '',
            [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(30),
            ]
        ],
        email: [
            '',
            [
                Validators.required,
                Validators.pattern(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
            ]
        ],
        profile: ['', Validators.required]
    });

    ngOnInit(): void {
        this.loadProfiles();
    }

    loadProfiles(): void {
        this.loadingProfiles.set(true);
        this.errorMessage.set('');

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
                    this.errorMessage.set('Session expirée ou non authentifiée.');
                    return;
                }

                if (error.status === 403) {
                    this.errorMessage.set('Accès refusé au chargement des profils.');
                    return;
                }

                this.errorMessage.set(error.error?.detail ?? `Impossible de charger les profils `);
            }

        });
    }

    isInvalid(controlName: 'username' | 'email' | 'profile'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    submit(): void {
        this.errorMessage.set('');
        this.successMessage.set('');
        this.validationErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: RegisterRequest = this.form.getRawValue();

        this.submitting.set(true);

        this.usersService.createUser(payload).subscribe({
            next: (response) => {
                this.successMessage.set(`Utilisateur ${response.username} créé avec succès.`);
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
                    this.errorMessage.set(error.error?.detail ?? 'La requête contient des champs non valides.');
                    this.validationErrors.set(error.error.invalid_fields);
                    return;
                }

                if (error.status === 409) {
                    this.errorMessage.set(error.error?.detail ?? 'Un utilisateur avec ces informations existe déjà.');
                    return;
                }

                if (error.status === 403) {
                    this.errorMessage.set(error.error?.detail ?? 'Tu n’as pas les privilèges nécessaires pour créer un utilisateur.');
                    return;
                }

                this.errorMessage.set(error.error?.detail ?? 'Une erreur est survenue lors de la création de l’utilisateur.');
            }
        });
    }

    cancel(): void {
        void this.router.navigate(['/identity/users']);
    }
}

