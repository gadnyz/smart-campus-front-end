import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { AcademicPermission } from '../../permissions/permission.model';
import { Faculty, FacultyLeadership, FacultyLeadershipRole } from '../../models/faculty.model';
import { Program, ProgramLevel } from '../../models/program.model';
import { FacultyService } from '../../services/faculty.service';
import { ProgramService } from '../../services/program.service';
import { LevelService } from '../../services/level.service';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import {
    DetailNavigationService,
    DetailNavigationState
} from '@/app/shared/navigation/detail-navigation.service';

@Component({
    selector: 'app-faculty-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        SelectModule,
        MultiSelectModule,
        TagModule,
        ContentSubtopbar
    ],
    templateUrl: './faculty-detail.html',
    providers: [ConfirmationService, MessageService]
})
export class FacultyDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly facultyService = inject(FacultyService);
    private readonly programService = inject(ProgramService);
    private readonly levelService = inject(LevelService);
    private readonly usersService = inject(UsersService);
    private readonly authService = inject(AuthService);
    private readonly academicCatalog = inject(AcademicCatalogService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly navigationScope = 'academic.faculties';

    readonly faculty = signal<Faculty | null>(null);
    readonly programs = signal<Program[]>([]);
    readonly leadership = signal<FacultyLeadership[]>([]);
    readonly loading = signal(false);
    readonly programDialogVisible = signal(false);
    readonly leadershipDialogVisible = signal(false);
    readonly savingProgram = signal(false);
    readonly savingLeadership = signal(false);
    readonly savingFaculty = signal(false);
    readonly facultyDialogVisible = signal(false);
    readonly editingProgramId = signal<string | null>(null);
    readonly editingProgramLevels = signal<ProgramLevel[]>([]);
    readonly navigationState = signal<DetailNavigationState | null>(null);

    readonly levelOptions = signal<{ label: string; value: string }[]>([]);
    readonly userOptions = signal<{ label: string; value: string }[]>([]);

    readonly roleOptions: { label: string; value: FacultyLeadershipRole }[] = [
        { label: 'Doyen', value: 'DEAN' },
        { label: 'Vice-doyen', value: 'VICE_DEAN' },
        { label: 'SAF', value: 'SAF' }
    ];

    readonly canUpdatePrograms = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.ProgramUpdateAll])
    );

    readonly canCreatePrograms = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.ProgramCreateAll])
    );

    readonly canDeletePrograms = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.ProgramDeleteAll])
    );

    readonly canManageLeadership = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.FacultyUpdateAll])
    );

    readonly canShowProgramActions = computed(
        () => this.canUpdatePrograms() || this.canDeletePrograms()
    );

    readonly canShowLeadershipActions = computed(() => this.canManageLeadership());

    readonly title = computed(() => {
        const faculty = this.faculty();
        const name = faculty ? `${faculty.code} — ${faculty.name}` : 'Faculté';
        const position = this.navigationState()?.label;

        return position ? `${name} (${position})` : name;
    });

    readonly canGoPrevious = computed(() => this.navigationState()?.hasPrevious ?? false);
    readonly canGoNext = computed(() => this.navigationState()?.hasNext ?? false);

    readonly facultyForm = this.fb.nonNullable.group({
        code: ['', Validators.required],
        name: ['', Validators.required]
    });



    readonly programForm = this.fb.nonNullable.group({
        code: ['', Validators.required],
        name: ['', Validators.required],
        level_ids: [[] as string[], Validators.required]
    });

    readonly leadershipForm = this.fb.nonNullable.group({
        user_id: [null as string | null, Validators.required],
        role: [null as FacultyLeadershipRole | null, Validators.required]
    });

    readonly ownFaculty = signal(false);

    readonly actions = computed<SubtopbarAction[]>(() => {
        if (this.ownFaculty() || !this.permissionService.hasAnyPermission([AcademicPermission.FacultyReadAll])) {
            return [];
        }

        return [
            {
                label: 'Liste',
                icon: 'pi pi-list',
                severity: 'secondary',
                outlined: false,
                command: () => void this.router.navigate(['/academic/faculties'])
            },
            {
                label: 'Précédent',
                icon: 'pi pi-chevron-left',
                severity: 'secondary',
                disabled: !this.canGoPrevious() || this.loading(),
                command: () => this.goToPreviousFaculty()
            },
            {
                label: 'Suivant',
                icon: 'pi pi-chevron-right',
                severity: 'secondary',
                disabled: !this.canGoNext() || this.loading(),
                command: () => this.goToNextFaculty()
            },
            {
                label: 'Modifier',
                icon: 'pi pi-pencil',
                command: () => this.openEditFaculty(),
                permissions: [AcademicPermission.FacultyUpdateAll]
            },
            {
                label: 'Supprimer',
                icon: 'pi pi-trash',
                severity: 'danger',
                outlined: true,
                command: () => this.confirmDeleteFaculty(),
                permissions: [AcademicPermission.FacultyDeleteAll]
            }
        ];
    });

    ngOnInit(): void {
        const ownFaculty = this.route.snapshot.data['ownFaculty'] === true;
        this.ownFaculty.set(ownFaculty);

        this.levelService.getAll().subscribe({
            next: (levels) =>
                this.levelOptions.set(
                    levels.map((level) => ({ label: `${level.code} — ${level.name}`, value: level.id }))
                )
        });

        if (ownFaculty) {
            this.loadOwnFaculty();
            return;
        }

        this.route.paramMap.subscribe((params) => {
            const id = params.get('id');

            if (!id) {
                this.goToNotFound();
                return;
            }

            this.syncNavigation(id);
            this.loadFaculty(id);
        });
    }

    private loadOwnFaculty(): void {
        const session = this.authService.getCurrentUser();

        if (!session?.id) {
            this.goToNotFound();
            return;
        }

        this.loading.set(true);

        this.usersService.getUserById(session.id).subscribe({
            next: (user) => this.resolveOwnFaculty(session.id, user.faculty_id ?? session.faculty_id),
            error: () => this.resolveOwnFaculty(session.id, session.faculty_id)
        });
    }

    private resolveOwnFaculty(userId: string, facultyId?: string | null): void {
        this.facultyService.resolveAttachedFaculty(userId, facultyId).subscribe({
            next: (faculty) => {
                if (!faculty) {
                    this.loading.set(false);
                    this.goToNotFound();
                    return;
                }

                this.faculty.set(faculty);
                this.loading.set(false);
                this.loadPrograms(faculty.id);
                this.loadLeadership(faculty.id);
            },
            error: () => {
                this.loading.set(false);
                this.goToNotFound();
            }
        });
    }


    openCreateProgram(): void {
        this.editingProgramId.set(null);
        this.editingProgramLevels.set([]);
        this.programForm.reset({ code: '', name: '', level_ids: [] });
        this.programDialogVisible.set(true);
    }

    openEditProgram(program: Program): void {
        this.editingProgramId.set(program.id);
        this.editingProgramLevels.set(program.levels ?? []);
        this.programForm.reset({
            code: program.code,
            name: program.name,
            level_ids: (program.levels ?? []).map((item) => item.level.id)
        });
        this.programDialogVisible.set(true);
    }

    submitProgram(): void {
        const faculty = this.faculty();

        if (!faculty || this.programForm.invalid) {
            this.programForm.markAllAsTouched();
            return;
        }

        const raw = this.programForm.getRawValue();
        const editingId = this.editingProgramId();
        const existingByLevelId = new Map(
            this.editingProgramLevels().map((item) => [item.level.id, item])
        );
        const payload = {
            code: raw.code.trim(),
            name: raw.name.trim(),
            faculty_id: faculty.id,
            levels: raw.level_ids.map((level_id) => ({
                level_id,
                is_common: existingByLevelId.get(level_id)?.is_common ?? false
            }))
        };
        this.savingProgram.set(true);

        const request$ = editingId
            ? this.programService.update(editingId, payload)
            : this.programService.create(payload);

        request$.subscribe({
            next: () => {
                this.savingProgram.set(false);
                this.programDialogVisible.set(false);
                this.academicCatalog.invalidatePrograms();
                this.loadPrograms(faculty.id);
                this.showSuccess(editingId ? 'Programme modifié.' : 'Programme créé.');
            },
            error: (error: HttpErrorResponse) => {
                this.savingProgram.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’enregistrer le programme.');
            }
        });
    }

    confirmDeleteProgram(program: Program): void {
        this.confirmationService.confirm({
            header: 'Supprimer le programme',
            message: `Supprimer ${program.code} — ${program.name} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deleteProgram(program)
        });
    }

    openAssignLeadership(): void {
        this.leadershipForm.reset({ user_id: null, role: null });
        this.leadershipDialogVisible.set(true);

        if (!this.userOptions().length) {
            this.usersService.getUsers({ page: 0, size: 100, sort: ['username,asc'] }).subscribe({
                next: (page) =>
                    this.userOptions.set(
                        (page.content ?? []).map((user) => ({
                            label: `${user.username} (${user.email})`,
                            value: user.id
                        }))
                    ),
                error: (error: HttpErrorResponse) => {
                    this.showError(
                        error.status === 403
                            ? 'Permission identity:user:read:all requise pour assigner un staff.'
                            : 'Impossible de charger les utilisateurs.'
                    );
                }
            });
        }
    }

    submitLeadership(): void {
        const faculty = this.faculty();

        if (!faculty || this.leadershipForm.invalid) {
            this.leadershipForm.markAllAsTouched();
            return;
        }

        const raw = this.leadershipForm.getRawValue();
        this.savingLeadership.set(true);

        this.facultyService
            .assignLeadership(faculty.id, {
                user_id: raw.user_id as string,
                role: raw.role as FacultyLeadershipRole
            })
            .subscribe({
                next: () => {
                    this.savingLeadership.set(false);
                    this.leadershipDialogVisible.set(false);
                    this.loadLeadership(faculty.id);
                    this.showSuccess('Rôle de direction assigné.');
                },
                error: (error: HttpErrorResponse) => {
                    this.savingLeadership.set(false);
                    this.showError(error.error?.detail ?? 'Impossible d’assigner ce rôle.');
                }
            });
    }

    confirmRevoke(item: FacultyLeadership): void {
        this.confirmationService.confirm({
            header: 'Retirer le rôle',
            message: `Retirer ${item.role_label ?? item.role} de ${item.user_name} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Retirer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.revoke(item)
        });
    }

    roleLabel(role: string): string {
        return this.roleOptions.find((item) => item.value === role)?.label ?? role;
    }

    private loadFaculty(id: string): void {
        this.loading.set(true);

        this.facultyService.getById(id).subscribe({
            next: (faculty) => {
                this.faculty.set(faculty);
                this.loading.set(false);
                this.loadPrograms(id);
                this.loadLeadership(id);
            },
            error: () => {
                this.loading.set(false);
                this.goToNotFound();
            }
        });
    }

    private loadPrograms(facultyId: string): void {
        this.programService.getByFaculty(facultyId).subscribe({
            next: (programs) => this.programs.set(programs),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les programmes.')
        });
    }

    private loadLeadership(facultyId: string): void {
        this.facultyService.getLeadership(facultyId).subscribe({
            next: (items) => this.leadership.set(items.filter((item) => item.active !== false)),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger la direction.')
        });
    }

    private deleteProgram(program: Program): void {
        this.programService.delete(program.id).subscribe({
            next: () => {
                this.academicCatalog.invalidatePrograms();
                const faculty = this.faculty();
                if (faculty) {
                    this.loadPrograms(faculty.id);
                }
                this.showSuccess(`Programme ${program.code} supprimé.`);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer ce programme.');
            }
        });
    }

    private revoke(item: FacultyLeadership): void {
        const faculty = this.faculty();

        if (!faculty) {
            return;
        }

        this.facultyService.revokeLeadership(faculty.id, item.id).subscribe({
            next: () => {
                this.loadLeadership(faculty.id);
                this.showSuccess('Rôle retiré.');
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de retirer ce rôle.');
            }
        });
    }

    private goToNotFound(): void {
        void this.router.navigate(['/notfound']);
    }

    openEditFaculty(): void {
        const faculty = this.faculty();

        if (!faculty) {
            return;
        }

        this.facultyForm.reset({ code: faculty.code, name: faculty.name });
        this.facultyDialogVisible.set(true);
    }

    submitFaculty(): void {
        const faculty = this.faculty();

        if (!faculty || this.facultyForm.invalid) {
            this.facultyForm.markAllAsTouched();
            return;
        }

        const raw = this.facultyForm.getRawValue();
        this.savingFaculty.set(true);

        this.facultyService
            .update(faculty.id, { code: raw.code.trim(), name: raw.name.trim() })
            .subscribe({
                next: (updated) => {
                    this.savingFaculty.set(false);
                    this.facultyDialogVisible.set(false);
                    this.faculty.set(updated);
                    this.academicCatalog.invalidateFaculties();
                    this.refreshNavigationLabel(updated);
                    this.showSuccess(`Faculté ${updated.code} modifiée.`);
                },
                error: (error: HttpErrorResponse) => {
                    this.savingFaculty.set(false);
                    this.showError(error.error?.detail ?? 'Impossible de modifier la faculté.');
                }
            });
    }

    confirmDeleteFaculty(): void {
        const faculty = this.faculty();

        if (!faculty) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Supprimer la faculté',
            message: `Supprimer ${faculty.code} — ${faculty.name} ?`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.deleteFaculty(faculty)
        });
    }

    private deleteFaculty(faculty: Faculty): void {
        this.facultyService.delete(faculty.id).subscribe({
            next: () => {
                this.academicCatalog.invalidateFaculties();
                this.showSuccess(`Faculté ${faculty.code} supprimée.`);
                void this.router.navigate(['/academic/faculties']);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer cette faculté.');
            }
        });
    }

    private syncNavigation(id: string): void {
        const state = this.detailNavigation.getState(this.navigationScope, id);
        this.navigationState.set(state);

        if (state) {
            return;
        }

        this.facultyService.getAll().subscribe({
            next: (faculties) => {
                const sorted = [...faculties].sort((a, b) => a.name.localeCompare(b.name));
                this.detailNavigation.setContext({
                    scope: this.navigationScope,
                    listRoute: ['/academic/faculties'],
                    page: 0,
                    size: sorted.length,
                    totalElements: sorted.length,
                    totalPages: 1,
                    items: sorted.map((item) => ({
                        id: item.id,
                        label: `${item.code} — ${item.name}`
                    }))
                });
                this.navigationState.set(this.detailNavigation.getState(this.navigationScope, id));
            }
        });
    }

    private refreshNavigationLabel(faculty: Faculty): void {
        const context = this.detailNavigation.getContext(this.navigationScope);

        if (!context) {
            this.syncNavigation(faculty.id);
            return;
        }

        this.detailNavigation.setContext({
            ...context,
            items: context.items.map((item) =>
                item.id === faculty.id ? { id: faculty.id, label: `${faculty.code} — ${faculty.name}` } : item
            )
        });
        this.navigationState.set(this.detailNavigation.getState(this.navigationScope, faculty.id));
    }

    private goToPreviousFaculty(): void {
        const state = this.navigationState();

        if (!state?.hasPrevious) {
            return;
        }

        const previous = state.context.items[state.localIndex - 1];

        if (previous) {
            void this.router.navigate(['/academic/faculties', previous.id]);
        }
    }

    private goToNextFaculty(): void {
        const state = this.navigationState();

        if (!state?.hasNext) {
            return;
        }

        const next = state.context.items[state.localIndex + 1];

        if (next) {
            void this.router.navigate(['/academic/faculties', next.id]);
        }
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}