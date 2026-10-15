import { TestBed } from '@angular/core/testing';
import { EventContentArg } from '@fullcalendar/core';
import { TimetableCalendar, compactDayLabel, responsiveOptions } from './timetable-calendar';

describe('TimetableCalendar', () => {
    let calendar: TimetableCalendar;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [TimetableCalendar] });
        const fixture = TestBed.createComponent(TimetableCalendar);
        // Rendu nécessaire : FullCalendar ne sait se détruire qu'une fois initialisé.
        fixture.detectChanges();
        calendar = fixture.componentInstance;
    });

    function options() {
        return calendar.options;
    }

    function listContent(title: string, professor?: string): string {
        const content = options().views?.['list']?.eventContent as (arg: EventContentArg) => { domNodes: Node[] };
        const arg = { event: { title, extendedProps: { session: { professor_name: professor } } } } as unknown as EventContentArg;
        return content(arg).domNodes.map((node) => node.textContent).join('');
    }

    it('should hide the time in the grid views, and show it in the list', () => {
        const calendar = options();
        expect(calendar.displayEventTime).toBeFalse();
        expect(calendar.views?.['list']?.displayEventTime).toBeTrue();
    });

    it('should name the professor next to the course in the list', () => {
        expect(listContent('Algèbre', 'Ada Lovelace')).toBe('Algèbre — Ada Lovelace');
        expect(listContent('Algèbre')).toBe('Algèbre');
    });

    it('should keep the full toolbar on wide screens', () => {
        expect(responsiveOptions(false)).toEqual({
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek' },
            footerToolbar: false,
            height: '70vh'
        });
    });

    it('should move the view switch below the calendar and size it to its content on phones', () => {
        expect(responsiveOptions(true)).toEqual({
            headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
            footerToolbar: { center: 'timeGridDay,timeGridWeek,dayGridMonth,listWeek' },
            height: 'auto'
        });
    });

    it('should abbreviate day headers to their initial and day of month', () => {
        expect(compactDayLabel(new Date(2026, 9, 12))).toBe('L 12');
        expect(compactDayLabel(new Date(2026, 9, 18))).toBe('D 18');
    });

    it('should insert the professor name as text, never as HTML', () => {
        expect(listContent('Algèbre', '<img src=x onerror=alert(1)>')).toBe('Algèbre — <img src=x onerror=alert(1)>');
    });
});
