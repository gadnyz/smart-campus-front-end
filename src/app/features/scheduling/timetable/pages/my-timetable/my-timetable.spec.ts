import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { CourseAssignment, CourseAssignmentService, ProfessorService } from '@/app/features/academic/academic.public-api';
import { TimetableEntry } from '../../models/timetable-entry.model';
import { Timetable } from '../../models/timetable.model';
import { StudentTimetableEntry } from '../../models/timetable-view.model';
import { ProfessorLabelService } from '../../services/professor-label.service';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { TimetableService } from '../../services/timetable.service';
import { MyTimetablePage } from './my-timetable';

const WEEK = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 12), viewType: 'timeGridWeek' };
const TWO_WEEKS = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 19), viewType: 'timeGridWeek' };

function studentEntry(overrides: Partial<StudentTimetableEntry> = {}): StudentTimetableEntry {
    return {
        id: 's-1',
        timetable_id: 'tt-1',
        date: '2026-10-05',
        start_hour: '08:00:00',
        end_hour: '10:00:00',
        session_type: 'LECTURE',
        course_id: 'course-1',
        course_code: 'ALG',
        course_name: 'Algèbre',
        professor_id: 'prof-1',
        professor_name: 'Ada Lovelace',
        room_id: 'room-1',
        room_name: 'A101',
        room_location: 'Bâtiment A',
        room_type: 'NORMAL',
        room_link: '',
        note: '',
        ...overrides
    };
}

function entry(overrides: Partial<TimetableEntry>): TimetableEntry {
    return {
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
        updated_at: '',
        ...overrides
    };
}

function timetable(id: string, status: Timetable['status'], level = 'Licence 1'): Timetable {
    return {
        id,
        academic_year_id: 'year-1',
        program_level_id: `pl-${id}`,
        program_level_name: level,
        week_start: '2026-10-05',
        week_end: '2026-10-11',
        program_id: 'prog-1',
        program_name: 'Informatique',
        faculty_id: 'fac-1',
        faculty_name: 'Sciences',
        status,
        created_at: '',
        updated_at: ''
    };
}

describe('MyTimetablePage', () => {
    let fixture: ComponentFixture<MyTimetablePage>;
    let component: MyTimetablePage;
    let timetableService: jasmine.SpyObj<TimetableService>;
    let entryService: jasmine.SpyObj<TimetableEntryService>;
    let professorService: jasmine.SpyObj<ProfessorService>;
    let assignmentService: jasmine.SpyObj<CourseAssignmentService>;

    function createComponent(profiles: string[]): void {
        timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['getOwnWeek', 'getById']);
        timetableService.getOwnWeek.and.returnValue(of([]));
        timetableService.getById.and.callFake((id: string) => of(timetable(id, id === 'tt-1' ? 'VALIDATED' : 'DRAFT', id === 'tt-1' ? 'Licence 1' : 'Licence 2')));
        entryService = jasmine.createSpyObj<TimetableEntryService>('TimetableEntryService', ['getByCourseAssignment']);
        entryService.getByCourseAssignment.and.returnValue(
            of([
                entry({ id: 'e-validated', timetable_id: 'tt-1' }),
                entry({ id: 'e-draft', timetable_id: 'tt-2', date: '2026-10-06' }),
                entry({ id: 'e-later', timetable_id: 'tt-1', date: '2026-11-02' })
            ])
        );
        professorService = jasmine.createSpyObj<ProfessorService>('ProfessorService', ['resolveCurrent']);
        professorService.resolveCurrent.and.returnValue(of({ id: 'prof-1' }) as ReturnType<ProfessorService['resolveCurrent']>);
        assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', ['getByProfessor']);
        assignmentService.getByProfessor.and.returnValue(
            of([{ id: 'ca-1', status: 'ACTIVE' }, { id: 'ca-off', status: 'INACTIVE' }] as CourseAssignment[])
        );

        TestBed.configureTestingModule({
            imports: [MyTimetablePage],
            providers: [
                provideRouter([]),
                { provide: TimetableService, useValue: timetableService },
                { provide: TimetableEntryService, useValue: entryService },
                { provide: ProfessorLabelService, useValue: { labels: () => of(new Map([['prof-1', 'PO Ada Lovelace']])) } },
                { provide: ProfessorService, useValue: professorService },
                { provide: CourseAssignmentService, useValue: assignmentService },
                { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u-1', email: 'me@unh.edu', profiles, authorities: [] }) } }
            ]
        });
        fixture = TestBed.createComponent(MyTimetablePage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    describe('étudiant', () => {
        it('should load each displayed week of the student promotion', () => {
            createComponent(['STUDENT']);
            timetableService.getOwnWeek.and.callFake((week: string) =>
                week === '2026-10-05'
                    ? of([studentEntry()])
                    : throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Semaine non publiée' } }))
            );

            component.onRangeChange(TWO_WEEKS);
            fixture.detectChanges();

            expect(timetableService.getOwnWeek).toHaveBeenCalledWith('2026-10-05');
            expect(timetableService.getOwnWeek).toHaveBeenCalledWith('2026-10-12');
            expect(component.events().length).toBe(1);
            expect(component.weekError()).toBeNull();
        });

        it('should leave an unpublished week empty, without any message', () => {
            createComponent(['STUDENT']);
            timetableService.getOwnWeek.and.returnValue(
                throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Aucun emploi du temps validé n’est encore disponible…' } }))
            );

            component.onRangeChange(WEEK);
            fixture.detectChanges();
            fixture.detectChanges();

            expect(component.events()).toEqual([]);
            expect(component.weekError()).toBeNull();
            const html = fixture.nativeElement as HTMLElement;
            expect(html.querySelector('[role="alert"]')).toBeNull();
            expect(html.textContent).not.toContain('Aucun emploi du temps validé');
        });

        it('should report a real loading failure', () => {
            createComponent(['STUDENT']);
            timetableService.getOwnWeek.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

            component.onRangeChange(WEEK);
            fixture.detectChanges();
            fixture.detectChanges();

            expect(component.weekError()).toBe('Impossible de charger l’horaire.');
            expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Impossible de charger l’horaire.');
        });
    });

    describe('professeur', () => {
        it('should show only their sessions of validated timetables, with the promotion', () => {
            createComponent(['PROFESSOR']);

            component.onRangeChange(WEEK);
            fixture.detectChanges();

            expect(assignmentService.getByProfessor).toHaveBeenCalledWith('prof-1');
            expect(entryService.getByCourseAssignment).toHaveBeenCalledOnceWith('ca-1');
            expect(component.events().map((event) => event.id)).toEqual(['e-validated']);
            expect(component.events()[0].title).toBe('Algèbre');
            expect((component.events()[0].extendedProps as { session: { professor_name: string } }).session.professor_name).toBe('PO Ada Lovelace');
            expect((component.events()[0].extendedProps as { session: { promotion: string } }).session.promotion).toBe('Informatique · Licence 1');
        });

        it('should read each timetable once across weeks', () => {
            createComponent(['PROFESSOR']);
            component.onRangeChange(WEEK);
            fixture.detectChanges();
            component.onRangeChange(TWO_WEEKS);
            fixture.detectChanges();
            component.onRangeChange(WEEK);
            fixture.detectChanges();

            expect(timetableService.getById.calls.allArgs().map(([id]) => id).sort()).toEqual(['tt-1', 'tt-2']);
        });

        it('should say when no professor profile matches the account', () => {
            createComponent(['PROFESSOR']);
            TestBed.resetTestingModule();
            createComponentWithoutProfessor();

            expect(component.error()).toBe('Aucun profil professeur n’est associé à votre compte.');
            expect(assignmentService.getByProfessor).not.toHaveBeenCalled();
        });

        function createComponentWithoutProfessor(): void {
            TestBed.configureTestingModule({
                imports: [MyTimetablePage],
                providers: [
                    provideRouter([]),
                    { provide: TimetableService, useValue: timetableService },
                    { provide: TimetableEntryService, useValue: entryService },
                { provide: ProfessorLabelService, useValue: { labels: () => of(new Map([['prof-1', 'PO Ada Lovelace']])) } },
                    { provide: ProfessorService, useValue: { resolveCurrent: () => of(null) } },
                    { provide: CourseAssignmentService, useValue: assignmentService },
                    { provide: AuthService, useValue: { getCurrentUser: () => ({ id: 'u-1', profiles: ['PROFESSOR'], authorities: [] }) } }
                ]
            });
            assignmentService.getByProfessor.calls.reset();
            fixture = TestBed.createComponent(MyTimetablePage);
            component = fixture.componentInstance;
            fixture.detectChanges();
        }
    });

    it('should explain that the page is for students and professors', () => {
        createComponent(['ADMIN']);

        expect(component.kind).toBeNull();
        expect(component.error()).toContain('réservé aux étudiants et aux professeurs');
        expect(timetableService.getOwnWeek).not.toHaveBeenCalled();
    });
});
