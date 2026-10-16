import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EventClickArg, EventInput } from '@fullcalendar/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { Program, ProgramService } from '@/app/features/academic/academic.public-api';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { TimetableCalendar, TimetableCalendarRange } from '../../components/timetable-calendar/timetable-calendar';
import { TimetableExportMenu } from '../../components/timetable-export-menu/timetable-export-menu';
import { TimetableSessionDialog } from '../../components/timetable-session-dialog/timetable-session-dialog';
import { Timetable, TimetableStatus } from '../../models/timetable.model';
import { PrintableTimetable } from '../../models/timetable-print.model';
import { CalendarSession } from '../../models/timetable-view.model';
import { ProfessorLabelService } from '../../services/professor-label.service';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { TimetableScopeService, scopeQuery } from '../../services/timetable-scope.service';
import { TimetableService } from '../../services/timetable.service';
import { programLevelOptions } from '../../utils/program-level';
import { printableFromTimetable } from '../../utils/timetable-print-grid';
import { toCalendarEvent, toCalendarSession, weeksInRange } from '../../utils/timetable-events';
import { MANAGE_TIMETABLES, TIMETABLE_PATH } from '../../utils/timetable-routes';

/** Horaires validés d'une promotion lus en une fois : une semaine par horaire, soit deux années. */
const VALIDATED_PAGE_SIZE = 100;

interface LoadedWeek {
    timetable: Timetable;
    sessions: CalendarSession[];
}

interface SelectOption {
    label: string;
    value: string;
}

/**
 * Calendrier de gestion (admin Scheduling, SAF) : l'horaire VALIDÉ de la promotion choisie, semaine
 * par semaine. Un SAF ne se voit proposer que les programmes de sa faculté.
 */
@Component({
    selector: 'app-timetable-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, SelectModule, ContentSubtopbar, TimetableCalendar, TimetableExportMenu, TimetableSessionDialog],
    templateUrl: './timetable.html',
    styleUrl: './timetable.scss'
})
export class TimetablePage implements OnInit {
    private readonly timetableService = inject(TimetableService);
    private readonly entryService = inject(TimetableEntryService);
    private readonly professorLabels = inject(ProfessorLabelService);
    private readonly programService = inject(ProgramService);
    private readonly permissionService = inject(PermissionService);
    private readonly scope = inject(TimetableScopeService);
    private readonly destroyRef = inject(DestroyRef);

    readonly newTimetableLink = `${TIMETABLE_PATH}/new`;
    readonly pendingLink = `${TIMETABLE_PATH}/pending`;
    private readonly facultyId = this.scope.facultyId();

    readonly programs = signal<Program[]>([]);
    readonly programId = signal<string | null>(null);
    readonly programLevelId = signal<string | null>(null);
    readonly loadingPrograms = signal(false);
    readonly loadError = signal<string | null>(null);

    /** Semaines VALIDÉES chargées pour la période affichée, avec leurs séances. */
    readonly weeks = signal<LoadedWeek[]>([]);
    readonly events = computed<EventInput[]>(() => this.weeks().flatMap((week) => week.sessions.map(toCalendarEvent)));
    /** Semaines affichées, au format « Horaire Faculté » pour l'impression et les exports. */
    readonly exportDocuments = computed<PrintableTimetable[]>(() =>
        this.weeks().map((week) => printableFromTimetable(week.timetable, week.sessions, this.programs()))
    );
    readonly visibleRange = signal<TimetableCalendarRange | null>(null);
    readonly selectedSession = signal<CalendarSession | null>(null);
    readonly draftCount = signal(0);

    /** Mêmes droits que la route de la liste : MANAGE_TIMETABLES en mode any. */
    readonly canListPending = computed(() => this.permissionService.hasAnyPermission(MANAGE_TIMETABLES));

    readonly draftBadge = computed(() => {
        const count = this.draftCount();
        return count > 0 ? String(count) : undefined;
    });

    /** Actions de la barre de sous-titre ; chacune n'apparaît qu'avec le droit qu'elle exige. */
    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Horaires en attente',
            icon: 'pi pi-inbox',
            severity: 'secondary',
            outlined: true,
            routerLink: this.pendingLink,
            badge: this.draftBadge(),
            badgeSeverity: 'warn',
            ariaLabel: 'Afficher les horaires en attente (brouillons et soumis)',
            permissions: MANAGE_TIMETABLES,
            mode: 'any'
        },
        {
            label: 'Ajouter un horaire',
            icon: 'pi pi-plus',
            severity: 'primary',
            outlined: false,
            routerLink: this.newTimetableLink,
            ariaLabel: 'Ajouter un horaire',
            permissions: [SchedulingPermission.TimetableCreateAll]
        }
    ]);

    readonly programOptions = computed<SelectOption[]>(() => this.programs().map((program) => ({ label: program.name, value: program.id })));

    readonly programLevelOptions = computed<SelectOption[]>(() => programLevelOptions(this.programs(), this.programId()));

    /** Filtres renseignés, rappelés sur le bouton « Filtres » quand ils sont repliés (téléphone). */
    readonly activeFilters = computed(() => [this.programId(), this.programLevelId()].filter(Boolean).length);

    readonly emptyText = computed(() =>
        this.programLevelId() ? 'Aucun horaire validé sur cette période.' : 'Choisissez un programme et un niveau pour afficher leur horaire.'
    );

    constructor() {
        // Promotion ou période modifiée : on recharge, en abandonnant la requête précédente.
        toObservable(computed(() => ({ levelId: this.programLevelId(), range: this.visibleRange() })))
            .pipe(
                switchMap(({ levelId, range }) => (levelId && range ? this.loadEvents(levelId, range) : of([] as LoadedWeek[]))),
                takeUntilDestroyed()
            )
            .subscribe((weeks) => this.weeks.set(weeks));
    }

    ngOnInit(): void {
        this.loadPrograms();
        if (this.canListPending() && !this.scope.facultyMissing()) {
            this.refreshDraftCount();
        }
    }

    loadPrograms(): void {
        this.loadError.set(null);
        if (this.scope.facultyMissing()) {
            this.loadError.set('Votre compte n’est rattaché à aucune faculté : demandez à un administrateur de le compléter.');
            return;
        }
        this.loadingPrograms.set(true);

        const programs$ = this.facultyId ? this.programService.getByFaculty(this.facultyId) : this.programService.getAll();
        programs$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (programs) => {
                this.programs.set(programs);
                this.loadingPrograms.set(false);
            },
            error: () => {
                this.programs.set([]);
                this.loadingPrograms.set(false);
                this.loadError.set('Impossible de charger les programmes.');
            }
        });
    }

    onProgramChange(programId: string | null): void {
        this.programId.set(programId);
        this.programLevelId.set(null);
    }

    onProgramLevelChange(programLevelId: string | null): void {
        this.programLevelId.set(programLevelId);
    }

    onRangeChange(range: TimetableCalendarRange): void {
        this.visibleRange.set(range);
    }

    onEventSelected(event: EventClickArg): void {
        this.selectedSession.set((event.event.extendedProps['session'] as CalendarSession | undefined) ?? null);
    }

    /**
     * Un horaire par promotion et par semaine : pour chaque semaine affichée, on cherche l'horaire
     * VALIDÉ de la promotion puis ses séances. Une semaine en échec reste simplement vide.
     */
    private loadEvents(levelId: string, range: TimetableCalendarRange): Observable<LoadedWeek[]> {
        return this.professorLabels.labels().pipe(switchMap((labels) => this.loadWeeks(levelId, range, labels)));
    }

    private loadWeeks(levelId: string, range: TimetableCalendarRange, labels: ReadonlyMap<string, string>): Observable<LoadedWeek[]> {
        // Pas de filtre `week` : le backend renvoie 500 dès qu'il est fourni (paramètre date non typé
        // côté PostgreSQL dans TimetableRepository.findAllByFilters). On liste les horaires VALIDÉS
        // de la promotion et on garde ceux des semaines affichées.
        const weeks = new Set(weeksInRange(range.start, range.end));
        return this.timetableService.list({ programLevelId: levelId, status: 'VALIDATED', page: 0, size: VALIDATED_PAGE_SIZE }).pipe(
            switchMap((page) => {
                const timetables = page.content.filter((timetable) => weeks.has(timetable.week_start));
                if (timetables.length === 0) {
                    return of([] as LoadedWeek[]);
                }
                return forkJoin(
                    timetables.map((timetable) =>
                        this.entryService.getForWeek(timetable.id, timetable.week_start).pipe(
                            map((entries): LoadedWeek | null => ({ timetable, sessions: entries.map((entry) => toCalendarSession(entry, labels)) })),
                            catchError(() => of(null))
                        )
                    )
                ).pipe(map((loaded) => loaded.filter((week): week is LoadedWeek => week !== null).sort((a, b) => a.timetable.week_start.localeCompare(b.timetable.week_start))));
            }),
            catchError(() => of([] as LoadedWeek[]))
        );
    }

    /** Horaires en attente : brouillons et soumis. L'API ne filtre qu'un statut par requête. */
    private refreshDraftCount(): void {
        const count = (status: TimetableStatus) =>
            this.timetableService
                .list({ status, ...scopeQuery(this.facultyId), page: 0, size: 1 })
                .pipe(map((page) => page.total_elements));
        forkJoin([count('DRAFT'), count('SUBMITTED')])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ([drafts, submitted]) => this.draftCount.set(drafts + submitted),
                error: () => this.draftCount.set(0)
            });
    }
}
