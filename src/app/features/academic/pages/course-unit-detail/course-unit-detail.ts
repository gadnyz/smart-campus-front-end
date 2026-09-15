import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AcademicPermission } from '../../permissions/permission.model';
import { Course, CourseRequest } from '../../models/course.model';
import { CourseUnit, UE_BLOC_OPTIONS } from '../../models/course-unit.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Program } from '../../models/program.model';
import { FacultyService } from '../../services/faculty.service';
import { ProgramService } from '../../services/program.service';

@Component({
    selector: 'app-course-unit-detail',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TableModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        SelectModule,
        ContentSubtopbar
    ],
    templateUrl: './course-unit-detail.html',
    providers: [ConfirmationService, MessageService]
})
export class CourseUnitDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly courseService = inject(CourseService);
    private readonly permissionService = inject(PermissionService);
    private readonly messageService = inject(MessageService);
    private readonly fb = inject(FormBuilder);

    private readonly programService = inject(ProgramService);
    private readonly facultyService = inject(FacultyService);

    readonly programLabel = signal('—');
    readonly levelLabel = signal('—');
    readonly permuteDialogVisible = signal(false);
    readonly permutingCourse = signal<Course | null>(null);
    readonly otherUnits = signal<CourseUnit[]>([]);

    readonly unit = signal<CourseUnit | null>(null);
    readonly facultyCourses = signal<Course[]>([]);
    readonly loading = signal(false);
    readonly assignDialogVisible = signal(false);
    readonly saving = signal(false);
    readonly movingCourse = signal<Course | null>(null);

    private readonly confirmationService = inject(ConfirmationService);

    readonly canDelete = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUnitDeleteAll])
    );

    readonly canUpdate = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUnitUpdateAll])
    );

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => void this.router.navigate(['/academic/course-units'])
        },
        {
            label: 'Supprimer',
            icon: 'pi pi-trash',
            severity: 'danger',
            outlined: true,
            command: () => this.confirmDelete(),
            permissions: [AcademicPermission.CourseUnitDeleteAll]
        }
    ]);

    readonly attachedCourses = computed(() => {
        const unitId = this.unit()?.id;
        return this.facultyCourses().filter((course) => course.course_unit_id === unitId);
    });

    readonly availableCourses = computed(() => {
        const unitId = this.unit()?.id;
        return this.facultyCourses().filter((course) => course.course_unit_id !== unitId);
    });

    readonly totalCredits = computed(() =>
        this.attachedCourses().reduce((sum, course) => sum + (course.credits ?? 0), 0)
    );

    readonly canPermute = computed(() =>
        this.permissionService.hasAnyPermission([AcademicPermission.CourseUpdateAll])
    );

    readonly title = computed(() => {
        const unit = this.unit();
        return unit ? unit.code : 'UE';
    });

    readonly permuteForm = this.fb.nonNullable.group({
        course_unit_id: [null as string | null, Validators.required]
    });

    readonly otherUnitOptions = computed(() =>
        this.otherUnits().map((unit) => ({
            label: `${unit.code} — ${this.blocLabel(unit.knowledge_skills_bloc)}`,
            value: unit.id
        }))
    );

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');

        if (!id) {
            void this.router.navigate(['/notfound']);
            return;
        }

        this.loadUnit(id);
    }

    blocLabel(bloc: string): string {
        return UE_BLOC_OPTIONS.find((item) => item.value === bloc)?.label ?? bloc;
    }

   

   

    
    private loadUnit(id: string): void {
        this.loading.set(true);
        this.courseUnitService.getById(id).subscribe({
            next: (unit) => {
                this.unit.set(unit);
                this.loading.set(false);
                this.resolveProgramAndLevel(unit);
                this.loadProgramLevelCourses(unit.program_level_id);
            },
            error: () => {
                this.loading.set(false);
                void this.router.navigate(['/notfound']);
            }
        });
    }

    private resolveProgramAndLevel(unit: CourseUnit): void {
        if (unit.program_code || unit.level_code) {
            this.programLabel.set(
                unit.program_name ? `${unit.program_name}` : (unit.program_code ?? '—')
            );
            this.levelLabel.set(
                unit.level_name ? ` ${unit.level_name}` : (unit.level_code ?? '—')
            );

            if (unit.program_code && unit.level_code) {
                return;
            }
        }

        const apply = (programs: Program[]): void => {
            for (const program of programs) {
                const item = program.levels?.find((level) => level.id === unit.program_level_id);

                if (item) {
                    this.programLabel.set(`${program.name}`);
                    this.levelLabel.set(
                        item.is_common
                            ? `${item.level.name} (commun)`
                            : `${item.level.name}`
                    );
                    return;
                }
            }
        };

        if (unit.faculty_id) {
            this.programService.getByFaculty(unit.faculty_id).subscribe({
                next: apply,
                error: () => undefined
            });
            return;
        }

        this.facultyService
            .getAll()
            .pipe(
                switchMap((faculties) =>
                    faculties.length
                        ? forkJoin(faculties.map((faculty) => this.programService.getByFaculty(faculty.id)))
                        : of([] as Program[][])
                ),
                map((groups) => groups.flat())
            )
            .subscribe({
                next: apply,
                error: () => undefined
            });
    }

    openPermute(course: Course): void {
        const unit = this.unit();

        if (!unit) {
            return;
        }

        this.permutingCourse.set(course);
        this.permuteForm.reset({ course_unit_id: null });
        this.courseUnitService.getByProgramLevel(unit.program_level_id).subscribe({
            next: (units) => {
                this.otherUnits.set(units.filter((item) => item.id !== unit.id));
                this.permuteDialogVisible.set(true);
            },
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les UE du niveau.')
        });
    }

    submitPermute(): void {
        const course = this.permutingCourse();
        const targetId = this.permuteForm.controls.course_unit_id.value;
        const unit = this.unit();
        const target = this.otherUnits().find((item) => item.id === targetId);

        if (!course || !targetId || !unit || !target) {
            this.permuteForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.courseService.update(course.id, this.toRequest(course, targetId)).subscribe({
            next: () => {
                this.saving.set(false);
                this.permuteDialogVisible.set(false);
                this.permutingCourse.set(null);
                this.loadProgramLevelCourses(unit.program_level_id);
                this.showSuccess(`Cours ${course.code} permuté vers ${target.code}.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(error.error?.detail ?? 'Impossible de permuter ce cours.');
            }
        });
    }

    private loadProgramLevelCourses(programLevelId: string): void {
        this.courseService.getByProgramLevel(programLevelId).subscribe({
            next: (courses) => this.facultyCourses.set(courses),
            error: (error: HttpErrorResponse) =>
                this.showError(error.error?.detail ?? 'Impossible de charger les cours.')
        });
    }
    confirmDelete(): void {
        const unit = this.unit();
        if (!unit) {
            return;
        }
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
    private delete(unit: CourseUnit): void {
        this.courseUnitService.delete(unit.id).subscribe({
            next: () => {
                this.showSuccess(`UE ${unit.code} supprimée.`);
                void this.router.navigate(['/academic/course-units']);
            },
            error: (error: HttpErrorResponse) => {
                this.showError(error.error?.detail ?? 'Impossible de supprimer cette UE.');
            }
        });
    }

    private toRequest(course: Course, courseUnitId: string): CourseRequest {
        return {
            code: course.code,
            name: course.name,
            description: course.description,
            credits: course.credits,
            course_unit_id: courseUnitId
        };
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
