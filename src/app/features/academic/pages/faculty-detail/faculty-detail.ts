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
import { PermissionService } from '@/app/core/permissions/permission.service';
import { UsersService } from '@/app/features/identity/users/services/user.service';
import { AcademicPermission } from '../../permissions/permission.model';
import { Faculty, FacultyLeadership, FacultyLeadershipRole } from '../../models/faculty.model';
import { Program } from '../../models/program.model';
import { FacultyService } from '../../services/faculty.service';
import { ProgramService } from '../../services/program.service';
import { LevelService } from '../../services/level.service';
import { AcademicCatalogService } from '../../services/academic-catalog.service';

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
    private readonly academicCatalog = inject(AcademicCatalogService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly faculty = signal<Faculty | null>(null);
    readonly programs = signal<Program[]>([]);
    readonly leadership = signal<FacultyLeadership[]>([]);
    readonly loading = signal(false);
    readonly programDialogVisible = signal(false);
    readonly leadershipDialogVisible = signal(false);
    readonly savingProgram = signal(false);
    readonly savingLeadership = signal(false);
    readonly editingProgramId = signal<string | null>(null);

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

    readonly title = computed(() => {
        const faculty = this.faculty();
        return faculty ? `${faculty.code} — ${faculty.name}` : 'Faculté';
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => void this.router.navigate(['/academic/faculties'])
        }
    ]);

    readonly programForm = this.fb.nonNullable.group({
        code: ['', Validators.required],
        name: ['', Validators.required],
        level_ids: [[] as string[], Validators.required]
    });

    readonly leadershipForm = this.fb.nonNullable.group({
        user_id: [null as string | null, Validators.required],
        role: [null as FacultyLeadershipRole | null, Validators.required]
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            void this.router.navigate(['/academic/faculties']);
            return;
        }

        this.loadFaculty(id);
        this.levelService.getAll().subscribe({
            next: (levels) =>
                this.levelOptions.set(
                    levels.map((level) => ({ label: `${level.code} — ${level.name}`, value: level.id }))
                )
        });
    }

    openCreateProgram(): void {
        this.editingProgramId.set(null);
        this.programForm.reset({ code: '', name: '', level_ids: [] });
        this.programDialogVisible.set(true);
    }

    openEditProgram(program: Program): void {
        this.editingProgramId.set(program.id);
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
        const payload = {
            code: raw.code.trim(),
            name: raw.name.trim(),
            faculty_id: faculty.id,
            levels: raw.level_ids.map((level_id) => ({ level_id, is_common: false }))
        };
        const editingId = this.editingProgramId();
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
            error: (error: HttpErrorResponse) => {
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Faculté introuvable.');
                void this.router.navigate(['/academic/faculties']);
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

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}