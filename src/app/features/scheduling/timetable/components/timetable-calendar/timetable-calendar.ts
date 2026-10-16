import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, output, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';
import { TIMETABLE_VIEW_OPTIONS, TimetableToolbar, TimetableView } from '../timetable-toolbar/timetable-toolbar';

export interface TimetableCalendarRange {
    start: Date;
    end: Date;
    viewType: string;
}

/** Sous ce seuil (téléphones), une semaine en grille ne tient pas : colonnes de ~34 px. */
export const COMPACT_QUERY = '(max-width: 639.98px)';

/** Plage horaire affichée par défaut : la journée de cours, sans la nuit. */
export const DEFAULT_SLOT_MIN = '07:00:00';
export const DEFAULT_SLOT_MAX = '20:00:00';

const VIEW_STORAGE_KEY = 'smartcampus.timetable.view';

/** En-tête de jour compact : initiale du jour et quantième (« L 12 »). */
export function compactDayLabel(date: Date): string {
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' }).format(date);
    return `${weekday} ${date.getDate()}`;
}

/** Hauteur selon la largeur : la page défile sur téléphone, le calendrier sur grand écran. */
export function calendarHeight(compact: boolean): CalendarOptions['height'] {
    return compact ? 'auto' : '70vh';
}

/**
 * Plage horaire à afficher : 07:00–20:00, élargie à l'heure pleine si une séance commence plus tôt
 * ou finit plus tard. Une séance hors plage serait sinon invisible dans les grilles horaires.
 */
export function slotBounds(events: readonly EventInput[]): { min: string; max: string } {
    const times = (value: unknown) => (typeof value === 'string' && value.includes('T') ? value.split('T')[1].slice(0, 8) : null);
    let min = DEFAULT_SLOT_MIN;
    let max = DEFAULT_SLOT_MAX;
    for (const event of events) {
        const start = times(event.start);
        const end = times(event.end);
        if (start && start < min) {
            min = `${start.slice(0, 2)}:00:00`;
        }
        if (end && end > max) {
            const [hours, minutes] = end.split(':').map(Number);
            const ceiled = minutes > 0 ? hours + 1 : hours;
            max = ceiled >= 24 ? '24:00:00' : `${String(ceiled).padStart(2, '0')}:00:00`;
        }
    }
    return { min, max };
}

function isTimetableView(value: unknown): value is TimetableView {
    return TIMETABLE_VIEW_OPTIONS.some((option) => option.value === value);
}

function readStoredView(): TimetableView | null {
    try {
        const stored = localStorage.getItem(VIEW_STORAGE_KEY);
        return isTimetableView(stored) ? stored : null;
    } catch {
        return null;
    }
}

function storeView(view: TimetableView): void {
    try {
        localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
        // Stockage indisponible (navigation privée…) : la vue ne sera simplement pas retenue.
    }
}

/**
 * Calendrier des horaires. FullCalendar est piloté par son API ; la barre d'outils est la nôtre
 * (navigation, période, vue en `p-select`, filtres projetés avec l'attribut `timetableFilters`).
 */
@Component({
    selector: 'app-timetable-calendar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [FullCalendarModule, TimetableToolbar],
    templateUrl: './timetable-calendar.html',
    styleUrl: './timetable-calendar.scss',
    host: { class: 'timetable-calendar' }
})
export class TimetableCalendar {
    readonly events = input<EventInput[]>([]);
    readonly initialDate = input<string | undefined>(undefined);
    /** Message de la vue liste quand la période n'a aucune séance. */
    readonly emptyText = input('Aucun horaire validé sur cette période.');
    /** La page projette des filtres dans la barre d'outils. */
    readonly hasFilters = input(false);
    readonly activeFilters = input(0);

    readonly rangeChange = output<TimetableCalendarRange>();
    readonly eventSelected = output<EventClickArg>();

    private readonly calendar = viewChild(FullCalendarComponent);
    private readonly host = inject(ElementRef<HTMLElement>);
    private readonly compactMedia = window.matchMedia(COMPACT_QUERY);
    private compact = this.compactMedia.matches;

    readonly title = signal('');
    /** Vue retenue d'une visite à l'autre ; à défaut, la liste sur téléphone et la semaine ailleurs. */
    readonly view = signal<TimetableView>(readStoredView() ?? (this.compact ? 'listWeek' : 'timeGridWeek'));
    readonly showsToday = signal(false);

    readonly options: CalendarOptions = {
        plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
        initialView: this.view(),
        locale: frLocale,
        firstDay: 1,
        // Barre native désactivée : navigation et vue passent par TimetableToolbar et l'API.
        headerToolbar: false,
        footerToolbar: false,
        height: calendarHeight(this.compact),
        allDaySlot: false,
        nowIndicator: true,
        slotMinTime: DEFAULT_SLOT_MIN,
        slotMaxTime: DEFAULT_SLOT_MAX,
        scrollTime: DEFAULT_SLOT_MIN,
        slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        // Les blocs ne montrent que le cours : heure, salle et le reste sont dans le détail.
        displayEventTime: false,
        views: {
            // La liste garde sa colonne horaire et nomme le professeur de la séance.
            list: {
                displayEventTime: true,
                eventContent: (arg) => {
                    const professor = (arg.event.extendedProps['session'] as { professor_name?: string } | undefined)?.professor_name;
                    const text = document.createElement('span');
                    text.textContent = professor ? `${arg.event.title} — ${professor}` : arg.event.title;
                    return { domNodes: [text] };
                }
            }
        },
        noEventsContent: () => this.emptyText(),
        // Grille horaire sur téléphone : « L 12 » au lieu de « lun. 12/10 », qui se chevauchaient.
        dayHeaderContent: (arg) => (this.compact && arg.view.type.startsWith('timeGrid') ? compactDayLabel(arg.date) : arg.text),
        dayHeaderClassNames: (arg) => (arg.isToday ? ['timetable-today'] : []),
        dayCellClassNames: (arg) => (arg.isToday ? ['timetable-today'] : []),
        datesSet: (arg) => {
            const now = Date.now();
            const current = now >= arg.start.getTime() && now < arg.end.getTime();
            this.host.nativeElement.classList.toggle('timetable-current-range', current);
            this.title.set(arg.view.title);
            this.showsToday.set(current);
            if (isTimetableView(arg.view.type)) {
                this.view.set(arg.view.type);
            }
            this.rangeChange.emit({ start: arg.start, end: arg.end, viewType: arg.view.type });
        },
        eventClick: (arg) => {
            arg.jsEvent.preventDefault();
            this.eventSelected.emit(arg);
        }
    };

    constructor() {
        // Rotation d'écran, fenêtre redimensionnée : on ajuste sans recréer le calendrier.
        const onWidthChange = (event: MediaQueryListEvent) => {
            this.compact = event.matches;
            this.calendar()?.getApi().setOption('height', calendarHeight(event.matches));
        };
        this.compactMedia.addEventListener('change', onWidthChange);
        inject(DestroyRef).onDestroy(() => this.compactMedia.removeEventListener('change', onWidthChange));

        effect(() => {
            const date = this.initialDate();
            const api = this.calendar()?.getApi();
            if (date && api) {
                api.gotoDate(date);
            }
        });

        // Une séance hors 07:00–20:00 élargit la plage plutôt que de disparaître.
        effect(() => {
            const { min, max } = slotBounds(this.events());
            const api = this.calendar()?.getApi();
            if (api) {
                api.setOption('slotMinTime', min);
                api.setOption('slotMaxTime', max);
            }
        });
    }

    previous(): void {
        this.calendar()?.getApi().prev();
    }

    next(): void {
        this.calendar()?.getApi().next();
    }

    today(): void {
        this.calendar()?.getApi().today();
    }

    changeView(view: TimetableView): void {
        storeView(view);
        this.calendar()?.getApi().changeView(view);
    }
}
