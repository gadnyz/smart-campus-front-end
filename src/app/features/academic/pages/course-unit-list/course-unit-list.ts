import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
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
import { Program } from '../../models/program.model';
import { CourseUnitService } from '../../services/course-unit.service';
import { FacultyService } from '../../services/faculty.service';
import { ProgramService } from '../../services/program.service';

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
        DialogModule,
        InputTextModule,
        SelectModule,
        IconFieldModule,
        InputIconModule,
        ContentSubtopbar
    ],
    templateUrl: './course-unit-list.html',
    providers: [MessageService]
})
export class CourseUnitListPage implements OnInit {
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly facultyService = inject(FacultyService);
    private readonly programService = inject(ProgramService);
    private readonly router = inject(Router);
    private readonly authService = inject(AuthService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);
    private readonly fb = inject(FormBuilder);

    readonly units = signal<CourseUnit[]>([]);
    readonly faculties = signal<Faculty[]>([]);
    readonly programs = signal<Program[]>([]);
    readonly selectedFacultyId = signal<string | null>(null);
    readonly selectedProgramId = signal<string | null>(null);
    readonly selectedProgramLevelId = signal<string | null>(null);
    readonly formProgramId = signal<string | null>(null);
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

    readonly dialogTitle = computed(() => (this.editingId() ? 'Modifier l’UE' : 'Nouvelle UE'));

    readonly facultyOptions = computed(() =>
        this.faculties().map((faculty) => ({
            label: `${faculty.name}`,
            value: faculty.id
        }))
    );

    readonly programOptions = computed(() =>
        this.programs().map((program) => ({
            label: `${program.name}`,
            value: program.id
        }))
    );

    readonly programLevelOptions = computed(() => this.toLevelOptions(this.selectedProgramId()));

    readonly dialogProgramLevelOptions = computed(() => this.toLevelOptions(this.formProgramId()));

    readonly form = this.fb.nonNullable.group({
        faculty_id: [null as string | null, Validators.required],
        program_id: [null as string | null, Validators.required],
        program_level_id: [null as string | null, Validators.required],
        code: ['', Validators.required],
        knowledge_skills_bloc: [null as KnowledgeSkillsBloc | null, Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Nouvelle UE',
            icon: 'pi pi-plus',
            severity: 'info',
            outlined: false,
            command: () => this.openCreateDialog(),
            permissions: [AcademicPermission.CourseUnitCreateAll]
        }
    ]);

    ngOnInit(): void {
        this.form.controls.faculty_id.valueChanges.subscribe((facultyId) => {
            this.form.controls.program_id.setValue(null);
            this.form.controls.program_level_id.setValue(null);
            this.formProgramId.set(null);
            this.loadPrograms(facultyId);
        });
        this.form.controls.program_id.valueChanges.subscribe((programId) => {
            this.form.controls.program_level_id.setValue(null);
            this.formProgramId.set(programId);
        });

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
        this.selectedProgramId.set(null);
        this.selectedProgramLevelId.set(null);
        this.units.set([]);
        this.loadPrograms(facultyId);
    }

    onProgramFilterChange(programId: string | null): void {
        this.selectedProgramId.set(programId);
        this.selectedProgramLevelId.set(null);
        this.units.set([]);
    }

    onProgramLevelFilterChange(programLevelId: string | null): void {
        this.selectedProgramLevelId.set(programLevelId);
        this.load();
    }

    openDetail(unit: CourseUnit): void {
        void this.router.navigate(['/academic/course-units', unit.id]);
    }

    openCreateDialog(): void {
        const facultyId = this.scopedFacultyId() ?? this.selectedFacultyId();
        const programId = this.selectedProgramId();
        this.editingId.set(null);
        this.form.reset(
            {
                faculty_id: facultyId,
                program_id: programId,
                program_level_id: this.selectedProgramLevelId(),
                code: '',
                knowledge_skills_bloc: null
            },
            { emitEvent: false }
        );
        this.formProgramId.set(programId);
        if (facultyId) {
            this.loadPrograms(facultyId);
        }
        this.dialogVisible.set(true);
    }

    openEditDialog(unit: CourseUnit): void {
        const facultyId = this.selectedFacultyId();
        const programId = unit.program_id ?? this.selectedProgramId();
        this.editingId.set(unit.id);
        this.form.reset(
            {
                faculty_id: facultyId,
                program_id: programId,
                program_level_id: unit.program_level_id,
                code: unit.code,
                knowledge_skills_bloc: unit.knowledge_skills_bloc
            },
            { emitEvent: false }
        );
        this.formProgramId.set(programId);
        if (facultyId) {
            this.loadPrograms(facultyId);
        }
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
            program_level_id: raw.program_level_id as string
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
                this.selectedProgramId.set(raw.program_id);
                this.selectedProgramLevelId.set(unit.program_level_id);
                this.load();
                this.showSuccess(editingId ? `UE ${unit.code} modifiée.` : `UE ${unit.code} créée.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(error.error?.detail ?? 'Impossible d’enregistrer l’UE.');
            }
        });
    }

    blocLabel(bloc: string): string {
        return this.blocOptions.find((item) => item.value === bloc)?.label ?? bloc;
    }

    private toLevelOptions(programId: string | null): { label: string; value: string }[] {
        const program = this.programs().find((item) => item.id === programId);

        return (program?.levels ?? []).map((item) => ({
            label: item.is_common ? `${item.level.code} (commun)` : item.level.code,
            value: item.id
        }));
    }

    private loadPrograms(facultyId: string | null): void {
        if (!facultyId) {
            this.programs.set([]);
            return;
        }

        this.programService.getByFaculty(facultyId).subscribe({
            next: (programs) => this.programs.set(programs),
            error: () => this.programs.set([])
        });
    }

    private load(): void {
        const programLevelId = this.selectedProgramLevelId();

        if (!programLevelId) {
            this.units.set([]);
            return;
        }

        this.loading.set(true);
        this.courseUnitService.getByProgramLevel(programLevelId).subscribe({
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
                this.form.controls.faculty_id.disable({ emitEvent: false });
                this.loadPrograms(faculty.id);
            },
            error: () => void this.router.navigate(['/notfound'])
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
