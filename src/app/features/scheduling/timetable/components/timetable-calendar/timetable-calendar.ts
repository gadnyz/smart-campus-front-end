import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, viewChild, ViewEncapsulation } from '@angular/core';
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

    readonly options: CalendarOptions = {
        plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
        initialView: 'timeGridWeek',
        locale: frLocale,
        firstDay: 1,
        height: '70vh',
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
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek'
        },
        buttonText: {
            today: "Aujourd'hui",
            day: 'Jour',
            week: 'Semaine',
            month: 'Mois',
            list: 'Liste'
        },
        noEventsContent: () => this.emptyText(),
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
        effect(() => {
            const date = this.initialDate();
            const api = this.calendar()?.getApi();
            if (date && api) {
                api.gotoDate(date);
            }
        });
    }
}