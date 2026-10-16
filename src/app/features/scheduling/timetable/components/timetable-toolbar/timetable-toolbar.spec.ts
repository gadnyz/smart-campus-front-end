import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimetableToolbar, TimetableView } from './timetable-toolbar';

@Component({
    standalone: true,
    imports: [TimetableToolbar],
    template: `
        <app-timetable-toolbar
            title="12 – 18 oct. 2026"
            [view]="view()"
            [showsToday]="showsToday()"
            [hasFilters]="hasFilters()"
            [activeFilters]="activeFilters()"
            (previous)="calls.push('previous')"
            (next)="calls.push('next')"
            (today)="calls.push('today')"
            (viewChange)="calls.push($event)"
        >
            <span timetableFilters class="projected-filter">Programme</span>
        </app-timetable-toolbar>
    `
})
class Host {
    readonly view = signal<TimetableView>('timeGridWeek');
    readonly showsToday = signal(true);
    readonly hasFilters = signal(true);
    readonly activeFilters = signal(0);
    readonly calls: string[] = [];
}

describe('TimetableToolbar', () => {
    let fixture: ComponentFixture<Host>;
    let host: Host;
    let html: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({ imports: [Host] });
        fixture = TestBed.createComponent(Host);
        host = fixture.componentInstance;
        html = fixture.nativeElement as HTMLElement;
        fixture.detectChanges();
    });

    function button(label: string): HTMLButtonElement {
        return html.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
    }

    function toolbar(): TimetableToolbar {
        return fixture.debugElement.children[0].componentInstance as TimetableToolbar;
    }

    it('should show the period and label its controls', () => {
        expect(html.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('Navigation du calendrier');
        expect(html.querySelector('h2')?.textContent).toContain('12 – 18 oct. 2026');
        expect(html.querySelector('h2')?.getAttribute('aria-live')).toBe('polite');
        expect(button('Période précédente')).not.toBeNull();
        expect(button('Période suivante')).not.toBeNull();
    });

    it('should emit navigation requests', () => {
        button('Période précédente').click();
        button('Période suivante').click();
        expect(host.calls).toEqual(['previous', 'next']);
    });

    it('should disable « Aujourd’hui » while today is displayed', () => {
        expect(button("Revenir à aujourd'hui").disabled).toBeTrue();
        host.showsToday.set(false);
        fixture.detectChanges();
        button("Revenir à aujourd'hui").click();
        expect(host.calls).toEqual(['today']);
    });

    it('should emit a view change only for a different view', () => {
        toolbar().onViewChange('dayGridMonth');
        toolbar().onViewChange('timeGridWeek');
        toolbar().onViewChange(null);
        expect(host.calls).toEqual(['dayGridMonth']);
    });

    it('should project the filters and fold them behind a toggle', () => {
        expect(html.querySelector('.projected-filter')?.textContent).toBe('Programme');
        const panel = html.querySelector('#timetable-toolbar-filters') as HTMLElement;
        expect(panel.classList.contains('is-open')).toBeFalse();

        toolbar().toggleFilters();
        fixture.detectChanges();
        expect(panel.classList.contains('is-open')).toBeTrue();
    });

    it('should count the active filters on the toggle', () => {
        host.activeFilters.set(2);
        fixture.detectChanges();
        expect(html.querySelector('.timetable-toolbar-filters-toggle')?.textContent).toContain('Filtres (2)');
    });

    it('should offer no filters when the page has none', () => {
        host.hasFilters.set(false);
        fixture.detectChanges();
        expect(html.querySelector('#timetable-toolbar-filters')).toBeNull();
        expect(html.querySelector('.timetable-toolbar-filters-toggle')).toBeNull();
    });
});
