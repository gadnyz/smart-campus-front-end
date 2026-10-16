import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EventContentArg } from '@fullcalendar/core';
import { TimetableToolbar } from '../timetable-toolbar/timetable-toolbar';
import { DEFAULT_SLOT_MAX, DEFAULT_SLOT_MIN, TimetableCalendar, calendarHeight, compactDayLabel, slotBounds } from './timetable-calendar';

const VIEW_KEY = 'smartcampus.timetable.view';

describe('TimetableCalendar', () => {
    let fixture: ComponentFixture<TimetableCalendar>;
    let calendar: TimetableCalendar;

    function create(): void {
        TestBed.configureTestingModule({ imports: [TimetableCalendar] });
        fixture = TestBed.createComponent(TimetableCalendar);
        // Rendu nécessaire : FullCalendar ne sait se détruire qu'une fois initialisé.
        fixture.detectChanges();
        calendar = fixture.componentInstance;
    }

    function toolbar(): TimetableToolbar {
        return fixture.debugElement.query(By.directive(TimetableToolbar)).componentInstance as TimetableToolbar;
    }

    function listContent(title: string, professor?: string): string {
        const content = calendar.options.views?.['list']?.eventContent as (arg: EventContentArg) => { domNodes: Node[] };
        const arg = { event: { title, extendedProps: { session: { professor_name: professor } } } } as unknown as EventContentArg;
        return content(arg).domNodes.map((node) => node.textContent).join('');
    }

    beforeEach(() => localStorage.removeItem(VIEW_KEY));
    afterEach(() => localStorage.removeItem(VIEW_KEY));

    describe('affichage des séances', () => {
        beforeEach(() => create());

        it('should hide the time in the grid views, and show it in the list', () => {
            expect(calendar.options.displayEventTime).toBeFalse();
            expect(calendar.options.views?.['list']?.displayEventTime).toBeTrue();
        });

        it('should name the professor next to the course in the list', () => {
            expect(listContent('Algèbre', 'Ada Lovelace')).toBe('Algèbre — Ada Lovelace');
            expect(listContent('Algèbre')).toBe('Algèbre');
        });

        it('should insert the professor name as text, never as HTML', () => {
            expect(listContent('Algèbre', '<img src=x onerror=alert(1)>')).toBe('Algèbre — <img src=x onerror=alert(1)>');
        });

        it('should abbreviate day headers to their initial and day of month', () => {
            expect(compactDayLabel(new Date(2026, 9, 12))).toBe('L 12');
            expect(compactDayLabel(new Date(2026, 9, 18))).toBe('D 18');
        });
    });

    describe('barre d’outils', () => {
        it('should replace the native toolbars with its own', () => {
            create();
            expect(calendar.options.headerToolbar).toBeFalse();
            expect(calendar.options.footerToolbar).toBeFalse();
            expect((fixture.nativeElement as HTMLElement).querySelector('.fc-header-toolbar')).toBeNull();
            expect(toolbar().title()).not.toBe('');
        });

        it('should change the view through the calendar API and remember it', () => {
            create();
            calendar.changeView('dayGridMonth');
            fixture.detectChanges();

            expect(calendar.view()).toBe('dayGridMonth');
            expect(toolbar().view()).toBe('dayGridMonth');
            expect(localStorage.getItem(VIEW_KEY)).toBe('dayGridMonth');
            expect((fixture.nativeElement as HTMLElement).querySelector('.fc-dayGridMonth-view')).not.toBeNull();
        });

        it('should open on the remembered view', () => {
            localStorage.setItem(VIEW_KEY, 'listWeek');
            create();
            expect(calendar.view()).toBe('listWeek');
        });

        it('should ignore an unknown remembered view', () => {
            localStorage.setItem(VIEW_KEY, 'resourceTimeline');
            create();
            expect(['timeGridWeek', 'listWeek']).toContain(calendar.view());
        });

        it('should navigate between periods and back to today', () => {
            create();
            const current = calendar.title();
            expect(calendar.showsToday()).toBeTrue();

            calendar.next();
            fixture.detectChanges();
            expect(calendar.title()).not.toBe(current);
            expect(calendar.showsToday()).toBeFalse();

            calendar.today();
            fixture.detectChanges();
            expect(calendar.title()).toBe(current);

            calendar.previous();
            fixture.detectChanges();
            expect(calendar.title()).not.toBe(current);
        });
    });

    describe('plage horaire', () => {
        it('should show the school day by default, sized to the screen', () => {
            create();
            expect(calendar.options.slotMinTime).toBe(DEFAULT_SLOT_MIN);
            expect(calendar.options.slotMaxTime).toBe(DEFAULT_SLOT_MAX);
            expect(calendarHeight(true)).toBe('auto');
            expect(calendarHeight(false)).toBe('70vh');
        });

        it('should widen the range to the full hour for sessions outside 07:00–20:00', () => {
            expect(slotBounds([])).toEqual({ min: '07:00:00', max: '20:00:00' });
            expect(slotBounds([{ start: '2026-10-12T06:30:00', end: '2026-10-12T08:00:00' }])).toEqual({ min: '06:00:00', max: '20:00:00' });
            expect(slotBounds([{ start: '2026-10-12T19:00:00', end: '2026-10-12T21:15:00' }])).toEqual({ min: '07:00:00', max: '22:00:00' });
            expect(slotBounds([{ start: '2026-10-12T22:00:00', end: '2026-10-12T23:30:00' }]).max).toBe('24:00:00');
        });

        it('should apply the widened range so evening sessions stay visible', () => {
            localStorage.setItem(VIEW_KEY, 'timeGridWeek');
            create();
            const html = fixture.nativeElement as HTMLElement;
            expect(html.querySelector('.fc-timegrid-slot[data-time="21:00:00"]')).toBeNull();

            fixture.componentRef.setInput('events', [{ id: 'e-1', title: 'Cours du soir', start: '2026-10-12T20:00:00', end: '2026-10-12T21:30:00' }]);
            fixture.detectChanges();

            expect(html.querySelector('.fc-timegrid-slot[data-time="21:00:00"]')).not.toBeNull();
        });
    });
});
