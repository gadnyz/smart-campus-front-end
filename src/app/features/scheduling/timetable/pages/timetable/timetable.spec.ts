import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EventClickArg } from '@fullcalendar/core';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { Program, ProgramService } from '@/app/features/academic/academic.public-api';
import { TimetableEntry } from '../../models/timetable-entry.model';
import { Timetable, TimetableListQuery } from '../../models/timetable.model';
import { ProfessorLabelService } from '../../services/professor-label.service';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { TimetableService } from '../../services/timetable.service';
import { TimetablePage } from './timetable';

const program: Program = {
    id: 'prog-1',
    name: 'Informatique',
    code: 'INF',
    faculty_id: 'fac-1',
    levels: [{ id: 'pl-1', is_common: true, level: { id: 'l1', code: 'L1', name: 'Licence 1', level_order: 1 } }]
};

const validated: Timetable = {
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
    status: 'VALIDATED',
    created_at: '',
    updated_at: ''
};

const session: TimetableEntry = {
    id: 'e-1',
    timetable_id: 'tt-1',
    date: '2026-10-05',
    start_hour: '08:00:00',
    end_hour: '10:00:00',
    room_id: 'room-1',
    room_name: 'A101',
    course_assignment_id: 'ca-1',
    course_id: 'course-1',
    course_code: 'ALG',
    course_name: 'Algèbre',
    professor_id: 'prof-1',
    professor_name: 'Ada Lovelace',
    session_type: 'LECTURE',
    note: '',
    created_at: '',
    updated_at: ''
};

describe('TimetablePage (calendrier)', () => {
    let fixture: ComponentFixture<TimetablePage>;
    let component: TimetablePage;
    let timetableService: jasmine.SpyObj<TimetableService>;
    let entryService: jasmine.SpyObj<TimetableEntryService>;
    let programService: jasmine.SpyObj<ProgramService>;

    function createComponent(authorities: string[], user: { profiles?: string[]; faculty_id?: string | null } = {}): void {
        timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['list']);
        timetableService.list.and.callFake((query: TimetableListQuery = {}) =>
            of(
                query.programLevelId
                    ? { content: [validated, { ...validated, id: 'tt-2', week_start: '2026-10-12' }, { ...validated, id: 'tt-far', week_start: '2026-11-30' }], page: 0, size: 100, total_elements: 3, total_pages: 1 }
                    : { content: [], page: 0, size: 1, total_elements: 4, total_pages: 4 }
            )
        );
        entryService = jasmine.createSpyObj<TimetableEntryService>('TimetableEntryService', ['getForWeek']);
        entryService.getForWeek.and.returnValue(of([session]));
        programService = jasmine.createSpyObj<ProgramService>('ProgramService', ['getAll', 'getByFaculty']);
        programService.getAll.and.returnValue(of([program]));
        programService.getByFaculty.and.returnValue(of([program]));

        TestBed.configureTestingModule({
            imports: [TimetablePage],
            providers: [
                provideRouter([]),
                { provide: TimetableService, useValue: timetableService },
                { provide: TimetableEntryService, useValue: entryService },
                { provide: ProfessorLabelService, useValue: { labels: () => of(new Map([['prof-1', 'PO Ada Lovelace']])) } },
                { provide: ProgramService, useValue: programService },
                {
                    provide: AuthService,
                    useValue: { getCurrentUser: () => ({ id: 'u', email: 'u@unh.edu', authorities, profiles: user.profiles ?? ['ADMIN'], faculty_id: user.faculty_id }) }
                }
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

    it('should show the validated timetable of the chosen promotion, week by week', () => {
        createComponent(['scheduling:timetable:read:all']);
        expect(component.emptyText()).toContain('Choisissez un programme');

        component.onProgramChange('prog-1');
        component.onProgramLevelChange('pl-1');
        component.onRangeChange({ start: new Date(2026, 9, 5), end: new Date(2026, 9, 19), viewType: 'timeGridWeek' });
        fixture.detectChanges();

        // Sans filtre `week` (500 côté backend) : une seule liste des horaires validés de la promotion.
        expect(timetableService.list).toHaveBeenCalledWith({ programLevelId: 'pl-1', status: 'VALIDATED', page: 0, size: 100 });
        expect(timetableService.list.calls.allArgs().some(([query]) => !!query && 'week' in query)).toBeFalse();
        expect(entryService.getForWeek).toHaveBeenCalledWith('tt-1', '2026-10-05');
        expect(entryService.getForWeek).toHaveBeenCalledWith('tt-2', '2026-10-12');
        expect(entryService.getForWeek).not.toHaveBeenCalledWith('tt-far', jasmine.anything());
        expect(component.events().length).toBe(2);
        expect(component.events()[0].title).toBe('Algèbre');
        expect(component.emptyText()).toBe('Aucun horaire validé sur cette période.');
    });

    it('should open the details of a clicked session', () => {
        createComponent(['scheduling:timetable:read:all']);
        component.onProgramChange('prog-1');
        component.onProgramLevelChange('pl-1');
        component.onRangeChange({ start: new Date(2026, 9, 5), end: new Date(2026, 9, 12), viewType: 'timeGridWeek' });
        fixture.detectChanges();

        const props = component.events()[0].extendedProps as Record<string, unknown>;
        component.onEventSelected({ event: { extendedProps: props } } as unknown as EventClickArg);

        expect(component.selectedSession()?.professor_name).toBe('PO Ada Lovelace');
    });

    it('should limit an academic secretary to the programs and drafts of their faculty', () => {
        createComponent(['scheduling:timetable:read:all'], { profiles: ['ACADEMIC_SECRETARY'], faculty_id: 'fac-1' });

        expect(programService.getByFaculty).toHaveBeenCalledWith('fac-1');
        expect(programService.getAll).not.toHaveBeenCalled();
        expect(timetableService.list).toHaveBeenCalledWith({ status: 'DRAFT', facultyId: 'fac-1', page: 0, size: 1 });
    });

    it('should show nothing to an academic secretary without faculty', () => {
        createComponent(['scheduling:timetable:read:all'], { profiles: ['ACADEMIC_SECRETARY'], faculty_id: null });

        expect(programService.getAll).not.toHaveBeenCalled();
        expect(programService.getByFaculty).not.toHaveBeenCalled();
        expect(component.loadError()).toContain('rattaché à aucune faculté');
    });
});
