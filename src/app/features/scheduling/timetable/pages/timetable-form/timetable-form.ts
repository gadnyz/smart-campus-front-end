import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
import { SchedulingResource } from '../../../permissions/permission.model';
import { RoomService } from '../../../services/room.service';
import { SESSION_TYPE_OPTIONS, SessionType, TimetableEntry, isHostedBy, sessionTypeLabel } from '../../models/timetable-entry.model';
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
import { programLevelLabel, programLevelOptions } from '../../utils/program-level';
import { readBatchErrors, timetableErrorMessage } from '../../utils/timetable-error';
import { goBack } from '@/app/shared/navigation/go-back';
import { TIMETABLE_PATH } from '../../utils/timetable-routes';
import { toCalendarSession } from '../../utils/timetable-events';
import { printableFromTimetable } from '../../utils/timetable-print-grid';
import { PrintableTimetable } from '../../models/timetable-print.model';
import { ProfessorLabelService } from '../../services/professor-label.service';
import { TimetableExportMenu } from '../../components/timetable-export-menu/timetable-export-menu';
import { PlannedEntry, SavePlan, dayOfWeek, findOverlappingLines, groupEntriesIntoLines, planSave } from '../../utils/timetable-session';
import { addDays, formatEntryTime, isEndAfterStart, mondayOf, parseApiDate, parseApiTime, toApiDate, toApiTime } from '../../utils/timetable-time';
import { TimeSlotInput } from '../../components/time-slot-input/time-slot-input';
import { minutesOf, slotDate } from '../../utils/time-slots';
import { pickSessionAssignment } from '../../utils/session-teacher';
import { readableApiText } from '@/app/shared/http/readable-api-text';
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
    shared_with: FormControl<string[]>;
    entry_ids: FormControl<Partial<Record<WeekDay, string>>>;
}>;

interface HeaderKey {
    programLevelId: string;
    weekStart: string;
}

/** Échec d'une écriture ; `line` est `null` quand l'erreur ne se rattache à aucune ligne. */
export interface SaveFailure {
    line: number | null;
    day?: WeekDay;
    message: string;
}

const HEADER_SYNC_DELAY_MS = 400;
/** Durée proposée quand l'heure de début est choisie avant celle de fin. */
const DEFAULT_SESSION_MINUTES = 120;
const LAST_MINUTE_OF_DAY = 23 * 60 + 59;
/** Au-delà, les erreurs restantes sont résumées en un seul message. */
const MAX_ERROR_TOASTS = 4;

/** Champs de la fenêtre de session qui portent une erreur, affichée sous le champ. */
export type SessionField = 'course' | 'time' | 'days' | 'room';

/** Une promotion de la faculté : un niveau d'un programme. */
interface Promotion {
    id: string;
    /** Le niveau commun (L1, L4…), pour reconnaître les promotions d'un même niveau. */
    levelId: string;
    program: Program;
    /** « Génie Logiciel L4 ». */
    label: string;
}

/** Les cours de chaque promotion de la faculté. */
type CoursesByPromotion = Record<string, ReadonlySet<string>>;

/** « A », « A et B », « A, B et C ». */
export function joinNames(names: readonly string[]): string {
    return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} et ${names.at(-1)}`;
}

/**
 * Un message par ligne et par erreur, avec les jours concernés, au lieu d'un message par jour :
 * « Ligne 2 · Audit Informatique — lundi, mardi : La salle 402 A est déjà réservée… ».
 */
export function groupFailures(failures: readonly SaveFailure[], courseOf: (line: number) => string): string[] {
    const groups = new Map<string, { line: number | null; message: string; days: WeekDay[] }>();
    for (const failure of failures) {
        const key = `${failure.line ?? '-'}|${failure.message}`;
        const group = groups.get(key) ?? { line: failure.line, message: failure.message, days: [] };
        if (failure.day && !group.days.includes(failure.day)) {
            group.days.push(failure.day);
        }
        groups.set(key, group);
    }
    return [...groups.values()].map(({ line, message, days }) => {
        if (line === null) {
            return message;
        }
        const when = days.length ? ` — ${joinNames([...days].sort((a, b) => a - b).map((day) => weekDayLabel(day).toLocaleLowerCase('fr-FR')))}` : '';
        return `Ligne ${line + 1} · ${courseOf(line)}${when} : ${message}`;
    });
}

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
    imports: [
        FormsModule,
        ReactiveFormsModule,
        ButtonModule,
        ConfirmDialogModule,
        DatePicker,
        DialogModule,
        MultiSelectModule,
        SelectModule,
        TableModule,
        TagModule,
        Textarea,
        ToastModule,
        ContentSubtopbar,
        TimetableExportMenu,
        TimeSlotInput
    ],
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
    /** Séances hébergées par cette promotion : les seules qui se modifient ici. */
    readonly hostedEntries = computed(() => {
        const programLevelId = this.timetable()?.program_level_id ?? '';
        return this.persisted().filter((entry) => isHostedBy(entry, programLevelId));
    });
    /** Séances d'une autre promotion auxquelles celle-ci assiste (tronc commun) : en lecture seule. */
    readonly sharedInEntries = computed(() => {
        const programLevelId = this.timetable()?.program_level_id ?? '';
        return this.persisted()
            .filter((entry) => !isHostedBy(entry, programLevelId))
            .sort((a, b) => a.date.localeCompare(b.date) || a.start_hour.localeCompare(b.start_hour));
    });
    /** Les promotions de la faculté : chaque niveau de chaque programme. */
    readonly promotions = computed<Promotion[]>(() =>
        this.programs().flatMap((program) =>
            (program.levels ?? []).map((level) => ({ id: level.id, levelId: level.level.id, program, label: `${program.name} ${programLevelLabel(level)}` }))
        )
    );
    /** « Génie Logiciel L4 » pour chaque promotion de la faculté. */
    readonly promotionLabels = computed(() => new Map(this.promotions().map((promotion) => [promotion.id, promotion.label] as const)));
    /** Cours de chaque promotion de la faculté, pour savoir où un cours est aussi donné. `null` : pas encore chargé. */
    readonly coursesByPromotion = signal<CoursesByPromotion | null>(null);
    /**
     * Noms des identifiants que l'API peut citer dans un message (promotion, salle, cours,
     * enseignant) : aucun identifiant technique ne doit s'afficher.
     */
    readonly idLabels = computed(() => {
        const labels = new Map<string, string>(this.promotionLabels());
        for (const room of this.rooms()) {
            labels.set(room.id, room.name);
        }
        for (const course of this.courses()) {
            labels.set(course.id, course.name);
        }
        for (const assignment of Object.values(this.assignmentsByCourse()).flat()) {
            labels.set(assignment.id, this.teacherName(assignment));
            labels.set(assignment.professor_id, this.teacherName(assignment));
        }
        for (const entry of this.persisted()) {
            labels.set(entry.room_id, entry.room_name);
            labels.set(entry.course_id, entry.course_name || entry.course_code);
            labels.set(entry.professor_id, entry.professor_name);
        }
        return labels;
    });
    /** Avertissements non bloquants des écritures en cours (enseignant déjà pris…). */
    private saveWarnings: string[] = [];
    /** Horaires des promotions invitées créés pendant l'enregistrement, annoncés après. */
    private createdGuestNotes: string[] = [];
    /** Horaire de chaque promotion invitée pour une semaine, une fois connu (`programLevelId|week`). */
    private readonly guestTimetables = new Map<string, Timetable>();

    readonly duplicateVisible = signal(false);
    readonly duplicateWeek = signal<Date | null>(null);
    readonly duplicating = signal(false);
    readonly canDuplicate = computed(
        () => !!this.editId() && this.hostedEntries().length > 0 && this.permissionService.canWrite(`${SchedulingResource.Timetable}:create`)
    );
    /** Enseignants avec leur grade, pour les exports (« C.C Ortega KABWE »). */
    private readonly professorNames = toSignal(inject(ProfessorLabelService).labels(), { initialValue: new Map<string, string>() });
    /** Séances enregistrées, au format « Horaire Faculté » : l'export reflète le serveur. */
    readonly exportDocuments = computed<PrintableTimetable[]>(() => {
        const timetable = this.timetable();
        if (!timetable || this.persisted().length === 0) {
            return [];
        }
        const labels = this.professorNames();
        return [printableFromTimetable(timetable, this.persisted().map((entry) => toCalendarSession(entry, labels)), this.programs())];
    });
    readonly lineRows = signal<LineForm[]>([]);

    readonly editId = signal<string | null>(null);
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);
    readonly headerSyncing = signal(false);
    readonly existingTimetableId = signal<string | null>(null);
    readonly saving = signal(false);
    readonly statusChanging = signal(false);
    /** Lignes refusées par le serveur au dernier enregistrement ; le détail est dans un toast. */
    readonly rejectedLines = signal<ReadonlySet<number>>(new Set());
    readonly submitted = signal(false);
    readonly programsLoading = signal(true);
    readonly roomsLoading = signal(false);
    /** Cours du niveau et leurs enseignants en cours de chargement. */
    readonly coursesLoading = signal(false);
    /**
     * Cours proposés dans la fenêtre : ceux qui ont un enseignant pour l'année de l'horaire. Le
     * professeur n'est pas choisi : c'est le titulaire, sinon le premier assistant ajouté.
     */
    readonly schedulableCourses = computed(() => {
        const assignments = this.assignmentsByCourse();
        return this.courses().filter((course) => pickSessionAssignment(assignments[course.id] ?? []) !== null);
    });

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
        // Revient à l'écran d'où l'on vient (calendrier, liste…), le calendrier à défaut.
        { label: 'Retour', icon: 'pi pi-arrow-left', severity: 'secondary', outlined: true, command: () => this.back() },
        ...this.statusActions().map((action) => ({
            label: action.label,
            icon: action.icon,
            severity: action.severity,
            outlined: action.severity === 'secondary',
            loading: this.statusChanging(),
            disabled: this.statusChanging() || this.saving(),
            command: () => this.changeStatus(action)
        })),
        ...(this.canDuplicate()
            ? [{ label: 'Dupliquer', icon: 'pi pi-copy', severity: 'secondary' as const, outlined: true, disabled: this.saving(), command: () => this.openDuplicate() }]
            : [])
    ]);
    /** Modifier les séances, à la portée de sa faculté ou partout. */
    readonly canEditEntries = computed(() =>
        ['create', 'update', 'delete'].some((action) => this.permissionService.canWrite(`${SchedulingResource.TimetableEntry}:${action}`))
    );
    readonly validated = computed(() => this.timetable()?.status === 'VALIDATED');
    readonly readOnly = computed(() => this.validated() || !this.canEditEntries());
    readonly canChangeStatus = computed(() => this.permissionService.canWrite(`${SchedulingResource.Timetable}:update`));
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

        // Les cours du niveau, puis leurs enseignants : seuls les cours qui en ont un sont proposés.
        this.levelChanges
            .pipe(
                tap((levelId) => this.coursesLoading.set(!!levelId)),
                switchMap((levelId) =>
                    levelId
                        ? this.courseService.getByProgramLevel(levelId).pipe(
                              catchError(() => of([] as Course[])),
                              switchMap((courses) => this.loadAssignments(courses.map((course) => course.id)).pipe(map(() => courses)))
                          )
                        : of([] as Course[])
                ),
                takeUntilDestroyed()
            )
            .subscribe((courses) => {
                this.courses.set(courses);
                this.coursesLoading.set(false);
            });

        // Comme dans Teams : déplacer le début déplace la fin, la durée est gardée ; sans fin, 2 h.
        let previousStart: Date | null = null;
        this.sessionForm.controls.start.valueChanges.pipe(takeUntilDestroyed()).subscribe((start) => {
            const end = this.sessionForm.controls.end.value;
            if (start && !this.sessionForm.controls.start.pristine) {
                const duration = previousStart && end ? minutesOf(end) - minutesOf(previousStart) : DEFAULT_SESSION_MINUTES;
                if (!end || (previousStart && duration > 0)) {
                    this.sessionForm.controls.end.setValue(slotDate(Math.min(minutesOf(start) + duration, LAST_MINUTE_OF_DAY)));
                }
            }
            previousStart = start;
        });

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
        this.ensureCoursesByPromotion();
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

    /**
     * Un nouveau cours : son enseignant est pris d'office, et la séance est partagée par défaut
     * avec les autres programmes du même niveau qui suivent ce cours (modifiable).
     */
    onSessionCourseChange(): void {
        const controls = this.sessionForm.controls;
        controls.course_assignment_id.setValue(null);
        const courseId = controls.course_id.value;
        if (courseId) {
            this.ensureAssignments(courseId);
        }
        controls.shared_with.setValue(courseId ? this.defaultAudience(courseId) : []);
    }

    /** Promotions proposées dans « Partagée avec » : celles où le cours choisi est aussi donné. */
    sessionAudienceOptions(): { label: string; value: string }[] {
        const courseId = this.sessionForm.controls.course_id.value;
        const own = this.timetable()?.program_level_id ?? this.headerForm.controls.program_level_id.value;
        const byPromotion = this.coursesByPromotion();
        const selected = new Set(this.sessionForm.controls.shared_with.value);
        return this.promotions()
            .filter((promotion) => promotion.id !== own && (selected.has(promotion.id) || (!!courseId && !!byPromotion?.[promotion.id]?.has(courseId))))
            .map((promotion) => ({ label: promotion.label, value: promotion.id }));
    }

    /** Cours de la liste, plus celui de la séance modifiée s'il n'a plus d'enseignant cette année. */
    sessionCourseOptions(): Course[] {
        const current = this.sessionForm.controls.course_id.value;
        const courses = this.schedulableCourses();
        if (!current || courses.some((course) => course.id === current)) {
            return courses;
        }
        const course = this.courses().find((item) => item.id === current);
        return course ? [...courses, course] : courses;
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
        this.rejectedLines.set(new Set());
        this.refreshRows();
        this.dialogVisible.set(false);
    }

    removeLine(index: number): void {
        this.lines.removeAt(index);
        this.lines.markAsDirty();
        this.rejectedLines.set(new Set());
        this.refreshRows();
    }

    /** Erreurs de la fenêtre par champ, affichées sous le champ après une tentative de validation. */
    sessionErrors(): Partial<Record<SessionField, string>> {
        if (!this.sessionSubmitted()) {
            return {};
        }
        const form = this.sessionForm;
        const controls = form.controls;
        const errors: Partial<Record<SessionField, string>> = {};

        if (controls.course_id.invalid) {
            errors.course = 'Choisissez un cours.';
        } else if (controls.course_assignment_id.invalid) {
            // Les cours proposés ont tous un enseignant : il est seulement en cours de chargement.
            errors.course = 'Recherche de l’enseignant du cours…';
        }
        if (controls.start.hasError('timeFormat') || controls.end.hasError('timeFormat')) {
            errors.time = 'Saisissez une heure comme 08:30 ou 8h30.';
        } else if (controls.start.invalid || controls.end.invalid) {
            errors.time = 'Renseignez l’heure de début et de fin.';
        } else if (form.hasError('endBeforeStart')) {
            errors.time = 'L’heure de fin doit être après l’heure de début.';
        }
        if (controls.days.invalid) {
            errors.days = 'Sélectionnez au moins un jour.';
        }
        if (controls.room_id.invalid) {
            errors.room = 'Choisissez une salle.';
        }
        if (Object.keys(errors).length === 0) {
            const overlapping = this.overlappingLines(form, this.editingIndex());
            if (overlapping.length > 0) {
                errors.time = `Chevauche la ligne ${overlapping.map((other) => other + 1).join(', ')} sur un même jour.`;
            }
        }
        return errors;
    }

    /** Toutes les erreurs de la fenêtre : la session n'est validée que sans aucune. */
    sessionIssues(): string[] {
        return Object.values(this.sessionErrors());
    }

    /** Erreurs d'une ligne de la liste, connues seulement après « Enregistrer ». */
    lineIssues(line: LineForm, index: number): string[] {
        return [
            ...(this.submitted() && line.invalid ? ['Session incomplète : modifiez-la pour la compléter.'] : []),
            ...(this.rejectedLines().has(index) ? ['Séance refusée : voir le message affiché.'] : [])
        ];
    }

    /** « Merlec Mpyana » : l'API donne le prénom et le nom séparément. */
    teacherName(assignment: CourseAssignment): string {
        return assignment.professor_name || [assignment.professor_first_name, assignment.professor_last_name].filter(Boolean).join(' ') || 'Enseignant';
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

    /** « Partagée avec L1 Gestion, L1 Économie » pour une ligne de tronc commun, vide sinon. */
    sharedLabel(line: LineForm): string {
        const labels = line.controls.shared_with.value.map((id) => this.promotionLabels().get(id) ?? '—');
        return labels.length ? `Partagée avec ${labels.join(', ')}` : '';
    }

    /** Séances partagées par une autre promotion, prêtes à afficher. */
    readonly sharedInRows = computed(() => {
        const weekStart = this.timetable()?.week_start ?? '';
        return this.sharedInEntries().map((entry) => {
            const day = weekStart ? dayOfWeek(weekStart, entry.date) : null;
            return {
                id: entry.id,
                day: day ? weekDayLabel(day) : entry.date,
                hours: `${formatEntryTime(entry.start_hour)} – ${formatEntryTime(entry.end_hour)}`,
                course: entry.course_name || entry.course_code,
                room: entry.room_name,
                host: this.promotionLabels().get(entry.host_program_level_id) ?? 'Autre promotion'
            };
        });
    });

    typeLabel(line: LineForm): string {
        return sessionTypeLabel(line.controls.session_type.value);
    }

    // ----- Enregistrement -----

    save(): void {
        this.submitted.set(true);
        this.rejectedLines.set(new Set());

        const timetable = this.timetable();
        if (!timetable) {
            this.notifyErrors('Enregistrement', ['Renseignez le programme, le niveau et la semaine : l’horaire est créé automatiquement.']);
            return;
        }
        if (this.headerSyncing() || this.saving()) {
            return;
        }
        if (this.lines.length === 0) {
            this.notifyErrors('Enregistrement', ['Ajoutez au moins une session.']);
            return;
        }
        this.lines.markAllAsTouched();
        if (this.lines.invalid) {
            this.notifyErrors('Enregistrement', ['Corrigez les sessions signalées avant d’enregistrer.']);
            return;
        }

        const values = this.lineValues();
        const overlaps = findOverlappingLines(values);
        if (overlaps.size > 0) {
            this.rejectedLines.set(new Set(overlaps.keys()));
            this.notifyErrors(
                'Sessions en même temps',
                [...overlaps].map(([index, others]) => `Ligne ${index + 1} : chevauche la ligne ${others.map((other) => other + 1).join(', ')} sur un même jour.`)
            );
            return;
        }

        const plan = planSave(values, timetable.week_start, this.hostedEntries());
        this.saveWarnings = [];
        this.createdGuestNotes = [];
        this.saving.set(true);
        this.prepareGuestTimetables(timetable, values)
            .pipe(
                switchMap((ready) => (ready ? this.executePlan(timetable.id, plan) : of(null))),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((failures) => {
                if (failures === null) {
                    this.saving.set(false);
                    return;
                }
                this.onSaved(failures);
            });
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
        const timetable = this.timetable();
        if (!timetable || this.statusChanging()) {
            return;
        }
        if (this.lines.dirty && !this.readOnly()) {
            this.notifyErrors(action.label, ['Enregistrez d’abord les sessions modifiées.']);
            return;
        }
        if (action.target === 'SUBMITTED' && timetable.status === 'DRAFT' && this.persisted().length === 0) {
            this.notifyErrors(action.label, ['Enregistrez au moins une session avant de soumettre l’horaire.']);
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

    /** L'export porte sur ce qui est enregistré : des sessions modifiées en seraient absentes. */
    exportBlockedReason(): string | null {
        if (this.lines.dirty && !this.readOnly()) {
            return 'Enregistrez d’abord les sessions modifiées pour les exporter.';
        }
        return this.exportDocuments().length === 0 ? 'Aucune session enregistrée à exporter.' : null;
    }

    cancel(): void {
        this.back();
    }

    /** Écran précédent ; le calendrier pour un accès direct (lien, nouvel onglet). */
    back(): void {
        goBack(this.router, this.location, [TIMETABLE_PATH]);
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
                    this.leaveAllowed = false;
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
                    this.setLines(groupEntriesIntoLines(entries.filter((entry) => isHostedBy(entry, timetable.program_level_id)), timetable.week_start));
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
        this.loadAssignments([courseId]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Affectations actives de l'année de l'horaire pour ces cours, en parallèle ; une affectation
     * d'une autre année n'est jamais retenue, même à défaut. Les cours déjà chargés sont sautés.
     */
    private loadAssignments(courseIds: readonly string[]): Observable<unknown> {
        const missing = courseIds.filter((id) => !(id in this.assignmentsByCourse()) && !this.requestedCourses.has(id));
        if (missing.length === 0) {
            return of(null);
        }
        missing.forEach((id) => this.requestedCourses.add(id));
        const yearId = this.timetable()?.academic_year_id ?? this.currentYear()?.id;
        return forkJoin(
            missing.map((courseId) =>
                this.assignmentService.getByCourse(courseId).pipe(
                    catchError(() => of([] as CourseAssignment[])),
                    map((items) => [courseId, items.filter((item) => item.status === 'ACTIVE' && (!yearId || item.academic_year_id === yearId))] as const)
                )
            )
        ).pipe(
            tap((loaded) => {
                missing.forEach((id) => this.requestedCourses.delete(id));
                this.assignmentsByCourse.update((current) => ({ ...current, ...Object.fromEntries(loaded) }));
                loaded.forEach(([courseId]) => this.autoSelectAssignment(courseId));
            })
        );
    }

    /**
     * Donne aux séances de ce cours sans enseignant le titulaire, sinon le premier assistant.
     * Lit le cours de chaque ligne au moment où la réponse arrive : une réponse tardive pour un
     * cours que l'utilisateur a déjà changé ne touche aucune ligne. Une séance enregistrée garde
     * son enseignant tant que son cours ne change pas.
     */
    private autoSelectAssignment(courseId: string): void {
        const chosen = pickSessionAssignment(this.assignmentsByCourse()[courseId] ?? []);
        if (!chosen) {
            return;
        }
        for (const line of [...this.lines.controls, this.sessionForm]) {
            if (line.controls.course_id.value === courseId && !line.controls.course_assignment_id.value) {
                line.controls.course_assignment_id.setValue(chosen.id);
            }
        }
    }

    /** Cours de chaque promotion de la faculté, chargés une fois, à la première fenêtre de session. */
    private ensureCoursesByPromotion(): void {
        if (this.coursesByPromotion() !== null || this.requestedCourses.has('*promotions*')) {
            return;
        }
        const promotions = this.promotions();
        if (promotions.length === 0) {
            return;
        }
        this.requestedCourses.add('*promotions*');
        forkJoin(
            promotions.map((promotion) =>
                this.courseService.getByProgramLevel(promotion.id).pipe(
                    catchError(() => of([] as Course[])),
                    map((courses) => [promotion.id, new Set(courses.map((course) => course.id))] as const)
                )
            )
        )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((entries) => {
                this.requestedCourses.delete('*promotions*');
                this.coursesByPromotion.set(Object.fromEntries(entries));
                // Un cours choisi avant la fin du chargement reçoit son partage par défaut.
                const controls = this.sessionForm.controls;
                if (this.dialogVisible() && controls.course_id.value && controls.shared_with.pristine && controls.shared_with.value.length === 0) {
                    controls.shared_with.setValue(this.defaultAudience(controls.course_id.value));
                }
            });
    }

    /** Les autres programmes du même niveau qui suivent ce cours : la séance leur est commune. */
    private defaultAudience(courseId: string): string[] {
        const byPromotion = this.coursesByPromotion();
        const own = this.promotions().find((promotion) => promotion.id === (this.timetable()?.program_level_id ?? this.headerForm.controls.program_level_id.value));
        if (!byPromotion || !own) {
            return [];
        }
        return this.promotions()
            .filter((promotion) => promotion.id !== own.id && promotion.levelId === own.levelId && byPromotion[promotion.id]?.has(courseId))
            .map((promotion) => promotion.id);
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
                // L'état est conservé : sans `navigationId`, « Retour » ne saurait plus revenir en arrière.
                this.location.replaceState(`${TIMETABLE_PATH}/${created.id}/edit`, '', this.location.getState());
                if (previousYear && previousYear !== created.academic_year_id) {
                    // Autre année : autres enseignants, donc autres cours proposés.
                    this.assignmentsByCourse.set({});
                    this.loadAssignments(this.courses().map((course) => course.id))
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe();
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
            this.notifyErrors('Horaire', ['Aucune année académique en cours : l’horaire ne peut pas être créé.']);
            return null;
        }
        return this.timetablePayload(key.programLevelId, key.weekStart, year.id);
    }

    /** En-tête de l'horaire d'une promotion de la faculté pour une semaine. */
    private timetablePayload(programLevelId: string, weekStart: string, academicYearId: string): CreateTimetableRequest | null {
        const program = this.programs().find((item) => item.levels?.some((level) => level.id === programLevelId));
        const level = program?.levels?.find((item) => item.id === programLevelId);
        if (!program || !level) {
            return null;
        }
        return {
            academic_year_id: academicYearId,
            faculty_id: program.faculty_id,
            faculty_name: program.faculty_name ?? '',
            program_id: program.id,
            program_name: program.name,
            program_level_id: level.id,
            program_level_name: level.level.name,
            week_start: weekStart
        };
    }

    /**
     * Une séance partagée exige, chez chaque promotion invitée, un horaire de la même semaine qui
     * ne soit pas validé. Il est créé en brouillon s'il manque ; s'il est validé, l'enregistrement
     * s'arrête avec un message qui dit quoi faire. Émet `true` si l'on peut enregistrer.
     */
    private prepareGuestTimetables(timetable: Timetable, values: readonly SessionLine[]): Observable<boolean> {
        const guests = [...new Set(values.flatMap((line) => line.shared_with))].filter((id) => id !== timetable.program_level_id);
        if (guests.length === 0) {
            return of(true);
        }
        const week = readableApiText(timetable.week_start);
        const label = (id: string) => this.promotionLabels().get(id) ?? 'une promotion invitée';

        return forkJoin(guests.map((guest) => this.guestTimetable(guest, timetable.week_start).pipe(map((found) => [guest, found] as const)))).pipe(
            switchMap((found) => {
                const validated = found.filter(([, existing]) => existing?.status === 'VALIDATED').map(([guest]) => label(guest));
                if (validated.length > 0) {
                    const several = validated.length > 1;
                    this.notifyErrors('Séance partagée', [
                        `${joinNames(validated)} ${several ? 'ont' : 'a'} déjà un horaire validé pour la semaine du ${week}. ` +
                            `Retirez ${several ? 'ces promotions' : 'cette promotion'} de « Partagée avec », ou remettez ${several ? 'leur horaire' : 'son horaire'} en brouillon.`
                    ]);
                    return of(false);
                }
                const missing = found.filter(([, existing]) => !existing).map(([guest]) => guest);
                if (missing.length === 0) {
                    return of(true);
                }
                return forkJoin(missing.map((guest) => this.createGuestTimetable(guest, timetable))).pipe(
                    map(() => {
                        this.createdGuestNotes.push(
                            `Horaire créé en brouillon pour ${joinNames(missing.map(label))}, semaine du ${week}, pour y partager les séances.`
                        );
                        return true;
                    }),
                    catchError((error: unknown) => {
                        this.notifyErrors('Séance partagée', [`L’horaire d’une promotion invitée n’a pas pu être créé : ${this.describe(error)}`]);
                        return of(false);
                    })
                );
            }),
            catchError((error: unknown) => {
                this.notifyErrors('Séance partagée', [this.describe(error)]);
                return of(false);
            })
        );
    }

    /** Horaire d'une promotion pour une semaine, ou `null` s'il n'existe pas. */
    private guestTimetable(programLevelId: string, weekStart: string): Observable<Timetable | null> {
        const key = `${programLevelId}|${weekStart}`;
        const known = this.guestTimetables.get(key);
        if (known) {
            return of(known);
        }
        // Sans filtre `week` (500 côté backend) : les horaires de la promotion, puis la semaine voulue.
        return this.timetableService.list({ programLevelId, page: 0, size: 100 }).pipe(
            map((page) => page.content.find((item) => item.week_start === weekStart) ?? null),
            tap((found) => found && this.guestTimetables.set(key, found))
        );
    }

    private createGuestTimetable(programLevelId: string, host: Timetable): Observable<Timetable> {
        const payload = this.timetablePayload(programLevelId, host.week_start, host.academic_year_id);
        if (!payload) {
            throw new Error('Promotion invitée hors de la faculté.');
        }
        return this.timetableService.create(payload).pipe(tap((created) => this.guestTimetables.set(`${programLevelId}|${host.week_start}`, created)));
    }

    private onHeaderError(error: unknown, key: HeaderKey): void {
        if (!(error instanceof HttpErrorResponse)) {
            this.notifyErrors('Horaire', ['Impossible de créer l’horaire.']);
            return;
        }
        if (error.status !== 409) {
            this.notifyErrors('Horaire', [this.describe(error)]);
            return;
        }
        // 409 : un horaire existe peut-être déjà pour ce niveau et cette semaine.
        this.timetableService
            // Sans filtre `week` (500 côté backend) : les horaires de la promotion, puis la semaine voulue.
            .list({ programLevelId: key.programLevelId, page: 0, size: 100 })
            .pipe(
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((page) => {
                const existing = page?.content.find((timetable) => timetable.week_start === key.weekStart);
                if (existing) {
                    // Le bouton « Ouvrir l’horaire existant » s'affiche sous l'en-tête.
                    this.existingTimetableId.set(existing.id);
                    this.notifyErrors('Horaire', ['Cette promotion a déjà un horaire pour cette semaine.']);
                    return;
                }
                this.notifyErrors('Horaire', [this.describe(error)]);
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
                    tap((updated) => {
                        this.collectWarnings([updated]);
                        this.persisted.update((entries) => entries.map((entry) => (entry.id === item.id ? updated : entry)));
                    }),
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
        this.collectWarnings(created);
        this.persisted.update((entries) => [...entries, ...created]);
    }

    /** Avertissement par séance : « Lundi 08:00 · Réseaux : l'enseignant enseigne déjà à cette heure ». */
    private collectWarnings(entries: readonly TimetableEntry[]): void {
        const weekStart = this.timetable()?.week_start ?? '';
        for (const entry of entries) {
            for (const warning of entry.warnings ?? []) {
                const day = weekStart ? dayOfWeek(weekStart, entry.date) : null;
                const when = `${day ? weekDayLabel(day) : entry.date} ${formatEntryTime(entry.start_hour)}`;
                this.saveWarnings.push(`${when} · ${entry.course_name || entry.course_code} : ${warning.message}`);
            }
        }
    }

    private batchFailures(planned: readonly PlannedEntry[], error: unknown): SaveFailure[] {
        if (error instanceof HttpErrorResponse && error.status === 422) {
            const failures = readBatchErrors(error).flatMap((item) => {
                const origin = planned[item.index];
                return origin ? [{ line: origin.line, day: origin.day, message: readableApiText(item.message, this.idLabels()) || item.code }] : [];
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
            void this.router.navigate([TIMETABLE_PATH, 'pending'], {
                state: { saved: true, warnings: [...new Set(this.saveWarnings)], notes: this.createdGuestNotes }
            });
            return;
        }

        this.rejectedLines.set(new Set(failures.flatMap((failure) => (failure.line === null ? [] : [failure.line]))));
        this.notifyErrors('Sessions non enregistrées', groupFailures(failures, (index) => this.courseLabel(this.lines.at(index))));
    }

    /**
     * Erreurs à corriger après un enregistrement ou une validation : en toast, jamais dans la
     * page. Au-delà de quelques messages, le reste est résumé.
     */
    private notifyErrors(summary: string, messages: readonly string[]): void {
        const shown = messages.slice(0, MAX_ERROR_TOASTS);
        for (const detail of shown) {
            this.messageService.add({ severity: 'error', summary, detail, life: 10000 });
        }
        const hidden = messages.length - shown.length;
        if (hidden > 0) {
            this.messageService.add({ severity: 'error', summary, detail: `Et ${hidden} autre${hidden > 1 ? 's' : ''} erreur${hidden > 1 ? 's' : ''}.`, life: 10000 });
        }
    }

    // ----- Duplication -----

    openDuplicate(): void {
        const timetable = this.timetable();
        if (!timetable) {
            return;
        }
        // Par défaut, la semaine qui suit celle de l'horaire.
        this.duplicateWeek.set(parseApiDate(addDays(timetable.week_start, 7)));
        this.duplicateVisible.set(true);
    }

    onDuplicateWeekChange(week: Date | null): void {
        this.duplicateWeek.set(week ? mondayOf(week) : null);
    }

    /** Copie tout ou rien : sur 422, les séances refusées sont nommées, rien n'est créé. */
    submitDuplicate(): void {
        const timetable = this.timetable();
        const week = this.duplicateWeek();
        if (!timetable || !week || this.duplicating()) {
            return;
        }
        this.duplicating.set(true);
        this.timetableService
            .duplicate(timetable.id, toApiDate(week))
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (copy) => {
                    this.duplicating.set(false);
                    this.duplicateVisible.set(false);
                    this.messageService.add({ severity: 'success', summary: 'Horaire', detail: 'Semaine dupliquée : le nouvel horaire est en brouillon.' });
                    this.leaveAllowed = true;
                    void this.router.navigate([TIMETABLE_PATH, copy.id, 'edit']);
                },
                error: (error: unknown) => {
                    this.duplicating.set(false);
                    this.notifyErrors('Aucune séance copiée', this.duplicateFailures(error));
                }
            });
    }

    /** Les positions du 422 renvoient aux séances de la semaine source, triées par date puis heure. */
    private duplicateFailures(error: unknown): string[] {
        if (!(error instanceof HttpErrorResponse)) {
            return ['La semaine n’a pas pu être dupliquée.'];
        }
        const rejected = error.status === 422 ? readBatchErrors(error) : [];
        if (rejected.length === 0) {
            return [this.describe(error)];
        }
        const weekStart = this.timetable()?.week_start ?? '';
        const source = [...this.hostedEntries()].sort((a, b) => a.date.localeCompare(b.date) || a.start_hour.localeCompare(b.start_hour));
        return rejected.map((item) => {
            const entry = source[item.index];
            const day = entry && weekStart ? dayOfWeek(weekStart, entry.date) : null;
            const where = entry ? `${day ? weekDayLabel(day) : entry.date} ${formatEntryTime(entry.start_hour)} · ${entry.course_name || entry.course_code}` : `Séance ${item.index + 1}`;
            return `${where} : ${readableApiText(item.message, this.idLabels()) || item.code}`;
        });
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
                shared_with: this.fb.nonNullable.control<string[]>(line?.shared_with ?? []),
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
            shared_with: value.shared_with,
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
                    this.notifyErrors(action.label, [this.describe(error)]);
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
        return error instanceof HttpErrorResponse ? timetableErrorMessage(error, this.idLabels()) : 'Erreur inattendue.';
    }
}
