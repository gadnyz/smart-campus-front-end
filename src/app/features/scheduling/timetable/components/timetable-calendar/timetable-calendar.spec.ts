import { TestBed } from '@angular/core/testing';
import { EventContentArg } from '@fullcalendar/core';
import { TimetableCalendar } from './timetable-calendar';

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

    it('should insert the professor name as text, never as HTML', () => {
        expect(listContent('Algèbre', '<img src=x onerror=alert(1)>')).toBe('Algèbre — <img src=x onerror=alert(1)>');
    });
});
