import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap, map, of, throwError } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { FileSelectEvent } from 'primeng/types/fileupload';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { UpdateUserRequest, User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        ButtonModule,
        FileUploadModule,
        InputTextModule,
        MessageModule,
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './user-profile.html',
    styleUrl: './user-profile.scss'
})
export class UserProfile implements OnInit, OnDestroy {
    @ViewChild('avatarUpload') avatarUpload?: FileUpload;

    private readonly location = inject(Location);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly usersService = inject(UsersService);

    private avatarPreviewObjectUrl: string | null = null;

    readonly user = signal<User | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly editing = signal(false);
    readonly errorMessage = signal('');
    readonly successMessage = signal('');
    readonly validationErrors = signal<Record<string, string>>({});
    readonly selectedAvatarFile = signal<File | null>(null);
    readonly avatarPreviewUrl = signal<string | null>(null);

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

    readonly avatarImageUrl = computed(() => this.avatarPreviewUrl() || this.user()?.avatar_url || '');

    readonly userInitial = computed(() => {
        const currentUser = this.user();
        const source = currentUser?.username || currentUser?.email || '';
        return source.charAt(0).toUpperCase();
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
        }
    ]);

    ngOnInit(): void {
        this.form.disable();
        this.loadCurrentUser();
    }

    ngOnDestroy(): void {
        this.revokeAvatarPreview();
    }

    loadCurrentUser(): void {
        const sessionUser = this.authService.getCurrentUser();

        if (!sessionUser?.id) {
            this.errorMessage.set('Session utilisateur introuvable. Reconnecte-toi pour charger ton profil.');
            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');

        this.usersService.getUserById(sessionUser.id).subscribe({
            next: (user) => {
                this.setLoadedUser(user);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.errorMessage.set(error.error?.detail ?? 'Impossible de charger ton profil.');
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
            this.clearAvatarSelection();
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
        const avatarFile = this.selectedAvatarFile();

        this.saving.set(true);

        this.usersService
            .updateUser(currentUser.id, payload)
            .pipe(
                switchMap((updatedUser) => {
                    if (!avatarFile) {
                        return of(updatedUser);
                    }

                    return this.uploadAvatar(avatarFile).pipe(
                        map((avatar) => ({
                            ...updatedUser,
                            avatar_url: avatar.public_url
                        }))
                    );
                }),
                switchMap((updatedUser) => {
                    const refreshToken = this.authService.getRefreshToken();

                    if (!refreshToken) {
                        return throwError(() => new Error('Refresh token introuvable.'));
                    }

                    return this.authService.refreshCurrentSession().pipe(
                        map((authResponse) => ({
                            updatedUser,
                            authResponse
                        }))
                    );
                })
            )
            .subscribe({
                next: ({ updatedUser, authResponse }) => {
                    this.authService.storeSession(authResponse);

                    this.setLoadedUser(updatedUser);
                    this.authService.updateCurrentUser(updatedUser);

                    this.editing.set(false);
                    this.form.disable();
                    this.clearAvatarSelection();
                    this.successMessage.set('Profil modifié avec succès.');
                    this.saving.set(false);
                },
                error: (error: HttpErrorResponse | Error) => {
                    this.saving.set(false);

                    if (error instanceof Error) {
                        this.errorMessage.set(error.message);
                        return;
                    }

                    if (error.status === 400 && error.error?.invalid_fields) {
                        this.errorMessage.set(error.error?.detail ?? 'La requête contient des champs non valides.');
                        this.validationErrors.set(error.error.invalid_fields);
                        return;
                    }

                    if (error.status === 409) {
                        this.errorMessage.set(error.error?.detail ?? 'Ces informations existent déjà.');
                        return;
                    }

                    if (error.status === 401) {
                        this.errorMessage.set('La session a expiré. Reconnecte-toi pour continuer.');
                        return;
                    }

                    this.errorMessage.set(error.error?.detail ?? 'Une erreur est survenue lors de la modification du profil.');
                }
            });
    }


    onAvatarSelect(event: FileSelectEvent): void {
        const file = event.files[0];

        if (!file) {
            return;
        }

        if (!['image/png', 'image/jpeg'].includes(file.type)) {
            this.errorMessage.set('Sélectionne une image PNG ou JPG.');
            return;
        }

        this.revokeAvatarPreview();
        this.selectedAvatarFile.set(file);

        const previewUrl = URL.createObjectURL(file);
        this.avatarPreviewObjectUrl = previewUrl;
        this.avatarPreviewUrl.set(previewUrl);
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

        void this.router.navigate(['/']);
    }

    private setLoadedUser(user: User): void {
        this.user.set(user);
        this.form.reset({
            username: user.username,
            email: user.email
        });
    }

    private uploadAvatar(file: File) {
        const extension = this.getFileExtension(file);

        return this.usersService.requestAvatarUploadUrl(extension).pipe(
            switchMap((uploadData) =>
                this.usersService.uploadAvatarFile(uploadData.upload_url, file).pipe(
                    switchMap(() =>
                        this.usersService.confirmAvatarUpload({
                            object_path: uploadData.object_path
                        })
                    )
                )
            )
        );
    }

    private getFileExtension(file: File): string {
        const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';

        if (extension) {
            return extension;
        }

        if (file.type === 'image/png') {
            return '.png';
        }

        if (file.type === 'image/jpeg') {
            return '.jpg';
        }

        return '.jpg';
    }

    private clearAvatarSelection(): void {
        this.selectedAvatarFile.set(null);
        this.avatarUpload?.clear();
        this.revokeAvatarPreview();
    }

    private revokeAvatarPreview(): void {
        if (this.avatarPreviewObjectUrl) {
            URL.revokeObjectURL(this.avatarPreviewObjectUrl);
            this.avatarPreviewObjectUrl = null;
        }

        this.avatarPreviewUrl.set(null);
    }
}
