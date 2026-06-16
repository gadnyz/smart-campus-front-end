import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { switchMap, map, of, finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { FileSelectEvent } from 'primeng/types/fileupload';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { UpdateUserRequest, User } from '../../models/user.model';
import { UsersService } from '../../services/user.service';
import { ElementRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PasswordModule } from 'primeng/password';

@Component({
    selector: 'app-user-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, FileUploadModule, InputTextModule, PasswordModule, ToastModule, TagModule, ContentSubtopbar],
    providers: [MessageService],
    templateUrl: './user-profile.html',
    styleUrl: './user-profile.scss'
})
export class UserProfile implements OnInit, OnDestroy {
    @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;
    private readonly messageService = inject(MessageService);
    private readonly location = inject(Location);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly usersService = inject(UsersService);
    readonly removingAvatar = signal(false);
    private avatarPreviewObjectUrl: string | null = null;
    readonly passwordSaving = signal(false);


    readonly user = signal<User | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly editing = signal(false);
    readonly validationErrors = signal<Record<string, string>>({});
    readonly selectedAvatarFile = signal<File | null>(null);
    readonly avatarPreviewUrl = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z][a-zA-Z0-9._-]{2,29}$/)]],
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

    readonly passwordForm = this.fb.nonNullable.group({
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

    ngOnInit(): void {
        this.form.disable();
        this.passwordForm.disable();
        this.loadCurrentUser();
    }

    ngOnDestroy(): void {
        this.revokeAvatarPreview();
    }

    loadCurrentUser(): void {
        const sessionUser = this.authService.getCurrentUser();

        if (!sessionUser?.id) {
            this.showSuccess('Session utilisateur introuvable. Reconnecte-toi pour charger ton profil.');
            return;
        }

        this.loading.set(true);

        this.usersService.getUserById(sessionUser.id).subscribe({
            next: (user) => {
                this.setLoadedUser(user);
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de charger ton profil.');
                this.loading.set(false);
            }
        });
    }

    submitPassword(): void {
        if (!this.editing()) {
            return;
        }

        if (this.passwordForm.invalid) {
            this.passwordForm.markAllAsTouched();
            return;
        }

        const formValue = this.passwordForm.getRawValue();

        if (formValue.new_password !== formValue.confirm_password) {
            this.showWarning('Les mots de passe ne correspondent pas.');
            return;
        }

        const refreshToken = this.authService.getRefreshToken();

        if (!refreshToken) {
            this.showError('Session expirée. Reconnecte-toi pour continuer.');
            return;
        }

        this.passwordSaving.set(true);

        this.authService
            .changeCurrentUserPassword({
                old_password: formValue.current_password,
                new_password: formValue.new_password,
                confirm_password: formValue.confirm_password,
                refresh_token: refreshToken
            })
            .pipe(finalize(() => this.passwordSaving.set(false)))
            .subscribe({
                next: () => {
                    this.passwordForm.reset();
                    this.passwordForm.disable();
                    this.form.disable();
                    this.editing.set(false);
                    this.clearAvatarSelection();
                    this.showSuccess('Mot de passe modifié avec succès.');
                },
                error: (error: HttpErrorResponse) => {
                    this.showError(error.error?.detail ?? 'Impossible de modifier le mot de passe.');
                }
            });
    }

    isPasswordInvalid(controlName: 'current_password' | 'new_password' | 'confirm_password'): boolean {
        const control = this.passwordForm.controls[controlName];
        return control.invalid && (control.dirty || control.touched);
    }

    toggleEdit(): void {
        const currentUser = this.user();

        if (!currentUser) {
            return;
        }

        this.validationErrors.set({});

        if (this.editing()) {
            this.editing.set(false);

            this.form.reset({
                username: currentUser.username,
                email: currentUser.email
            });

            this.passwordForm.reset();

            this.form.disable();
            this.passwordForm.disable();
            this.clearAvatarSelection();
            return;
        }

        this.editing.set(true);
        this.form.enable();
        this.passwordForm.enable();
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }

    private showWarning(detail: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Attention', detail, life: 3000 });
    }

    openAvatarPicker(): void {
        if (!this.editing() || this.saving()) {
            return;
        }

        this.avatarInput?.nativeElement.click();
    }

    onAvatarInputChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) {
            return;
        }

        this.selectAvatarFile(file);
        input.value = '';
    }

    removeAvatar(): void {
        const currentUser = this.user();

        if (!currentUser || this.removingAvatar()) {
            return;
        }

        this.removingAvatar.set(true);

        this.usersService.deleteCurrentUserAvatar().subscribe({
            next: () => {
                const updatedUser = {
                    ...currentUser,
                    avatar_url: null
                };

                this.setLoadedUser(updatedUser);
                this.authService.updateCurrentUser(updatedUser);
                this.clearAvatarSelection();
                this.showSuccess('Photo de profil supprimée avec succès.');
                this.removingAvatar.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer la photo de profil.');
                this.removingAvatar.set(false);
            }
        });
    }

    save(): void {
        const currentUser = this.user();

        if (!currentUser) {
            return;
        }

        this.validationErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const payload: UpdateUserRequest = this.form.getRawValue();
        const avatarFile = this.selectedAvatarFile();
        const usernameChanged = payload.username !== currentUser.username;

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
                })
            )
            .subscribe({
                next: (updatedUser) => {
                    this.setLoadedUser(updatedUser);
                    this.authService.updateCurrentUser(updatedUser);

                    this.editing.set(false);
                    this.form.disable();
                    this.clearAvatarSelection();
                    this.saving.set(false);

                    if (usernameChanged) {
                        this.showSuccess('Profil modifié avec succès. Reconnecte-toi pour continuer.');

                        setTimeout(() => {
                            this.authService.clearSession();
                            void this.router.navigate(['/auth/login']);
                        }, 1200);

                        return;
                    }

                    this.showSuccess('Profil modifié avec succès.');
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);

                    if (error.status === 400 && error.error?.invalid_fields) {
                        this.showError(error.error?.detail ?? 'La requête contient des champs non valides.');
                        this.validationErrors.set(error.error.invalid_fields);
                        return;
                    }

                    if (error.status === 409) {
                        this.showError(error.error?.detail ?? 'Ces informations existent déjà.');
                        return;
                    }

                    if (error.status === 401) {
                        this.showError('La session a expiré. Reconnecte-toi pour continuer.');
                        return;
                    }

                    this.showError(error.error?.detail ?? 'Une erreur est survenue lors de la modification du profil.');
                }
            });
    }

    onAvatarSelect(event: FileSelectEvent): void {
        const file = event.files[0];

        if (!file) {
            return;
        }

        this.selectAvatarFile(file);
    }

    private selectAvatarFile(file: File): void {
        const allowedMimeTypes = ['image/png', 'image/jpeg'];
        const allowedExtensions = ['.png', '.jpg'];

        const fileName = file.name.toLowerCase();
        const hasAllowedExtension = allowedExtensions.some((extension) => fileName.endsWith(extension));
        const hasAllowedMimeType = allowedMimeTypes.includes(file.type);

        if (!hasAllowedExtension || !hasAllowedMimeType) {
            this.showWarning('Sélectionne uniquement une image PNG ou JPG.');
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
        this.revokeAvatarPreview();

        if (this.avatarInput?.nativeElement) {
            this.avatarInput.nativeElement.value = '';
        }
    }
    private revokeAvatarPreview(): void {
        if (this.avatarPreviewObjectUrl) {
            URL.revokeObjectURL(this.avatarPreviewObjectUrl);
            this.avatarPreviewObjectUrl = null;
        }

        this.avatarPreviewUrl.set(null);
    }
}
