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
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
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
import { SESSION_TYPE_OPTIONS, SessionType, TimetableEntry, sessionTypeLabel } from '../../models/timetable-entry.model';
import {
    CreateTimetableRequest,
    Timetable,
    TimetableStatusAction,
    timetableStatusActions,
    timetableStatusLabel,
    timetableStatusSeverity
} from '../../models/timetable.model';
import { SessionLine, WEEK_DAY_OPTIONS, WeekDay, weekDayLabel } from '../../models/timetable-session.model';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { TimetableScopeService } from '../../services/timetable-scope.service';
import { TimetableService } from '../../services/timetable.service';
import { programLevelOptions } from '../../utils/program-level';
import { readBatchErrors, timetableErrorMessage } from '../../utils/timetable-error';
import { TIMETABLE_PATH } from '../../utils/timetable-routes';
import { PlannedEntry, SavePlan, findOverlappingLines, groupEntriesIntoLines, planSave } from '../../utils/timetable-session';
import { formatEntryTime, isEndAfterStart, mondayOf, parseApiDate, parseApiTime, toApiDate, toApiTime } from '../../utils/timetable-time';
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
 * (programme, niveau, semaine) et la liste des sessions, saisies une à une dans une fenêtre.
 *
 * <p>Les références sont chargées à la demande et sans message d'attente : les salles à la
 * première ouverture de la fenêtre, les professeurs d'un cours quand il est choisi. Les erreurs
 * ne s'affichent qu'à la soumission (validation de la fenêtre ou enregistrement).
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
    imports: [ReactiveFormsModule, ButtonModule, ConfirmDialogModule, DatePicker, DialogModule, MultiSelectModule, SelectModule, TableModule, TagModule, Textarea, ToastModule, ContentSubtopbar],
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
    /** Un SAF ne crée des horaires que pour les programmes de sa faculté. */
    private readonly scope = inject(TimetableScopeService);
    private readonly facultyId = this.scope.facultyId();

    readonly weekDayOptions = WEEK_DAY_OPTIONS;
    readonly sessionTypeOptions = SESSION_TYPE_OPTIONS;
    readonly minWeekDate = mondayOf(new Date());
    /** Seul le lundi, jour de début de la semaine, est sélectionnable. */
    readonly nonMondays = [0, 2, 3, 4, 5, 6];

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
    readonly statusChanging = signal(false);
    readonly statusError = signal<string | null>(null);
    readonly lineErrors = signal<Record<number, string[]>>({});
    readonly submitted = signal(false);
    readonly programsLoading = signal(true);
    readonly roomsLoading = signal(false);

    readonly dialogVisible = signal(false);
    /** Ligne modifiée dans la fenêtre, ou `null` pour une nouvelle session. */
    readonly editingIndex = signal<number | null>(null);
    readonly sessionSubmitted = signal(false);
    readonly dialogTitle = computed(() => (this.editingIndex() === null ? 'Nouvelle session' : 'Modifier la session'));

    private readonly selectedProgramId = signal<string | null>(null);

    readonly headerForm = this.fb.group({
        program_id: this.fb.control<string | null>(null, Validators.required),
        program_level_id: this.fb.control<string | null>(null, Validators.required),
        week_start: this.fb.control<Date | null>(null, Validators.required)
    });
    readonly lines = this.fb.array<LineForm>([]);
    /** Formulaire de la fenêtre de saisie, recopié dans `lines` à la validation. */
    readonly sessionForm = this.createLine();

    readonly title = computed(() => (this.editId() ? 'Modifier un horaire' : 'Nouvel horaire'));
    /** Barre d'actions à la manière d'Odoo : les transitions du statut, puis le retour. */
    readonly actions = computed<SubtopbarAction[]>(() => [
        { label: 'Retour', icon: 'pi pi-arrow-left', severity: 'secondary', outlined: true, routerLink: TIMETABLE_PATH },
        ...this.statusActions().map((action) => ({
            label: action.label,
            icon: action.icon,
            severity: action.severity,
            outlined: action.severity === 'secondary',
            loading: this.statusChanging(),
            disabled: this.statusChanging() || this.saving(),
            command: () => this.changeStatus(action)
        })),
    ]);
    readonly canEditEntries = computed(() =>
        this.permissionService.hasAnyPermission([
            SchedulingPermission.TimetableEntryCreateAll,
            SchedulingPermission.TimetableEntryUpdateAll,
            SchedulingPermission.TimetableEntryDeleteAll
        ])
    );
    readonly validated = computed(() => this.timetable()?.status === 'VALIDATED');
    readonly readOnly = computed(() => this.validated() || !this.canEditEntries());
    readonly canChangeStatus = computed(() => this.permissionService.hasAnyPermission([SchedulingPermission.TimetableUpdateAll]));
    readonly statusActions = computed<TimetableStatusAction[]>(() => {
        const timetable = this.timetable();
        return timetable && this.canChangeStatus() ? timetableStatusActions(timetable.status) : [];
    });
    readonly statusLabel = computed(() => {
        const timetable = this.timetable();
        return timetable ? timetableStatusLabel(timetable.status) : null;
    });
    readonly statusSeverity = computed(() => {
        const timetable = this.timetable();
        return timetable ? timetableStatusSeverity(timetable.status) : 'secondary';
    });
    readonly headerLocked = computed(() => this.persisted().length > 0 || this.validated());
    readonly programOptions = computed(() => this.programs().map((program) => ({ label: program.name, value: program.id })));
    readonly levelOptions = computed(() => programLevelOptions(this.programs(), this.selectedProgramId()));

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

        // Une date saisie au clavier est ramenée au lundi : le champ affiche le jour de début.
        this.headerForm.controls.week_start.valueChanges.pipe(takeUntilDestroyed()).subscribe((week) => {
            if (week && week.getDay() !== 1) {
                this.headerForm.controls.week_start.setValue(mondayOf(week), { emitEvent: false });
            }
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

    // ----- Sessions -----

    openSessionDialog(index: number | null = null): void {
        this.ensureRooms();
        const source = index === null ? null : this.lines.at(index);
        this.sessionForm.reset(
            source
                ? source.getRawValue()
                : { course_id: null, course_assignment_id: null, start: null, end: null, days: [], room_id: null, session_type: 'LECTURE', note: '', entry_ids: {} }
        );
        this.editingIndex.set(index);
        this.sessionSubmitted.set(false);
        this.dialogVisible.set(true);
        const courseId = this.sessionForm.controls.course_id.value;
        if (courseId) {
            this.ensureAssignments(courseId);
        }
    }

    closeSessionDialog(): void {
        this.dialogVisible.set(false);
    }

    onSessionCourseChange(): void {
        this.sessionForm.controls.course_assignment_id.setValue(null);
        const courseId = this.sessionForm.controls.course_id.value;
        if (courseId) {
            this.ensureAssignments(courseId);
        }
    }

    /** Valide la fenêtre : la session rejoint la liste, ou remplace la ligne modifiée. */
    submitSession(): void {
        this.sessionSubmitted.set(true);
        if (this.sessionIssues().length > 0) {
            return;
        }
        const value = this.sessionForm.getRawValue();
        const index = this.editingIndex();
        if (index === null) {
            const line = this.createLine();
            line.setValue({ ...value, entry_ids: {} });
            this.lines.push(line);
        } else {
            const line = this.lines.at(index);
            line.setValue({ ...value, entry_ids: line.controls.entry_ids.value });
        }
        this.lines.markAsDirty();
        this.lineErrors.set({});
        this.refreshRows();
        this.dialogVisible.set(false);
    }

    removeLine(index: number): void {
        this.lines.removeAt(index);
        this.lines.markAsDirty();
        this.lineErrors.set({});
        this.refreshRows();
    }

    /** Erreurs de la fenêtre, affichées seulement après une tentative de validation. */
    sessionIssues(): string[] {
        if (!this.sessionSubmitted()) {
            return [];
        }
        const form = this.sessionForm;
        const controls = form.controls;
        const issues: string[] = [];

        if (controls.course_id.invalid) {
            issues.push('Choisissez un cours.');
        } else if (controls.course_assignment_id.invalid) {
            issues.push(
                this.assignmentsLoaded(form) && this.assignmentOptions(form).length === 0
                    ? 'Aucun professeur n’est affecté à ce cours pour l’année de l’horaire.'
                    : 'Choisissez le professeur.'
            );
        }
        if (controls.start.invalid || controls.end.invalid) {
            issues.push('Renseignez l’heure de début et de fin.');
        } else if (form.hasError('endBeforeStart')) {
            issues.push('L’heure de fin doit être après l’heure de début.');
        }
        if (controls.days.invalid) {
            issues.push('Sélectionnez au moins un jour.');
        }
        if (controls.room_id.invalid) {
            issues.push('Choisissez une salle.');
        }
        if (issues.length === 0) {
            const overlapping = this.overlappingLines(form, this.editingIndex());
            if (overlapping.length > 0) {
                issues.push(`Chevauche la ligne ${overlapping.map((other) => other + 1).join(', ')} sur un même jour.`);
            }
        }
        return issues;
    }

    /** Erreurs d'une ligne de la liste, connues seulement après « Enregistrer ». */
    lineIssues(line: LineForm, index: number): string[] {
        const incomplete = this.submitted() && line.invalid ? ['Session incomplète : modifiez-la pour la compléter.'] : [];
        return [...incomplete, ...(this.lineErrors()[index] ?? [])];
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

    courseLabel(line: LineForm): string {
        const courseId = line.controls.course_id.value;
        if (!courseId) {
            return '—';
        }
        const course = this.courses().find((item) => item.id === courseId);
        return course?.name ?? this.savedEntry(line, (entry) => entry.course_id === courseId)?.course_name ?? '—';
    }

    roomLabel(line: LineForm): string {
        const roomId = line.controls.room_id.value;
        const room = this.rooms().find((item) => item.id === roomId);
        return room?.name ?? this.savedEntry(line, (entry) => entry.room_id === roomId)?.room_name ?? '—';
    }

    hoursLabel(line: LineForm): string {
        const { start, end } = line.controls;
        return start.value && end.value ? `${formatEntryTime(toApiTime(start.value))} – ${formatEntryTime(toApiTime(end.value))}` : '—';
    }

    daysLabel(line: LineForm): string {
        return [...line.controls.days.value].sort((a, b) => a - b).map(weekDayLabel).join(', ') || '—';
    }

    typeLabel(line: LineForm): string {
        return sessionTypeLabel(line.controls.session_type.value);
    }

    // ----- Enregistrement -----

    save(): void {
        this.submitted.set(true);
        this.saveError.set(null);
        this.statusError.set(null);
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

    // ----- Statut -----

    /**
     * Le statut porte sur ce qui est enregistré : des sessions modifiées mais pas enregistrées
     * seraient soumises ou validées sans que le validateur les voie.
     */
    changeStatus(action: TimetableStatusAction): void {
        this.statusError.set(null);
        const timetable = this.timetable();
        if (!timetable || this.statusChanging()) {
            return;
        }
        if (this.lines.dirty && !this.readOnly()) {
            this.statusError.set('Enregistrez d’abord les sessions modifiées.');
            return;
        }
        if (action.target === 'SUBMITTED' && timetable.status === 'DRAFT' && this.persisted().length === 0) {
            this.statusError.set('Enregistrez au moins une session avant de soumettre l’horaire.');
            return;
        }
        this.confirmationService.confirm({
            header: action.label,
            message: action.confirmation,
            icon: 'pi pi-question-circle',
            acceptLabel: action.label,
            rejectLabel: 'Annuler',
            accept: () => this.applyStatus(timetable, action)
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

    /** Programmes proposés : ceux de sa faculté pour un SAF, aucun s'il n'en a pas. */
    private scopedPrograms(): Observable<Program[]> {
        if (this.scope.facultyMissing()) {
            this.loadError.set('Votre compte n’est rattaché à aucune faculté : demandez à un administrateur de le compléter.');
            return of([]);
        }
        return this.facultyId ? this.programService.getByFaculty(this.facultyId) : this.programService.getAll();
    }

    private loadReferences(): void {
        forkJoin({
            programs: this.scopedPrograms().pipe(
                catchError(() => {
                    this.loadError.set('Impossible de charger les programmes.');
                    return of([] as Program[]);
                })
            ),
            year: this.catalog.getCurrentAcademicYear().pipe(catchError(() => of(null)))
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(({ programs, year }) => {
                this.programs.set(programs);
                this.currentYear.set(year);
                this.programsLoading.set(false);
            });
    }

    /** Les salles ne servent qu'à la saisie : chargées à la première ouverture de la fenêtre. */
    private ensureRooms(): void {
        if (this.roomsLoading() || this.rooms().length > 0) {
            return;
        }
        this.roomsLoading.set(true);
        this.roomService
            .getAll()
            .pipe(
                catchError(() => of([] as Room[])),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((rooms) => {
                this.rooms.set([...rooms].sort((a, b) => a.name.localeCompare(b.name)));
                this.roomsLoading.set(false);
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
        for (const line of [...this.lines.controls, this.sessionForm]) {
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

    private applyStatus(timetable: Timetable, action: TimetableStatusAction): void {
        this.statusChanging.set(true);
        this.timetableService
            .changeStatus(timetable.id, { status: action.target })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (updated) => {
                    this.timetable.set(updated);
                    this.statusChanging.set(false);
                    // Un horaire qui a franchi une étape n'est plus un brouillon abandonné.
                    this.createdHere = false;
                    this.submitted.set(false);
                    this.applyFormState();
                    this.messageService.add({ severity: 'success', summary: 'Horaire', detail: action.success });
                },
                error: (error: unknown) => {
                    this.statusChanging.set(false);
                    this.statusError.set(this.describe(error));
                }
            });
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

    /** Séance enregistrée d'une ligne qui satisfait `match`, pour afficher ses libellés. */
    private savedEntry(line: LineForm, match: (entry: TimetableEntry) => boolean): TimetableEntry | undefined {
        const ids = Object.values(line.controls.entry_ids.value);
        return this.persisted().find((entry) => ids.includes(entry.id) && match(entry));
    }

    /** Index des autres lignes que `form` chevaucherait, en ignorant la ligne `skip` qu'il remplace. */
    private overlappingLines(form: LineForm, skip: number | null): number[] {
        const toLine = (group: LineForm) => {
            const value = group.getRawValue();
            return {
                days: value.days,
                start_hour: value.start ? toApiTime(value.start) : '',
                end_hour: value.end ? toApiTime(value.end) : ''
            };
        };
        const candidate = toLine(form);
        return this.lines.controls.flatMap((line, index) => {
            if (index === skip) {
                return [];
            }
            return findOverlappingLines([candidate, toLine(line)]).size > 0 ? [index] : [];
        });
    }

    private describe(error: unknown): string {
        return error instanceof HttpErrorResponse ? timetableErrorMessage(error) : 'Erreur inattendue.';
    }
}
