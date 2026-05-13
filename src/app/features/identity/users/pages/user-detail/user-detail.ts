import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { UpdateUserRequest, User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

@Component({
    selector: 'app-user-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        CardModule,
        InputTextModule,
        MessageModule,
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './user-detail.html',
    styleUrl: './user-detail.scss'
})
export class UserDetail implements OnInit {
    private readonly location = inject(Location);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly fb = inject(FormBuilder);
    private readonly usersService = inject(UsersService);

    readonly user = signal<User | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly deleting = signal(false);
    readonly editing = signal(false);
    readonly errorMessage = signal('');
    readonly successMessage = signal('');
    readonly validationErrors = signal<Record<string, string>>({});

    readonly form = this.fb.nonNullable.group({
        username: [
            '',
            [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(30),
                Validators.pattern(/^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/)
            ]
        ],
        email: ['', [Validators.required, Validators.email]]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => this.goBack()
        },
        {
            label: this.editing() ? 'Annuler' : 'Modifier',
            icon: this.editing() ? 'pi pi-times' : 'pi pi-pencil',
            severity: this.editing() ? 'secondary' : 'info',
            outlined: this.editing(),
            command: () => this.toggleEdit()
        },
        {
            label: 'Supprimer',
            icon: 'pi pi-trash',
            severity: 'danger',
            outlined: true,
            command: () => this.deleteUser()
        }
    ]);

    ngOnInit(): void {
        this.form.disable();

        const userId = this.route.snapshot.paramMap.get('id');
        if (!userId) {
            this.errorMessage.set('Identifiant utilisateur introuvable.');
            return;
        }

        this.loadUser(userId);
    }

    loadUser(userId: string): void {
        this.loading.set(true);
        this.errorMessage.set('');

        this.usersService.getUserById(userId).subscribe({
            next: (user) => {
                this.user.set(user);
                this.form.reset({
                    username: user.username,
                    email: user.email
                });
                this.form.disable();
                this.loading.set(false);
            },
            error: (error) => {
                this.errorMessage.set(error.error?.detail ?? 'Impossible de charger l’utilisateur.');
                this.loading.set(false);
            }
        });
    }

    toggleEdit(): void {
        const currentUser = this.user();
        if (!currentUser) {
            return;
        }

        this.errorMessage.set('');
        this.successMessage.set('');
        this.validationErrors.set({});

        if (this.editing()) {
            this.editing.set(false);
            this.form.reset({
                username: currentUser.username,
                email: currentUser.email
            });
            this.form.disable();
            return;
        }

        this.editing.set(true);
        this.form.enable();
    }

    save(): void {
        const currentUser = this.user();
        if (!currentUser) {
            return;
        }

        this.errorMessage.set('');
        this.successMessage.set('');
        this.validationErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: UpdateUserRequest = this.form.getRawValue();

        this.saving.set(true);

        this.usersService.updateUser(currentUser.id, payload).subscribe({
            next: (updatedUser) => {
                this.user.set(updatedUser);
                this.form.reset({
                    username: updatedUser.username,
                    email: updatedUser.email
                });
                this.form.disable();
                this.editing.set(false);
                this.successMessage.set('Utilisateur modifié avec succès.');
                this.saving.set(false);
            },
            error: (error) => {
                this.saving.set(false);

                if (error.status === 400 && error.error?.invalid_fields) {
                    this.errorMessage.set(error.error?.detail ?? 'La requête contient des champs non valides.');
                    this.validationErrors.set(error.error.invalid_fields);
                    return;
                }

                if (error.status === 409) {
                    this.errorMessage.set(error.error?.detail ?? 'Ces informations existent déjà.');
                    return;
                }

                this.errorMessage.set(error.error?.detail ?? 'Une erreur est survenue lors de la modification.');
            }
        });
    }

    deleteUser(): void {
        const currentUser = this.user();
        if (!currentUser || this.deleting()) {
            return;
        }

        const confirmed = window.confirm(`Supprimer l'utilisateur ${currentUser.username} ?`);
        if (!confirmed) {
            return;
        }

        this.deleting.set(true);
        this.errorMessage.set('');

        this.usersService.deleteUser(currentUser.id).subscribe({
            next: () => {
                this.deleting.set(false);
                void this.router.navigate(['/identity/users']);
            },
            error: (error) => {
                this.deleting.set(false);
                this.errorMessage.set(error.error?.detail ?? 'Une erreur est survenue lors de la suppression.');
            }
        });
    }

    isInvalid(controlName: 'username' | 'email'): boolean {
        const control = this.form.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    statusLabel(user: User): string {
        return user.enabled ? 'Actif' : 'Inactif';
    }

    statusSeverity(user: User): 'success' | 'secondary' {
        return user.enabled ? 'success' : 'secondary';
    }

    goBack(): void {
        if (window.history.length > 1) {
            this.location.back();
            return;
        }

        void this.router.navigate(['/identity/users']);
    }
}
