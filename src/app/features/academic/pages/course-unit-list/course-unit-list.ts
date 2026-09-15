import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AcademicPermission } from '../../permissions/permission.model';
import { CourseUnit, KnowledgeSkillsBloc, UE_BLOC_OPTIONS } from '../../models/course-unit.model';
import { Faculty } from '../../models/faculty.model';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';

@Component({
    selector: 'app-course-unit-list',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputTextModule,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './course-unit-list.html',
    providers: [ConfirmationService, MessageService]
})
export class CourseUnitListPage implements OnInit {
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly facultyService = inject(FacultyService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly units = signal<CourseUnit[]>([]);
    readonly faculties = signal<Faculty[]>([]);
    readonly selectedFacultyId = signal<string | null>(null);
    readonly scopedFacultyId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly dialogVisible = signal(false);
    readonly editingId = signal<string | null>(null);

    readonly blocOptions = UE_BLOC_OPTIONS;

    readonly canReadAll = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUnitReadAll])
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUnitUpdateAll])
    );

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUnitDeleteAll])
    );

    readonly dialogTitle = computed(() => (this.editingId() ? 'Modifier l’UE' : 'Nouvelle UE'));

    readonly facultyOptions = computed(() =>
        this.faculties().map((faculty) => ({
            label: `${faculty.code} — ${faculty.name}`,
            value: faculty.id
        }))
    );

    readonly form = this.fb.nonNullable.group({
        faculty_id: [null as string | null, Validators.required],
        code: ['', Validators.required],
        knowledge_skills_bloc: [null as KnowledgeSkillsBloc | null, Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouvelle UE',
            icon: 'pi pi-plus',
            severity: 'info',
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.CourseUnitCreateAll]
        }
    ]);

    ngOnInit(): void {
        if (this.canReadAll()) {
            this.facultyService.getAll().subscribe({
                next: (faculties) =>
                    this.faculties.set([...faculties].sort((a, b) => a.name.localeCompare(b.name)))
            });
            return;
        }

        this.resolveOwnFaculty();
    }

    onGlobalFilter(table: Table, event: Event): void {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    onFacultyFilterChange(facultyId: string | null): void {
        this.selectedFacultyId.set(facultyId);
        this.load();
    }

    openDetail(unit: CourseUnit): void {
        void this.router.navigate(['/academic/course-units', unit.id]);
    }

    openCreateDialog(): void {
        this.editingId.set(null);
        this.form.reset({
            faculty_id: this.scopedFacultyId() ?? this.selectedFacultyId(),
            code: '',
            knowledge_skills_bloc: null
        });
        this.dialogVisible.set(true);
    }

    openEditDialog(unit: CourseUnit): void {
        this.editingId.set(unit.id);
        this.form.reset({
            faculty_id: unit.faculty_id,
            code: unit.code,
            knowledge_skills_bloc: unit.knowledge_skills_bloc
        });
        this.dialogVisible.set(true);
    }

    closeDialog(): void {
        this.dialogVisible.set(false);
        this.editingId.set(null);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const raw = this.form.getRawValue();
        const payload = {
            code: raw.code.trim(),
            knowledge_skills_bloc: raw.knowledge_skills_bloc as KnowledgeSkillsBloc,
            faculty_id: raw.faculty_id as string
        };
        const editingId = this.editingId();
        this.saving.set(true);

        const request$ = editingId
            ? this.courseUnitService.update(editingId, payload)
            : this.courseUnitService.create(payload);

        request$.subscribe({
            next: (unit) => {
                this.saving.set(false);
                this.dialogVisible.set(false);
                this.editingId.set(null);
                this.selectedFacultyId.set(unit.faculty_id);
                this.load();
                this.showSuccess(editingId ? `UE ${unit.code} modifiée.` : `UE ${unit.code} créée.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’enregistrer l’UE.');
            }
        });
    }

    confirmDelete(unit: CourseUnit): void {
        this.confirmationService.confirm({
            header: 'Supprimer l’UE',
            message: `Supprimer ${unit.code} ? Les cours rattachés doivent d’abord être déplacés.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.delete(unit)
        });
    }

    blocLabel(bloc: string): string {
        return this.blocOptions.find((item) => item.value === bloc)?.label ?? bloc;
    }

    private delete(unit: CourseUnit): void {
        this.courseUnitService.delete(unit.id).subscribe({
            next: () => {
                this.load();
                this.showSuccess(`UE ${unit.code} supprimée.`);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer cette UE.');
            }
        });
    }

    private resolveOwnFaculty(): void {
        const session = this.authService.getCurrentUser();

        if (!session?.id) {
            void this.router.navigate(['/notfound']);
            return;
        }

        this.facultyService.resolveAttachedFaculty(session.id, session.faculty_id).subscribe({
            next: (faculty) => {
                if (!faculty) {
                    void this.router.navigate(['/notfound']);
                    return;
                }

                this.scopedFacultyId.set(faculty.id);
                this.selectedFacultyId.set(faculty.id);
                this.faculties.set([faculty]);
                this.load();
            },
            error: () => void this.router.navigate(['/notfound'])
        });
    }

    private load(): void {
        const facultyId = this.selectedFacultyId();

        if (!facultyId) {
            this.units.set([]);
            return;
        }

        this.loading.set(true);
        this.courseUnitService.getByFaculty(facultyId).subscribe({
            next: (units) => {
                this.units.set([...units].sort((a, b) => a.code.localeCompare(b.code)));
                this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
                this.units.set([]);
                this.loading.set(false);
                this.showError(error.error?.detail ?? 'Impossible de charger les UE.');
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