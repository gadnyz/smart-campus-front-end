import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, effect, inject, input, output, viewChild, ViewEncapsulation } from '@angular/core';
import { FullCalendarModule, FullCalendarComponent } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, EventInput } from '@fullcalendar/core';
import frLocale from '@fullcalendar/core/locales/fr';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import timeGridPlugin from '@fullcalendar/timegrid';

export interface TimetableCalendarRange {
    start: Date;
    end: Date;
    viewType: string;
}

/** Sous ce seuil (téléphones), une semaine en grille ne tient pas : colonnes de ~34 px. */
export const COMPACT_QUERY = '(max-width: 639.98px)';

const VIEW_BUTTONS = 'timeGridDay,timeGridWeek,dayGridMonth,listWeek';

/** En-tête de jour compact : initiale du jour et quantième (« L 12 »). */
export function compactDayLabel(date: Date): string {
    const weekday = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' }).format(date);
    return `${weekday} ${date.getDate()}`;
}

/**
 * Réglages qui dépendent de la largeur. Sur téléphone : barre réduite (navigation, titre,
 * aujourd'hui), choix de la vue en pied de calendrier, hauteur selon le contenu.
 */
export function responsiveOptions(compact: boolean): Pick<CalendarOptions, 'headerToolbar' | 'footerToolbar' | 'height'> {
    return compact
        ? {
              headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
              footerToolbar: { center: VIEW_BUTTONS },
              height: 'auto'
          }
        : {
              headerToolbar: { left: 'prev,next today', center: 'title', right: VIEW_BUTTONS },
              footerToolbar: false,
              height: '70vh'
          };
}

@Component({
    selector: 'app-timetable-calendar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    imports: [FullCalendarModule],
    templateUrl: './timetable-calendar.html',
    styleUrl: './timetable-calendar.scss',
    host: { class: 'timetable-calendar' }
})
export class TimetableCalendar {
    readonly events = input<EventInput[]>([]);
    readonly initialDate = input<string | undefined>(undefined);
    /** Message de la vue liste quand la période n'a aucune séance. */
    readonly emptyText = input('Aucun horaire validé sur cette période.');

    readonly rangeChange = output<TimetableCalendarRange>();
    readonly eventSelected = output<EventClickArg>();

    private readonly calendar = viewChild(FullCalendarComponent);
    private readonly host = inject(ElementRef<HTMLElement>);
    private readonly compactMedia = window.matchMedia(COMPACT_QUERY);
    private compact = this.compactMedia.matches;

    readonly options: CalendarOptions = {
        plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
        // Sur téléphone, la liste de la semaine se lit ; la grille hebdomadaire non.
        initialView: this.compactMedia.matches ? 'listWeek' : 'timeGridWeek',
        locale: frLocale,
        firstDay: 1,
        ...responsiveOptions(this.compactMedia.matches),
        allDaySlot: false,
        nowIndicator: true,
        slotMinTime: '00:00:00',
        slotMaxTime: '24:00:00',
        scrollTime: '08:00:00',
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
        buttonText: {
            today: "Aujourd'hui",
            day: 'Jour',
            week: 'Semaine',
            month: 'Mois',
            list: 'Liste'
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
            this.rangeChange.emit({ start: arg.start, end: arg.end, viewType: arg.view.type });
        },
        eventClick: (arg) => {
            arg.jsEvent.preventDefault();
            this.eventSelected.emit(arg);
        }
    };

    constructor() {
        // Rotation d'écran, fenêtre redimensionnée : on bascule les réglages sans recréer le calendrier.
        const onWidthChange = (event: MediaQueryListEvent) => {
            this.compact = event.matches;
            const api = this.calendar()?.getApi();
            if (!api) {
                return;
            }
            for (const [name, value] of Object.entries(responsiveOptions(event.matches))) {
                api.setOption(name as keyof CalendarOptions, value);
            }
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
    }
}