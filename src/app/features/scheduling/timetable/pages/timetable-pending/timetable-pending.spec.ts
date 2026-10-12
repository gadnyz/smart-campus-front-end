import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { Timetable } from '../../models/timetable.model';
import { TimetableService } from '../../services/timetable.service';
import { TimetablePendingPage } from './timetable-pending';

describe('TimetablePendingPage', () => {
    let fixture: ComponentFixture<TimetablePendingPage>;
    let component: TimetablePendingPage;
    let timetableService: jasmine.SpyObj<TimetableService>;
    let router: Router;

    const draft: Timetable = {
        id: 'tt-1',
        academic_year_id: 'year-1',
        program_level_id: 'pl-1',
        program_level_name: 'Licence 1',
        week_start: '2026-10-05',
        week_end: '2026-10-11',
        program_id: 'prog-1',
        program_name: 'Informatique',
        faculty_id: 'fac-1',
        faculty_name: 'Sciences',
        status: 'DRAFT',
        created_at: '',
        updated_at: ''
    };

    function createComponent(authorities: string[], fail = false): void {
        timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['list']);
        timetableService.list.and.returnValue(
            fail ? throwError(() => new Error('boom')) : of({ content: [draft], page: 0, size: 10, total_elements: 11, total_pages: 2 })
        );

        TestBed.configureTestingModule({
            imports: [TimetablePendingPage],
            providers: [
                provideRouter([]),
                { provide: TimetableService, useValue: timetableService },
                { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u', email: 'u@unh.edu', authorities }) } }
            ]
        });
        router = TestBed.inject(Router);
        spyOn(router, 'navigate').and.resolveTo(true);

        fixture = TestBed.createComponent(TimetablePendingPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    it('should list draft timetables, paginated server side, by week', () => {
        createComponent(['scheduling:timetable:read:all', 'scheduling:timetable:update:all']);

        expect(timetableService.list).toHaveBeenCalledWith({ status: 'DRAFT', page: 0, size: 10, sort: ['weekStart,asc'] });
        expect(component.totalRecords()).toBe(11);
        const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
        expect(text).toContain('Informatique');
        expect(text).toContain('Licence 1');
        expect(text).toContain('5 octobre 2026');
    });

    it('should request the page asked by the table', () => {
        createComponent(['scheduling:timetable:read:all']);
        component.onLazyLoad({ first: 20, rows: 10 });
        expect(timetableService.list).toHaveBeenCalledWith({ status: 'DRAFT', page: 2, size: 10, sort: ['weekStart,asc'] });
    });

    it('should open the edit page', () => {
        createComponent(['scheduling:timetable:read:all', 'scheduling:timetable:update:all']);
        const button = fixture.debugElement.query(By.css('[aria-label^="Modifier l’horaire"] button, button[aria-label^="Modifier l’horaire"]'));
        (button.nativeElement as HTMLElement).click();

        expect(router.navigate).toHaveBeenCalledWith(['/scheduling/timetable', 'tt-1', 'edit']);
    });

    it('should hide the edit action without update rights', () => {
        createComponent(['scheduling:timetable:read:all']);
        expect(component.canEdit()).toBeFalse();
        expect((fixture.nativeElement as HTMLElement).querySelector('[aria-label^="Modifier l’horaire"]')).toBeNull();
    });

    it('should confirm a successful save coming from the form', async () => {
        history.replaceState({ saved: true }, '');
        try {
            createComponent(['scheduling:timetable:read:all']);
            const messages = fixture.debugElement.injector.get(MessageService);
            const add = spyOn(messages, 'add');
            await Promise.resolve();

            expect(add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Horaire enregistré.' }));
        } finally {
            history.replaceState(null, '');
        }
    });

    it('should reload the current page', () => {
        createComponent(['scheduling:timetable:read:all']);
        component.onLazyLoad({ first: 10, rows: 10 });
        component.reload();
        expect(timetableService.list.calls.mostRecent().args[0]).toEqual({ status: 'DRAFT', page: 1, size: 10, sort: ['weekStart,asc'] });
    });

    it('should switch to submitted timetables from the first page, and show their status', () => {
        createComponent(['scheduling:timetable:read:all']);
        component.onLazyLoad({ first: 10, rows: 10 });
        timetableService.list.and.returnValue(
            of({ content: [{ ...draft, id: 'tt-2', status: 'SUBMITTED' }], page: 0, size: 10, total_elements: 1, total_pages: 1 })
        );

        component.onStatusChange('SUBMITTED');
        fixture.detectChanges();

        expect(component.first()).toBe(0);
        expect(timetableService.list.calls.mostRecent().args[0]).toEqual({ status: 'SUBMITTED', page: 0, size: 10, sort: ['weekStart,asc'] });
        expect((fixture.nativeElement as HTMLElement).querySelector('p-tag')?.textContent).toContain('Soumis');
    });

    it('should list validated timetables, to open them', () => {
        createComponent(['scheduling:timetable:read:all', 'scheduling:timetable:update:all']);
        timetableService.list.and.returnValue(
            of({ content: [{ ...draft, status: 'VALIDATED' }], page: 0, size: 10, total_elements: 1, total_pages: 1 })
        );

        component.onStatusChange('VALIDATED');
        fixture.detectChanges();

        expect(timetableService.list.calls.mostRecent().args[0]).toEqual({ status: 'VALIDATED', page: 0, size: 10, sort: ['weekStart,asc'] });
        expect(component.emptyMessage()).toBe('Aucun horaire validé.');
        const html = fixture.nativeElement as HTMLElement;
        expect(html.querySelector('p-tag')?.textContent).toContain('Validé');
        expect(html.querySelector('[aria-label^="Ouvrir l’horaire"]')).not.toBeNull();
    });

    it('should ignore a click on the active status', () => {
        createComponent(['scheduling:timetable:read:all']);
        const calls = timetableService.list.calls.count();
        component.onStatusChange(null);
        component.onStatusChange('DRAFT');
        expect(timetableService.list.calls.count()).toBe(calls);
    });

    it('should report a loading error', () => {
        createComponent(['scheduling:timetable:read:all'], true);
        expect(component.loadError()).toBe('Impossible de charger les horaires en attente.');
        expect(component.timetables()).toEqual([]);
    });
});
