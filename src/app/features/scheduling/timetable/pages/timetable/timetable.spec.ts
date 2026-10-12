import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { ProgramService } from '@/app/features/academic/academic.public-api';
import { TimetableService } from '../../services/timetable.service';
import { TimetablePage } from './timetable';

describe('TimetablePage (calendrier)', () => {
    let fixture: ComponentFixture<TimetablePage>;
    let component: TimetablePage;
    let timetableService: jasmine.SpyObj<TimetableService>;
    let programService: jasmine.SpyObj<ProgramService>;

    function createComponent(authorities: string[]): void {
        timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['list']);
        timetableService.list.and.returnValue(of({ content: [], page: 0, size: 1, total_elements: 4, total_pages: 4 }));
        programService = jasmine.createSpyObj<ProgramService>('ProgramService', ['getAll']);
        programService.getAll.and.returnValue(
            of([
                {
                    id: 'prog-1',
                    name: 'Informatique',
                    code: 'INF',
                    faculty_id: 'fac-1',
                    levels: [{ id: 'pl-1', is_common: true, level: { id: 'l1', code: 'L1', name: 'Licence 1', level_order: 1 } }]
                }
            ])
        );

        TestBed.configureTestingModule({
            imports: [TimetablePage],
            providers: [
                provideRouter([]),
                { provide: TimetableService, useValue: timetableService },
                { provide: ProgramService, useValue: programService },
                { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u', email: 'u@unh.edu', authorities }) } }
            ]
        });
        fixture = TestBed.createComponent(TimetablePage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    /** Les actions vivent dans la barre de sous-titre, pas dans la carte du calendrier. */
    function link(label: string): HTMLElement | null {
        return (fixture.nativeElement as HTMLElement).querySelector(`app-content-subtopbar button[aria-label="${label}"]`);
    }

    it('should load every program in a single call and label common levels', () => {
        createComponent(['scheduling:timetable:read:all']);
        component.onProgramChange('prog-1');

        expect(programService.getAll).toHaveBeenCalledTimes(1);
        expect(component.programLevelOptions()).toEqual([{ label: 'L1 (commun)', value: 'pl-1' }]);
    });

    it('should count drafts and submitted timetables and link to the pending list and the creation page', () => {
        createComponent(['scheduling:timetable:read:all', 'scheduling:timetable:create:all']);

        expect(timetableService.list).toHaveBeenCalledWith({ status: 'DRAFT', page: 0, size: 1 });
        expect(timetableService.list).toHaveBeenCalledWith({ status: 'SUBMITTED', page: 0, size: 1 });
        expect(component.draftBadge()).toBe('8');
        fixture.detectChanges();
        expect(link('Afficher les horaires en attente (brouillons et soumis)')?.textContent).toContain('8');
        expect((fixture.nativeElement as HTMLElement).querySelector('.card [aria-label="Ajouter un horaire"]')).toBeNull();
        expect(link('Afficher les horaires en attente (brouillons et soumis)')).not.toBeNull();
        expect(link('Ajouter un horaire')).not.toBeNull();
        expect(component.pendingLink).toBe('/scheduling/timetable/pending');
        expect(component.newTimetableLink).toBe('/scheduling/timetable/new');
    });

    it('should not query drafts nor show actions without the matching rights', () => {
        createComponent(['scheduling:timetable-entry:read:all']);

        expect(timetableService.list).not.toHaveBeenCalled();
        expect(link('Afficher les horaires en attente (brouillons et soumis)')).toBeNull();
        expect(link('Ajouter un horaire')).toBeNull();
    });
});
