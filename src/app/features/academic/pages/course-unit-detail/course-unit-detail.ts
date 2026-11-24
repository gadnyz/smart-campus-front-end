import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { writeAuthorities } from '@/app/core/permissions/permission-scope';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { Course } from '../../models/course.model';
import { CourseUnit, CourseUnitCourse, CourseUnitDetail, KnowledgeSkillsBloc, UE_BLOC_OPTIONS, blocLabel } from '../../models/course-unit.model';
import { CourseService } from '../../services/course.service';
import { CourseUnitService } from '../../services/course-unit.service';
import { ProgramService } from '../../services/program.service';
import { promotionLabel } from '../../utils/promotion-label';

interface CurriculumRow {
    programLevelId: string;
    label: string;
    bloc: KnowledgeSkillsBloc;
}

/**
 * Fiche d'une UE : les promotions de son curriculum (avec leur bloc) et ses cours (avec leurs
 * crédits dans l'UE). Le curriculum et les cours se gèrent ici ; un cours se déplace aussi vers
 * une autre UE de ces promotions.
 */
@Component({
    selector: 'app-course-unit-detail',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        TableModule,
        TagModule,
        ButtonModule,
        ToastModule,
        ConfirmDialogModule,
        DialogModule,
        InputNumberModule,
        SelectModule,
        ContentSubtopbar
    ],
    templateUrl: './course-unit-detail.html',
    styleUrl: './course-unit-detail.scss',
    providers: [ConfirmationService, MessageService]
})
export class CourseUnitDetailPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly courseUnitService = inject(CourseUnitService);
    private readonly courseService = inject(CourseService);
    private readonly programService = inject(ProgramService);
    private readonly permissionService = inject(PermissionService);
    private readonly messageService = inject(MessageService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly fb = inject(FormBuilder);

    readonly blocOptions = UE_BLOC_OPTIONS;

    readonly unit = signal<CourseUnitDetail | null>(null);
    readonly courses = signal<CourseUnitCourse[]>([]);
    /** Libellé « Programme — niveau » de chaque promotion de la faculté. */
    private readonly promotionLabels = signal<Map<string, string>>(new Map());
    readonly loading = signal(false);
    readonly saving = signal(false);

    readonly moveDialogVisible = signal(false);
    readonly movingCourse = signal<CourseUnitCourse | null>(null);
    readonly targetUnits = signal<CourseUnit[]>([]);

    readonly enrollDialogVisible = signal(false);
    readonly attachDialogVisible = signal(false);
    /** Cours de la faculté, chargés à la première ouverture du rattachement. */
    readonly facultyCourses = signal<Course[]>([]);

    readonly canDelete = computed(() => this.permissionService.canWrite('academic:course-unit:delete'));
    readonly canEdit = computed(() => this.permissionService.canWrite('academic:course-unit:update'));

    readonly title = computed(() => this.unit()?.code ?? 'UE');
    readonly totalCredits = computed(() => this.courses().reduce((sum, course) => sum + (course.credits ?? 0), 0));

    readonly curriculum = computed<CurriculumRow[]>(() =>
        (this.unit()?.curriculum ?? []).map((entry) => ({
            programLevelId: entry.program_level_id,
            label: this.promotionLabels().get(entry.program_level_id) ?? '—',
            bloc: entry.knowledge_skills_bloc
        }))
    );

    /** Promotions de la faculté où l'UE ne figure pas encore. */
    readonly enrollOptions = computed(() => {
        const enrolled = new Set(this.curriculum().map((row) => row.programLevelId));
        return [...this.promotionLabels()]
            .filter(([id]) => !enrolled.has(id))
            .map(([value, label]) => ({ label, value }))
            .sort((a, b) => a.label.localeCompare(b.label));
    });

    /** Cours de la faculté qui ne sont pas déjà dans l'UE. */
    readonly attachOptions = computed(() => {
        const attached = new Set(this.courses().map((course) => course.course_id));
        return this.facultyCourses()
            .filter((course) => !attached.has(course.id))
            .map((course) => ({ label: `${course.code} — ${course.name}`, value: course.id }));
    });

    readonly targetOptions = computed(() =>
        this.targetUnits().map((unit) => ({
            label: `${unit.code} — ${blocLabel(unit.knowledge_skills_bloc)} (${this.promotionLabels().get(unit.program_level_id) ?? '—'})`,
            value: unit.id
        }))
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
            permissions: writeAuthorities('academic:course-unit:delete')
        }
    ]);

    readonly moveForm = this.fb.nonNullable.group({
        target_id: [null as string | null, Validators.required]
    });

    readonly enrollForm = this.fb.nonNullable.group({
        program_level_id: [null as string | null, Validators.required],
        knowledge_skills_bloc: ['FONDAMENTAL' as KnowledgeSkillsBloc, Validators.required]
    });

    readonly attachForm = this.fb.nonNullable.group({
        course_id: [null as string | null, Validators.required],
        /** Vide : les crédits par défaut du cours. */
        credits: [null as number | null, Validators.min(0)]
    });

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            void this.router.navigate(['/notfound']);
            return;
        }
        this.loadUnit(id);
    }

    blocLabel(bloc: KnowledgeSkillsBloc): string {
        return blocLabel(bloc);
    }

    // ----- Curriculum -----

    openEnroll(): void {
        this.enrollForm.reset({ program_level_id: null, knowledge_skills_bloc: this.curriculum()[0]?.bloc ?? 'FONDAMENTAL' });
        this.enrollDialogVisible.set(true);
    }

    submitEnroll(): void {
        const unit = this.unit();
        const { program_level_id, knowledge_skills_bloc } = this.enrollForm.getRawValue();
        if (!unit || !program_level_id || this.enrollForm.invalid) {
            this.enrollForm.markAllAsTouched();
            return;
        }
        this.saving.set(true);
        this.courseUnitService.addToCurriculum(unit.id, program_level_id, knowledge_skills_bloc).subscribe({
            next: (entry) => {
                this.saving.set(false);
                this.enrollDialogVisible.set(false);
                this.patchCurriculum((curriculum) => [...curriculum, entry]);
                this.showSuccess(`${unit.code} inscrite dans ${this.promotionLabels().get(entry.program_level_id) ?? 'la promotion'}.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(apiErrorMessage(error, 'Impossible d’inscrire l’UE dans cette promotion.'));
            }
        });
    }

    changeBloc(row: CurriculumRow, bloc: KnowledgeSkillsBloc): void {
        const unit = this.unit();
        if (!unit || bloc === row.bloc) {
            return;
        }
        this.courseUnitService.changeBloc(unit.id, row.programLevelId, bloc).subscribe({
            next: (entry) => {
                this.patchCurriculum((curriculum) => curriculum.map((item) => (item.program_level_id === entry.program_level_id ? entry : item)));
                this.showSuccess(`Bloc ${blocLabel(entry.knowledge_skills_bloc)} pour ${row.label}.`);
            },
            error: (error: HttpErrorResponse) => {
                // Le select a déjà changé : on le ramène à la valeur enregistrée.
                this.patchCurriculum((curriculum) => [...curriculum]);
                this.showError(apiErrorMessage(error, 'Impossible de changer le bloc.'));
            }
        });
    }

    confirmRemoveFromCurriculum(row: CurriculumRow): void {
        const unit = this.unit();
        if (!unit) {
            return;
        }
        this.confirmationService.confirm({
            header: 'Retirer de la promotion',
            message: `Retirer ${unit.code} du curriculum de ${row.label} ? Impossible tant qu’un de ses cours y a des séances à venir.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Retirer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () =>
                this.courseUnitService.removeFromCurriculum(unit.id, row.programLevelId).subscribe({
                    next: () => {
                        this.patchCurriculum((curriculum) => curriculum.filter((item) => item.program_level_id !== row.programLevelId));
                        this.showSuccess(`${unit.code} retirée de ${row.label}.`);
                    },
                    error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de retirer l’UE de cette promotion.'))
                })
        });
    }

    // ----- Cours -----

    openAttach(): void {
        const unit = this.unit();
        if (!unit) {
            return;
        }
        this.attachForm.reset({ course_id: null, credits: null });
        if (this.facultyCourses().length) {
            this.attachDialogVisible.set(true);
            return;
        }
        this.courseService.getAll(unit.faculty_id).subscribe({
            next: (courses) => {
                this.facultyCourses.set(courses);
                this.attachDialogVisible.set(true);
            },
            error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de charger les cours de la faculté.'))
        });
    }

    /** Crédits par défaut du cours choisi, en indication sous le champ. */
    defaultCredits(): number | null {
        const id = this.attachForm.controls.course_id.value;
        return this.facultyCourses().find((course) => course.id === id)?.credits ?? null;
    }

    submitAttach(): void {
        const unit = this.unit();
        const { course_id, credits } = this.attachForm.getRawValue();
        if (!unit || !course_id || this.attachForm.invalid) {
            this.attachForm.markAllAsTouched();
            return;
        }
        this.saving.set(true);
        this.courseUnitService.attachCourse(unit.id, { course_id, ...(credits !== null ? { credits } : {}) }).subscribe({
            next: (course) => {
                this.saving.set(false);
                this.attachDialogVisible.set(false);
                this.courses.update((courses) => [...courses, course].sort((a, b) => a.code.localeCompare(b.code)));
                this.showSuccess(`Cours ${course.code} rattaché à ${unit.code}.`);
            },
            error: (error: HttpErrorResponse) => {
                this.saving.set(false);
                this.showError(apiErrorMessage(error, 'Impossible de rattacher ce cours.'));
            }
        });
    }

    confirmDetach(course: CourseUnitCourse): void {
        const unit = this.unit();
        if (!unit) {
            return;
        }
        this.confirmationService.confirm({
            header: 'Détacher le cours',
            message: `Détacher ${course.code} de ${unit.code} ? Le cours reste dans la faculté. Impossible tant qu’il a des séances à venir dans une promotion de l’UE.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Détacher',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () =>
                this.courseUnitService.detachCourse(unit.id, course.course_id).subscribe({
                    next: () => {
                        this.courses.update((courses) => courses.filter((item) => item.course_id !== course.course_id));
                        this.showSuccess(`Cours ${course.code} détaché de ${unit.code}.`);
                    },
                    error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de détacher ce cours.'))
                })
        });
    }

    openMove(course: CourseUnitCourse): void {
        const unit = this.unit();
        if (!unit) {
            return;
        }
        this.movingCourse.set(course);
        this.moveForm.reset({ target_id: null });
        // Les UE des promotions de celle-ci, sans elle-même ni celles qui ont déjà le cours.
        const promotions = unit.curriculum.map((entry) => entry.program_level_id);
        forkJoin(promotions.map((programLevelId) => this.courseUnitService.getByProgramLevel(programLevelId).pipe(catchError(() => of([] as CourseUnit[])))))
            .pipe(map((groups) => groups.flat().filter((item, index, all) => item.id !== unit.id && all.findIndex((other) => other.id === item.id) === index)))
            .subscribe((units) => {
                this.targetUnits.set(units);
                this.moveDialogVisible.set(true);
            });
    }

    /** Rattache le cours à l'UE cible avec les mêmes crédits, puis le retire de celle-ci. */
    submitMove(): void {
        const unit = this.unit();
        const course = this.movingCourse();
        const targetId = this.moveForm.controls.target_id.value;
        const target = this.targetUnits().find((item) => item.id === targetId);
        if (!unit || !course || !target) {
            this.moveForm.markAllAsTouched();
            return;
        }
        this.saving.set(true);
        this.courseUnitService
            .attachCourse(target.id, { course_id: course.course_id, credits: course.credits })
            .pipe(
                switchMap(() =>
                    this.courseUnitService.detachCourse(unit.id, course.course_id).pipe(
                        map(() => true),
                        // Rattaché à la cible mais toujours ici : on le signale plutôt que d'échouer en silence.
                        catchError((error: HttpErrorResponse) => {
                            this.showError(apiErrorMessage(error, `${course.code} a été ajouté à ${target.code} mais n’a pas pu être retiré de ${unit.code}.`));
                            return of(false);
                        })
                    )
                )
            )
            .subscribe({
                next: (moved) => {
                    this.saving.set(false);
                    this.moveDialogVisible.set(false);
                    this.movingCourse.set(null);
                    this.loadCourses(unit.id);
                    if (moved) {
                        this.showSuccess(`Cours ${course.code} déplacé vers ${target.code}.`);
                    }
                },
                error: (error: HttpErrorResponse) => {
                    this.saving.set(false);
                    this.showError(apiErrorMessage(error, 'Impossible de déplacer ce cours.'));
                }
            });
    }

    confirmDelete(): void {
        const unit = this.unit();
        if (!unit) {
            return;
        }
        this.confirmationService.confirm({
            header: 'Supprimer l’UE',
            message: `Supprimer ${unit.code} ? Impossible tant qu’un de ses cours a des séances à venir.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Supprimer',
            rejectLabel: 'Annuler',
            acceptButtonStyleClass: 'p-button-danger',
            rejectButtonStyleClass: 'p-button-text',
            accept: () => this.delete(unit)
        });
    }

    private patchCurriculum(change: (curriculum: CourseUnitDetail['curriculum']) => CourseUnitDetail['curriculum']): void {
        this.unit.update((unit) => (unit ? { ...unit, curriculum: change(unit.curriculum) } : unit));
    }

    private loadUnit(id: string): void {
        this.loading.set(true);
        this.courseUnitService.getById(id).subscribe({
            next: (unit) => {
                this.unit.set(unit);
                this.loading.set(false);
                this.loadCourses(unit.id);
                this.loadPromotionLabels(unit.faculty_id);
            },
            error: () => {
                this.loading.set(false);
                void this.router.navigate(['/notfound']);
            }
        });
    }

    private loadCourses(unitId: string): void {
        this.courseUnitService.getCourses(unitId).subscribe({
            next: (courses) => this.courses.set([...courses].sort((a, b) => a.code.localeCompare(b.code))),
            error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de charger les cours de l’UE.'))
        });
    }

    private loadPromotionLabels(facultyId: string): void {
        if (!facultyId) {
            return;
        }
        this.programService.getByFaculty(facultyId).subscribe({
            next: (programs) => {
                const labels = new Map<string, string>();
                for (const program of programs) {
                    for (const item of program.levels ?? []) {
                        labels.set(item.id, promotionLabel(item.level, program.name));
                    }
                }
                this.promotionLabels.set(labels);
            },
            error: () => undefined
        });
    }

    private delete(unit: CourseUnitDetail): void {
        this.courseUnitService.delete(unit.id).subscribe({
            next: () => {
                this.showSuccess(`UE ${unit.code} supprimée.`);
                void this.router.navigate(['/academic/course-units']);
            },
            error: (error: HttpErrorResponse) => this.showError(apiErrorMessage(error, 'Impossible de supprimer cette UE.'))
        });
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
