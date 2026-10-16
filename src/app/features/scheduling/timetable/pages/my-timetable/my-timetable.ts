import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { EventClickArg, EventInput } from '@fullcalendar/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { CourseAssignmentService, ProfessorService } from '@/app/features/academic/academic.public-api';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { TimetableCalendar, TimetableCalendarRange } from '../../components/timetable-calendar/timetable-calendar';
import { TimetableExportMenu } from '../../components/timetable-export-menu/timetable-export-menu';
import { TimetableSessionDialog } from '../../components/timetable-session-dialog/timetable-session-dialog';
import { TimetableEntry } from '../../models/timetable-entry.model';
import { PrintableTimetable } from '../../models/timetable-print.model';
import { Timetable } from '../../models/timetable.model';
import { CalendarSession } from '../../models/timetable-view.model';
import { ProfessorLabelService, professorLabel } from '../../services/professor-label.service';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { PersonalTimetableKind, TimetableScopeService } from '../../services/timetable-scope.service';
import { TimetableService } from '../../services/timetable.service';
import { toCalendarEvent, toCalendarSession, weeksInRange } from '../../utils/timetable-events';
import { printableFromTimetable, toPrintSession } from '../../utils/timetable-print-grid';
import { addDays, mondayOf, parseApiDate, toApiDate } from '../../utils/timetable-time';

interface WeekResult {
    sessions: CalendarSession[];
    /** Les semaines affichées, au format « Horaire Faculté » pour l'impression et les exports. */
    documents: PrintableTimetable[];
    /** Vraie panne de chargement ; une semaine non publiée (404) reste simplement vide. */
    failed?: boolean;
}

const EMPTY: WeekResult = { sessions: [], documents: [] };

/**
 * Horaire personnel, en lecture seule et limité aux horaires VALIDÉS :
 * - l'étudiant voit l'horaire de sa promotion (`GET /timetables/me/week`) ;
 * - le professeur voit ses seules séances, toutes promotions confondues, retrouvées à partir de
 *   ses affectations de cours.
 */
@Component({
    selector: 'app-my-timetable-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ContentSubtopbar, TimetableCalendar, TimetableExportMenu, TimetableSessionDialog],
    templateUrl: './my-timetable.html'
})
export class MyTimetablePage {
    private readonly authService = inject(AuthService);
    private readonly timetableService = inject(TimetableService);
    private readonly entryService = inject(TimetableEntryService);
    private readonly professorLabels = inject(ProfessorLabelService);
    private readonly professorService = inject(ProfessorService);
    private readonly assignmentService = inject(CourseAssignmentService);
    private readonly scope = inject(TimetableScopeService);

    readonly kind: PersonalTimetableKind | null = this.scope.personalKind();
    private readonly sessions = signal<CalendarSession[]>([]);
    readonly events = computed<EventInput[]>(() => this.sessions().map(toCalendarEvent));
    readonly exportDocuments = signal<PrintableTimetable[]>([]);
    readonly error = signal<string | null>(null);
    readonly weekError = signal<string | null>(null);
    readonly selectedSession = signal<CalendarSession | null>(null);
    private readonly visibleRange = signal<TimetableCalendarRange | null>(null);

    /** Toutes les séances du professeur, chargées une fois ; `null` tant qu'elles ne le sont pas. */
    private readonly professorEntries = signal<TimetableEntry[] | null>(null);
    /** Le professeur connecté : identifiant (pour son grade) et nom à défaut. */
    private professor: { id: string; name: string } | null = null;
    private readonly timetables = new Map<string, Observable<Timetable | null>>();

    readonly emptyText = 'Aucune séance sur cette période.';

    constructor() {
        if (this.kind === null) {
            this.error.set('Votre compte n’a pas d’horaire personnel : il est réservé aux étudiants et aux professeurs.');
            return;
        }
        if (this.kind === 'professor') {
            this.loadProfessorEntries();
        }

        toObservable(computed(() => ({ range: this.visibleRange(), entries: this.professorEntries() })))
            .pipe(
                switchMap(({ range, entries }) => {
                    if (!range) {
                        return of(EMPTY);
                    }
                    return this.professorLabels
                        .labels()
                        .pipe(switchMap((labels) => (this.kind === 'student' ? this.loadStudentWeeks(range, labels) : this.professorWeek(range, entries, labels))));
                }),
                takeUntilDestroyed()
            )
            .subscribe(({ sessions, documents, failed }) => {
                this.sessions.set(sessions);
                this.exportDocuments.set(documents);
                this.weekError.set(failed ? 'Impossible de charger l’horaire.' : null);
            });
    }

    onRangeChange(range: TimetableCalendarRange): void {
        this.visibleRange.set(range);
    }

    onEventSelected(event: EventClickArg): void {
        this.selectedSession.set((event.event.extendedProps['session'] as CalendarSession | undefined) ?? null);
    }

    // ----- Étudiant -----

    /** Une requête par semaine affichée ; le backend ne renvoie que les horaires VALIDÉS. */
    private loadStudentWeeks(range: TimetableCalendarRange, labels: ReadonlyMap<string, string>): Observable<WeekResult> {
        const weeks = weeksInRange(range.start, range.end).map((week) =>
            this.timetableService.getOwnWeek(week).pipe(
                switchMap((entries): Observable<WeekResult> => {
                    const sessions = entries.map((entry) => toCalendarSession(entry, labels));
                    if (sessions.length === 0) {
                        return of(EMPTY);
                    }
                    // L'horaire de la promotion donne l'en-tête de l'export (faculté, niveau, programme).
                    return this.timetable(entries[0].timetable_id).pipe(
                        map((timetable) => ({
                            sessions,
                            documents: [
                                timetable
                                    ? printableFromTimetable(timetable, sessions, [])
                                    : { title: 'Mon horaire', heading: 'Mon horaire', weekStart: week, sessions: sessions.map(toPrintSession) }
                            ]
                        }))
                    );
                }),
                // 404 : semaine non publiée, sans inscription… L'écran vide suffit, sans message.
                catchError((error: unknown) => of<WeekResult>({ ...EMPTY, failed: !(error instanceof HttpErrorResponse && error.status === 404) }))
            )
        );
        return forkJoin(weeks).pipe(
            map((results) => ({
                sessions: results.flatMap((result) => result.sessions),
                documents: results.flatMap((result) => result.documents),
                failed: results.some((result) => result.failed)
            }))
        );
    }

    // ----- Professeur -----

    /**
     * Séances de toutes les affectations ACTIVES du professeur. Faute d'endpoint dédié côté
     * backend, on passe par les affectations puis par leurs séances.
     */
    private loadProfessorEntries(): void {
        const user = this.authService.getCurrentUser();
        this.professorService
            .resolveCurrent(user?.id, user?.email)
            .pipe(
                switchMap((professor) => {
                    if (!professor) {
                        this.error.set('Aucun profil professeur n’est associé à votre compte.');
                        return of([] as TimetableEntry[]);
                    }
                    this.professor = { id: professor.id, name: professorLabel(professor) };
                    return this.assignmentService.getByProfessor(professor.id).pipe(
                        switchMap((assignments) => {
                            const active = assignments.filter((assignment) => assignment.status !== 'INACTIVE');
                            if (active.length === 0) {
                                return of([] as TimetableEntry[]);
                            }
                            return forkJoin(
                                active.map((assignment) =>
                                    this.entryService.getByCourseAssignment(assignment.id).pipe(catchError(() => of([] as TimetableEntry[])))
                                )
                            ).pipe(map((groups) => groups.flat()));
                        })
                    );
                }),
                catchError(() => {
                    this.error.set('Impossible de charger vos séances.');
                    return of([] as TimetableEntry[]);
                }),
                takeUntilDestroyed()
            )
            .subscribe((entries) => this.professorEntries.set(entries));
    }

    /** Séances de la période dont l'horaire est VALIDÉ, avec la promotion concernée. */
    private professorWeek(range: TimetableCalendarRange, entries: TimetableEntry[] | null, labels: ReadonlyMap<string, string>): Observable<WeekResult> {
        if (!entries) {
            return of(EMPTY);
        }
        const weeks = weeksInRange(range.start, range.end);
        const first = weeks[0];
        const last = weeks.length > 0 ? weeks[weeks.length - 1] : undefined;
        const inRange = entries.filter((entry) => !!first && !!last && entry.date >= first && entry.date <= addDays(last, 6));
        const ids = [...new Set(inRange.map((entry) => entry.timetable_id))];
        if (ids.length === 0) {
            return of(EMPTY);
        }
        return forkJoin(ids.map((id) => this.timetable(id))).pipe(
            map((timetables) => {
                const validated = new Map(timetables.filter((item): item is Timetable => item?.status === 'VALIDATED').map((item) => [item.id, item]));
                const sessions = inRange
                    .filter((entry) => validated.has(entry.timetable_id))
                    .map((entry) => {
                        const timetable = validated.get(entry.timetable_id)!;
                        return { ...toCalendarSession(entry, labels), promotion: `${timetable.program_name} · ${timetable.program_level_name}` };
                    });
                return { sessions, documents: this.professorDocuments(sessions, labels) };
            })
        );
    }

    /** Une semaine imprimable par semaine portant des séances, au nom de l'enseignant gradé. */
    private professorDocuments(sessions: readonly CalendarSession[], labels: ReadonlyMap<string, string>): PrintableTimetable[] {
        const name = (this.professor && labels.get(this.professor.id)) ?? this.professor?.name ?? 'Enseignant';
        const byWeek = new Map<string, CalendarSession[]>();
        for (const session of sessions) {
            const week = toApiDate(mondayOf(parseApiDate(session.date)));
            byWeek.set(week, [...(byWeek.get(week) ?? []), session]);
        }
        return [...byWeek.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([weekStart, weekSessions]) => ({ title: 'Horaire de l’enseignant', heading: name, weekStart, sessions: weekSessions.map(toPrintSession) }));
    }

    /** Un même horaire sert à plusieurs séances et plusieurs semaines : une seule lecture. */
    private timetable(id: string): Observable<Timetable | null> {
        let timetable = this.timetables.get(id);
        if (!timetable) {
            timetable = this.timetableService.getById(id).pipe(
                catchError(() => of(null)),
                shareReplay(1)
            );
            this.timetables.set(id, timetable);
        }
        return timetable;
    }
}
