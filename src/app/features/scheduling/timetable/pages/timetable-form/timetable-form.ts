import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
    EMPTY,
    Observable,
    Subject,
    catchError,
    concat,
    concatMap,
    debounceTime,
    defer,
    distinctUntilChanged,
    forkJoin,
    from,
    map,
    of,
    switchMap,
    tap,
    toArray
} from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PermissionService } from '@/app/core/permissions/permission.service';
import {
    AcademicCatalogService,
    AcademicYearReference,
    Course,
    CourseAssignment,
    CourseAssignmentService,
    CourseService,
    Program,
    ProgramService
} from '@/app/features/academic/academic.public-api';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { Room } from '../../../models/room.model';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { RoomService } from '../../../services/room.service';
import { SESSION_TYPE_OPTIONS, SessionType, TimetableEntry } from '../../models/timetable-entry.model';
import { CreateTimetableRequest, Timetable, timetableStatusLabel } from '../../models/timetable.model';
import { SessionLine, WEEK_DAY_OPTIONS, WeekDay, weekDayLabel } from '../../models/timetable-session.model';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { TimetableService } from '../../services/timetable.service';
import { programLevelOptions } from '../../utils/program-level';
import { readBatchErrors, timetableErrorMessage } from '../../utils/timetable-error';
import { TIMETABLE_PATH } from '../../utils/timetable-routes';
import { PlannedEntry, SavePlan, findOverlappingLines, groupEntriesIntoLines, planSave } from '../../utils/timetable-session';
import { addDays, formatWeekStart, isEndAfterStart, mondayOf, parseApiDate, parseApiTime, toApiDate, toApiTime } from '../../utils/timetable-time';
import { LeaveConfirmable } from './timetable-form-leave.guard';

type LineForm = FormGroup<{
    course_id: FormControl<string | null>;
    course_assignment_id: FormControl<string | null>;
    start: FormControl<Date | null>;
    end: FormControl<Date | null>;
    days: FormControl<WeekDay[]>;
    room_id: FormControl<string | null>;
    session_type: FormControl<SessionType>;
    note: FormControl<string>;
    entry_ids: FormControl<Partial<Record<WeekDay, string>>>;
}>;

interface HeaderKey {
    programLevelId: string;
    weekStart: string;
}

/** Échec d'une écriture ; `line` est `null` quand l'erreur ne se rattache à aucune ligne. */
interface SaveFailure {
    line: number | null;
    day?: WeekDay;
    message: string;
}

const HEADER_SYNC_DELAY_MS = 400;

function endAfterStart(group: AbstractControl): ValidationErrors | null {
    const start = group.get('start')?.value as Date | null;
    const end = group.get('end')?.value as Date | null;
    if (!start || !end) {
        return null;
    }
    return isEndAfterStart(toApiTime(start), toApiTime(end)) ? null : { endBeforeStart: true };
}

/**
 * Création et édition d'un horaire hebdomadaire, sur le modèle d'un devis Odoo : un en-tête
 * (programme, niveau, semaine) et un tableau de sessions éditable.
 *
 * <p>L'horaire est créé dès que l'en-tête est complet, pour que les sessions puissent s'y
 * rattacher. Tant qu'aucune session n'est enregistrée, modifier l'en-tête supprime puis recrée
 * l'horaire (l'API n'a pas de mise à jour d'en-tête) ; ensuite, l'en-tête est verrouillé.
 *
 * <p>« Enregistrer » applique la différence avec le serveur : suppressions, mises à jour, puis
 * créations en un seul lot. Chaque ligne couvrant plusieurs jours, une ligne = une séance par jour.
 */
@Component({
    selector: 'app-timetable-form-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule, ButtonModule, ConfirmDialogModule, DatePicker, MultiSelectModule, SelectModule, TableModule, ToastModule, ContentSubtopbar],
    templateUrl: './timetable-form.html',
    styleUrl: './timetable-form.scss',
    providers: [ConfirmationService, MessageService]
})
export class TimetableFormPage implements LeaveConfirmable {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly timetableService = inject(TimetableService);
    private readonly entryService = inject(TimetableEntryService);
    private readonly programService = inject(ProgramService);
    private readonly catalog = inject(AcademicCatalogService);
    private readonly courseService = inject(CourseService);
    private readonly assignmentService = inject(CourseAssignmentService);
    private readonly roomService = inject(RoomService);
    private readonly confirmationService = inject(ConfirmationService);
    private readonly messageService = inject(MessageService);
    private readonly permissionService = inject(PermissionService);

    readonly weekDayOptions = WEEK_DAY_OPTIONS;
    readonly sessionTypeOptions = SESSION_TYPE_OPTIONS;
    readonly timetableStatusLabel = timetableStatusLabel;
    readonly minWeekDate = mondayOf(new Date());

    readonly programs = signal<Program[]>([]);
    readonly rooms = signal<Room[]>([]);
    readonly courses = signal<Course[]>([]);
    readonly currentYear = signal<AcademicYearReference | null>(null);
    /** Affectations ACTIVE de l'année de l'horaire, par cours. Une clé absente : pas encore chargée. */
    readonly assignmentsByCourse = signal<Record<string, CourseAssignment[]>>({});
    readonly timetable = signal<Timetable | null>(null);
    /** Séances telles qu'enregistrées sur le serveur, tenues à jour après chaque écriture. */
    readonly persisted = signal<TimetableEntry[]>([]);
    readonly lineRows = signal<LineForm[]>([]);

    readonly editId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly headerSyncing = signal(false);
    readonly headerError = signal<string | null>(null);
    readonly existingTimetableId = signal<string | null>(null);
    readonly saving = signal(false);
    readonly saveError = signal<string | null>(null);
    readonly lineErrors = signal<Record<number, string[]>>({});
    readonly submitted = signal(false);

    private readonly selectedProgramId = signal<string | null>(null);
    private readonly weekStart = signal<string | null>(null);

    readonly headerForm = this.fb.group({
        program_id: this.fb.control<string | null>(null, Validators.required),
        program_level_id: this.fb.control<string | null>(null, Validators.required),
        week_start: this.fb.control<Date | null>(null, Validators.required)
    });
    readonly lines = this.fb.array<LineForm>([]);

    readonly title = computed(() => (this.editId() ? 'Modifier un horaire' : 'Nouvel horaire'));
    readonly actions: SubtopbarAction[] = [
        { label: 'Retour aux horaires', icon: 'pi pi-arrow-left', severity: 'secondary', outlined: true, routerLink: TIMETABLE_PATH }
    ];
    readonly canEditEntries = computed(() =>
        this.permissionService.hasAnyPermission([
            SchedulingPermission.TimetableEntryCreateAll,
            SchedulingPermission.TimetableEntryUpdateAll,
            SchedulingPermission.TimetableEntryDeleteAll
        ])
    );
    readonly validated = computed(() => this.timetable()?.status === 'VALIDATED');
    readonly readOnly = computed(() => this.validated() || !this.canEditEntries());
    readonly headerLocked = computed(() => this.persisted().length > 0 || this.validated());
    readonly programOptions = computed(() => this.programs().map((program) => ({ label: program.name, value: program.id })));
    readonly levelOptions = computed(() => programLevelOptions(this.programs(), this.selectedProgramId()));
    readonly weekRange = computed(() => {
        const start = this.weekStart();
        return start ? `Du lundi ${formatWeekStart(start)} au dimanche ${formatWeekStart(addDays(start, 6))}` : null;
    });

    /** Horaire créé par cette page et pas encore rempli : supprimé si l'utilisateur abandonne. */
    private createdHere = false;
    private leaveAllowed = false;
    private lastLevelId: string | null = null;
    private readonly requestedCourses = new Set<string>();
    private readonly levelChanges = new Subject<string | null>();

    constructor() {
        this.loadReferences();

        this.headerForm.controls.program_id.valueChanges.pipe(takeUntilDestroyed()).subscribe((programId) => {
            this.selectedProgramId.set(programId);
            this.headerForm.controls.program_level_id.setValue(null);
        });

        this.headerForm.controls.program_level_id.valueChanges.pipe(takeUntilDestroyed()).subscribe((levelId) => this.onLevelChanged(levelId));

        this.headerForm.controls.week_start.valueChanges.pipe(takeUntilDestroyed()).subscribe((week) => {
            this.weekStart.set(week ? toApiDate(mondayOf(week)) : null);
        });

        this.levelChanges
            .pipe(
                switchMap((levelId) => (levelId ? this.courseService.getByProgramLevel(levelId).pipe(catchError(() => of([] as Course[]))) : of([] as Course[]))),
                takeUntilDestroyed()
            )
            .subscribe((courses) => this.courses.set(courses));

        // concatMap et non switchMap : annuler une suppression ou une création déjà partie
        // laisserait un horaire orphelin côté serveur.
        this.headerForm.valueChanges
            .pipe(
                debounceTime(HEADER_SYNC_DELAY_MS),
                map(() => this.headerKey()),
                distinctUntilChanged((a, b) => a?.programLevelId === b?.programLevelId && a?.weekStart === b?.weekStart),
                concatMap((key) => (key ? this.syncHeader(key) : EMPTY)),
                takeUntilDestroyed()
            )
            .subscribe();

        this.route.paramMap
            .pipe(
                map((params) => params.get('id')),
                distinctUntilChanged(),
                takeUntilDestroyed()
            )
            .subscribe((id) => {
                this.editId.set(id);
                if (id) {
                    this.loadTimetable(id);
                }
            });
    }

    // ----- Tableau des sessions -----

    addLine(): void {
        this.lines.push(this.createLine());
        this.lines.markAsDirty();
        this.refreshRows();
    }

    removeLine(index: number): void {
        this.lines.removeAt(index);
        this.lines.markAsDirty();
        this.lineErrors.set({});
        this.refreshRows();
    }

    onLineCourseChange(line: LineForm): void {
        line.controls.course_assignment_id.setValue(null);
        const courseId = line.controls.course_id.value;
        if (courseId) {
            this.ensureAssignments(courseId);
        }
    }

    assignmentsLoaded(line: LineForm): boolean {
        const courseId = line.controls.course_id.value;
        return !!courseId && courseId in this.assignmentsByCourse();
    }

    /**
     * Professeurs proposés pour la ligne. Une séance enregistrée garde son affectation même si
     * celle-ci n'est plus active, pour ne pas la changer à l'insu de l'utilisateur.
     */
    assignmentOptions(line: LineForm): { label: string; value: string }[] {
        const courseId = line.controls.course_id.value;
        const options = (courseId ? (this.assignmentsByCourse()[courseId] ?? []) : []).map((assignment) => ({
            label: assignment.professor_name ?? 'Professeur',
            value: assignment.id
        }));
        const current = line.controls.course_assignment_id.value;
        if (current && !options.some((option) => option.value === current)) {
            const entry = this.persisted().find((item) => item.course_assignment_id === current);
            if (entry) {
                options.push({ label: `${entry.professor_name || 'Professeur'} (affectation inactive)`, value: current });
            }
        }
        return options;
    }

    lineIssues(line: LineForm, index: number): string[] {
        const issues: string[] = [];
        const shown = (control: AbstractControl) => control.invalid && (control.touched || this.submitted());
        const controls = line.controls;

        if (shown(controls.course_id)) {
            issues.push('Choisissez un cours.');
        } else if (shown(controls.course_assignment_id) && this.assignmentOptions(line).length > 0) {
            issues.push('Choisissez le professeur.');
        }
        if (shown(controls.start) || shown(controls.end)) {
            issues.push('Renseignez l’heure de début et de fin.');
        } else if (line.hasError('endBeforeStart')) {
            issues.push('L’heure de fin doit être après l’heure de début.');
        }
        if (shown(controls.days)) {
            issues.push('Sélectionnez au moins un jour.');
        }
        if (shown(controls.room_id)) {
            issues.push('Choisissez une salle.');
        }
        return [...issues, ...(this.lineErrors()[index] ?? [])];
    }

    // ----- Enregistrement -----

    save(): void {
        this.submitted.set(true);
        this.saveError.set(null);
        this.lineErrors.set({});

        const timetable = this.timetable();
        if (!timetable) {
            this.saveError.set('Renseignez le programme, le niveau et la semaine : l’horaire est créé automatiquement.');
            return;
        }
        if (this.headerSyncing() || this.saving()) {
            return;
        }
        if (this.lines.length === 0) {
            this.saveError.set('Ajoutez au moins une session.');
            return;
        }
        this.lines.markAllAsTouched();
        if (this.lines.invalid) {
            this.saveError.set('Corrigez les sessions signalées avant d’enregistrer.');
            return;
        }

        const values = this.lineValues();
        const overlaps = findOverlappingLines(values);
        if (overlaps.size > 0) {
            const errors: Record<number, string[]> = {};
            overlaps.forEach((others, index) => {
                errors[index] = [`Chevauche la ligne ${others.map((other) => other + 1).join(', ')} sur un même jour.`];
            });
            this.lineErrors.set(errors);
            this.saveError.set('Deux sessions de la même promotion ne peuvent pas avoir lieu en même temps.');
            return;
        }

        const plan = planSave(values, timetable.week_start, this.persisted());
        this.saving.set(true);
        this.executePlan(timetable.id, plan)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((failures) => this.onSaved(failures));
    }

    confirmLeave(): boolean | Observable<boolean> {
        if (this.leaveAllowed) {
            return true;
        }
        const timetable = this.timetable();
        const orphan = timetable !== null && this.createdHere && this.persisted().length === 0;
        const unsaved = this.lines.dirty && !this.readOnly();

        if (!unsaved) {
            return orphan ? this.discardTimetable(timetable) : true;
        }
        return new Observable<boolean>((subscriber) => {
            this.confirmationService.confirm({
                header: 'Sessions non enregistrées',
                message: orphan
                    ? 'Les sessions ne sont pas enregistrées et l’horaire vide créé automatiquement sera supprimé. Quitter la page ?'
                    : 'Les sessions ne sont pas enregistrées. Quitter la page ?',
                icon: 'pi pi-exclamation-triangle',
                acceptLabel: 'Quitter',
                rejectLabel: 'Rester',
                accept: () => {
                    (orphan ? this.discardTimetable(timetable) : of(true)).subscribe((leave) => {
                        subscriber.next(leave);
                        subscriber.complete();
                    });
                },
                reject: () => {
                    subscriber.next(false);
                    subscriber.complete();
                }
            });
        });
    }

    cancel(): void {
        void this.router.navigate([TIMETABLE_PATH]);
    }

    openExisting(): void {
        const id = this.existingTimetableId();
        if (id) {
            void this.router.navigate([TIMETABLE_PATH, id, 'edit']);
        }
    }

    // ----- Chargements -----

    private loadReferences(): void {
        forkJoin({
            programs: this.programService.getAll().pipe(
                catchError(() => {
                    this.loadError.set('Impossible de charger les programmes.');
                    return of([] as Program[]);
                })
            ),
            rooms: this.roomService.getAll().pipe(catchError(() => of([] as Room[]))),
            year: this.catalog.getCurrentAcademicYear().pipe(catchError(() => of(null)))
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ programs, rooms, year }) => {
                this.programs.set(programs);
                this.rooms.set([...rooms].sort((a, b) => a.name.localeCompare(b.name)));
                this.currentYear.set(year);
            });
    }

    private loadTimetable(id: string): void {
        this.loading.set(true);
        this.loadError.set(null);
        forkJoin({ timetable: this.timetableService.getById(id), entries: this.entryService.getByTimetable(id) })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ timetable, entries }) => {
                    this.timetable.set(timetable);
                    this.persisted.set(entries);
                    this.createdHere = false;
                    this.selectedProgramId.set(timetable.program_id);
                    this.weekStart.set(timetable.week_start);
                    this.lastLevelId = timetable.program_level_id;
                    this.headerForm.setValue(
                        {
                            program_id: timetable.program_id,
                            program_level_id: timetable.program_level_id,
                            week_start: parseApiDate(timetable.week_start)
                        },
                        { emitEvent: false }
                    );
                    this.levelChanges.next(timetable.program_level_id);
                    this.setLines(groupEntriesIntoLines(entries, timetable.week_start));
                    this.loading.set(false);
                    this.applyFormState();
                },
                error: (error: unknown) => {
                    this.loading.set(false);
                    this.loadError.set(error instanceof HttpErrorResponse ? timetableErrorMessage(error) : 'Impossible de charger l’horaire.');
                }
            });
    }

    private ensureAssignments(courseId: string): void {
        if (courseId in this.assignmentsByCourse()) {
            this.autoSelectAssignment(courseId);
            return;
        }
        if (this.requestedCourses.has(courseId)) {
            return;
        }
        this.requestedCourses.add(courseId);
        const yearId = this.timetable()?.academic_year_id ?? this.currentYear()?.id;
        this.assignmentService
            .getByCourse(courseId)
            .pipe(
                catchError(() => of([] as CourseAssignment[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((items) => {
                this.requestedCourses.delete(courseId);
                // Uniquement l'année de l'horaire : une affectation d'une autre année ne doit
                // jamais être proposée, même à défaut.
                const forYear = items.filter((item) => item.status === 'ACTIVE' && (!yearId || item.academic_year_id === yearId));
                this.assignmentsByCourse.update((current) => ({ ...current, [courseId]: forYear }));
                this.autoSelectAssignment(courseId);
            });
    }

    /**
     * Lit le cours de chaque ligne au moment où la réponse arrive : une réponse tardive pour un
     * cours que l'utilisateur a déjà changé ne touche aucune ligne.
     */
    private autoSelectAssignment(courseId: string): void {
        const options = this.assignmentsByCourse()[courseId] ?? [];
        if (options.length !== 1) {
            return;
        }
        for (const line of this.lines.controls) {
            if (line.controls.course_id.value === courseId && !line.controls.course_assignment_id.value) {
                line.controls.course_assignment_id.setValue(options[0].id);
            }
        }
    }

    // ----- En-tête -----

    private onLevelChanged(levelId: string | null): void {
        // Les cours dépendent du niveau : on les vide, mais jours, heures et salles restent valables.
        if (this.lastLevelId !== null && levelId !== this.lastLevelId && this.lines.length > 0) {
            for (const line of this.lines.controls) {
                line.patchValue({ course_id: null, course_assignment_id: null });
            }
            this.messageService.add({
                severity: 'info',
                summary: 'Sessions',
                detail: 'Le niveau a changé : choisissez à nouveau le cours de chaque session.'
            });
        }
        this.lastLevelId = levelId;
        this.levelChanges.next(levelId);
    }

    private headerKey(): HeaderKey | null {
        const { program_id, program_level_id, week_start } = this.headerForm.getRawValue();
        if (!program_id || !program_level_id || !week_start) {
            return null;
        }
        return { programLevelId: program_level_id, weekStart: toApiDate(mondayOf(week_start)) };
    }

    private syncHeader(key: HeaderKey): Observable<unknown> {
        const current = this.timetable();
        if (this.headerLocked() || (current && current.program_level_id === key.programLevelId && current.week_start === key.weekStart)) {
            return EMPTY;
        }
        const payload = this.createPayload(key);
        if (!payload) {
            return EMPTY;
        }

        this.headerSyncing.set(true);
        this.headerError.set(null);
        this.existingTimetableId.set(null);

        const remove$ = current
            ? this.timetableService.delete(current.id).pipe(
                  tap(() => {
                      this.timetable.set(null);
                      this.createdHere = false;
                  })
              )
            : of(undefined);

        return remove$.pipe(
            switchMap(() => this.timetableService.create(payload)),
            tap((created) => {
                const previousYear = current?.academic_year_id;
                this.timetable.set(created);
                this.createdHere = true;
                this.headerSyncing.set(false);
                // L'URL désigne l'horaire créé : un rechargement rouvre la même page en édition.
                this.location.replaceState(`${TIMETABLE_PATH}/${created.id}/edit`);
                if (previousYear && previousYear !== created.academic_year_id) {
                    this.assignmentsByCourse.set({});
                }
            }),
            catchError((error: unknown) => {
                this.headerSyncing.set(false);
                this.onHeaderError(error, key);
                return EMPTY;
            })
        );
    }

    private createPayload(key: HeaderKey): CreateTimetableRequest | null {
        const year = this.currentYear();
        if (!year) {
            this.headerError.set('Aucune année académique en cours : l’horaire ne peut pas être créé.');
            return null;
        }
        const program = this.programs().find((item) => item.id === this.headerForm.controls.program_id.value);
        const level = program?.levels?.find((item) => item.id === key.programLevelId);
        if (!program || !level) {
            return null;
        }
        return {
            academic_year_id: year.id,
            faculty_id: program.faculty_id,
            faculty_name: program.faculty_name ?? '',
            program_id: program.id,
            program_name: program.name,
            program_level_id: level.id,
            program_level_name: level.level.name,
            week_start: key.weekStart
        };
    }

    private onHeaderError(error: unknown, key: HeaderKey): void {
        if (!(error instanceof HttpErrorResponse)) {
            this.headerError.set('Impossible de créer l’horaire.');
            return;
        }
        this.headerError.set(timetableErrorMessage(error));
        if (error.status !== 409) {
            return;
        }
        // 409 : un horaire existe peut-être déjà pour ce niveau et cette semaine.
        this.timetableService
            .list({ programLevelId: key.programLevelId, week: key.weekStart, page: 0, size: 1 })
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((page) => {
                const existing = page?.content[0];
                if (existing && existing.week_start === key.weekStart) {
                    this.existingTimetableId.set(existing.id);
                }
            });
    }

    // ----- Écritures -----

    private executePlan(timetableId: string, plan: SavePlan): Observable<SaveFailure[]> {
        const failures: SaveFailure[] = [];

        const deletes$ = from(plan.toDelete).pipe(
            concatMap((id) =>
                this.entryService.delete(id).pipe(
                    tap(() => this.persisted.update((entries) => entries.filter((entry) => entry.id !== id))),
                    catchError((error: unknown) => {
                        failures.push({ line: null, message: `Une séance n’a pas pu être supprimée : ${this.describe(error)}` });
                        return EMPTY;
                    })
                )
            )
        );

        const updates$ = from(plan.toUpdate).pipe(
            concatMap((item) =>
                this.entryService.update(item.id, item.payload).pipe(
                    tap((updated) => this.persisted.update((entries) => entries.map((entry) => (entry.id === item.id ? updated : entry)))),
                    catchError((error: unknown) => {
                        failures.push({ line: item.line, day: item.day, message: this.describe(error) });
                        return EMPTY;
                    })
                )
            )
        );

        const creates$ =
            plan.toCreate.length === 0
                ? EMPTY
                : defer(() => this.entryService.create({ timetable_id: timetableId, entries: plan.toCreate.map((item) => item.payload) })).pipe(
                      tap((created) => this.registerCreated(plan.toCreate, created)),
                      catchError((error: unknown) => {
                          failures.push(...this.batchFailures(plan.toCreate, error));
                          return EMPTY;
                      })
                  );

        return concat(deletes$, updates$, creates$).pipe(
            toArray(),
            map(() => failures)
        );
    }

    /** Le lot est créé dans l'ordre de la requête : la i-ème réponse est la i-ème séance planifiée. */
    private registerCreated(planned: readonly PlannedEntry[], created: readonly TimetableEntry[]): void {
        planned.forEach((item, index) => {
            const entry = created[index];
            const line = this.lines.at(item.line);
            if (!entry || !line) {
                return;
            }
            line.controls.entry_ids.setValue({ ...line.controls.entry_ids.value, [item.day]: entry.id });
        });
        this.persisted.update((entries) => [...entries, ...created]);
    }

    private batchFailures(planned: readonly PlannedEntry[], error: unknown): SaveFailure[] {
        if (error instanceof HttpErrorResponse && error.status === 422) {
            const failures = readBatchErrors(error).flatMap((item) => {
                const origin = planned[item.index];
                return origin ? [{ line: origin.line, day: origin.day, message: item.message || item.code }] : [];
            });
            if (failures.length > 0) {
                return failures;
            }
        }
        return [{ line: null, message: this.describe(error) }];
    }

    private onSaved(failures: SaveFailure[]): void {
        this.saving.set(false);
        this.applyFormState();

        if (failures.length === 0) {
            this.lines.markAsPristine();
            this.leaveAllowed = true;
            void this.router.navigate([TIMETABLE_PATH, 'pending'], { state: { saved: true } });
            return;
        }

        const byLine: Record<number, string[]> = {};
        const general: string[] = [];
        for (const failure of failures) {
            if (failure.line === null) {
                general.push(failure.message);
                continue;
            }
            const message = failure.day ? `${weekDayLabel(failure.day)} : ${failure.message}` : failure.message;
            byLine[failure.line] = [...(byLine[failure.line] ?? []), message];
        }
        this.lineErrors.set(byLine);
        this.saveError.set(
            general.length > 0 ? general.join(' ') : 'Certaines sessions n’ont pas été enregistrées : corrigez les lignes signalées puis réessayez.'
        );
    }

    private discardTimetable(timetable: Timetable): Observable<boolean> {
        return this.timetableService.delete(timetable.id).pipe(
            map(() => true),
            catchError(() => of(true))
        );
    }

    // ----- Outils -----

    private createLine(line?: SessionLine): LineForm {
        return this.fb.group(
            {
                course_id: this.fb.control<string | null>(line?.course_id ?? null, Validators.required),
                course_assignment_id: this.fb.control<string | null>(line?.course_assignment_id ?? null, Validators.required),
                start: this.fb.control<Date | null>(line ? parseApiTime(line.start_hour) : null, Validators.required),
                end: this.fb.control<Date | null>(line ? parseApiTime(line.end_hour) : null, Validators.required),
                days: this.fb.nonNullable.control<WeekDay[]>(line?.days ?? [], Validators.required),
                room_id: this.fb.control<string | null>(line?.room_id ?? null, Validators.required),
                session_type: this.fb.nonNullable.control<SessionType>(line?.session_type ?? 'LECTURE', Validators.required),
                note: this.fb.nonNullable.control(line?.note ?? ''),
                entry_ids: this.fb.nonNullable.control<Partial<Record<WeekDay, string>>>(line?.entry_ids ?? {})
            },
            { validators: endAfterStart }
        );
    }

    private setLines(lines: SessionLine[]): void {
        this.lines.clear();
        for (const line of lines) {
            this.lines.push(this.createLine(line));
        }
        this.lines.markAsPristine();
        this.refreshRows();
        for (const courseId of new Set(lines.map((line) => line.course_id).filter(Boolean))) {
            this.ensureAssignments(courseId);
        }
    }

    private refreshRows(): void {
        this.lineRows.set([...this.lines.controls]);
    }

    /** Valeurs des lignes, à n'appeler qu'une fois le tableau validé. */
    private lineValues(): SessionLine[] {
        return this.lines.getRawValue().map((value) => ({
            course_id: value.course_id ?? '',
            course_assignment_id: value.course_assignment_id ?? '',
            start_hour: value.start ? toApiTime(value.start) : '',
            end_hour: value.end ? toApiTime(value.end) : '',
            days: value.days,
            room_id: value.room_id ?? '',
            session_type: value.session_type,
            note: value.note,
            entry_ids: value.entry_ids
        }));
    }

    private applyFormState(): void {
        if (this.headerLocked()) {
            this.headerForm.disable({ emitEvent: false });
        } else {
            this.headerForm.enable({ emitEvent: false });
        }
        if (this.readOnly()) {
            this.lines.disable({ emitEvent: false });
        } else {
            this.lines.enable({ emitEvent: false });
        }
    }

    private describe(error: unknown): string {
        return error instanceof HttpErrorResponse ? timetableErrorMessage(error) : 'Erreur inattendue.';
    }
}
