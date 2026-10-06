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
        noEventsContent: 'Aucun horaire validé sur cette période.',
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