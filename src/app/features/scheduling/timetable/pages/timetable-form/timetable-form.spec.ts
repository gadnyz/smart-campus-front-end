import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/services/auth.service';
import {
    AcademicCatalogService,
    CourseAssignment,
    CourseAssignmentService,
    CourseService,
    Program,
    ProgramService
} from '@/app/features/academic/academic.public-api';
import { Room } from '../../../models/room.model';
import { RoomService } from '../../../services/room.service';
import { TimetableEntry } from '../../models/timetable-entry.model';
import { Timetable } from '../../models/timetable.model';
import { ProfessorLabelService } from '../../services/professor-label.service';
import { TimetableEntryService } from '../../services/timetable-entry.service';
import { TimetableService } from '../../services/timetable.service';
import { TimetableFormPage } from './timetable-form';

const ALL_RIGHTS = [
    'scheduling:timetable:create:all',
    'scheduling:timetable:update:all',
    'scheduling:timetable:delete:all',
    'scheduling:timetable-entry:create:all',
    'scheduling:timetable-entry:update:all',
    'scheduling:timetable-entry:delete:all'
];

const program: Program = {
    id: 'prog-1',
    name: 'Informatique',
    code: 'INF',
    faculty_id: 'fac-1',
    faculty_name: 'Sciences',
    levels: [
        { id: 'pl-1', is_common: false, level: { id: 'lvl-1', code: 'L1', name: 'Licence 1', level_order: 1 } },
        { id: 'pl-2', is_common: false, level: { id: 'lvl-2', code: 'L2', name: 'Licence 2', level_order: 2 } }
    ]
};

const room: Room = {
    id: 'room-1',
    name: 'A101',
    location: 'Bâtiment A',
    coordinates: null,
    capacity: 40,
    type: 'NORMAL',
    link: null,
    created_at: '',
    updated_at: ''
};

function timetable(overrides: Partial<Timetable> = {}): Timetable {
    return {
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
        updated_at: '',
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

function assignment(overrides: Partial<CourseAssignment>): CourseAssignment {
    return {
        id: 'ca-1',
        course_id: 'course-1',
        professor_id: 'prof-1',
        academic_year_id: 'year-1',
        assignment_type: 'LEAD_INSTRUCTOR',
        status: 'ACTIVE',
        professor_name: 'Ada Lovelace',
        ...overrides
    };
}

const at = (hours: number, minutes = 0) => new Date(2026, 0, 1, hours, minutes);

describe('TimetableFormPage', () => {
    let fixture: ComponentFixture<TimetableFormPage>;
    let component: TimetableFormPage;
    let timetableService: jasmine.SpyObj<TimetableService>;
    let entryService: jasmine.SpyObj<TimetableEntryService>;
    let assignmentService: jasmine.SpyObj<CourseAssignmentService>;
    let confirmationService: ConfirmationService;
    let router: Router;
    let location: Location;

    // Projet sans zone.js : pas de fakeAsync, l'horloge Jasmine pilote le debounce de l'en-tête.
    // mockDate : debounceTime compare Date.now(), qui doit avancer avec l'horloge.
    beforeEach(() => jasmine.clock().install().mockDate(new Date(2026, 9, 6, 9, 0)));
    afterEach(() => jasmine.clock().uninstall());

    interface CreateOptions {
        edit?: { timetable: Timetable; entries: TimetableEntry[] };
        /** Ouvre l'édition d'un horaire dont le chargement échoue. */
        editError?: HttpErrorResponse;
        authorities?: string[];
        assignments?: Observable<CourseAssignment[]>;
    }

    /** Synchrone (templates déjà inlinés par le builder), pour garder la main sur l'horloge. */
    function createComponent(options: CreateOptions = {}): void {
        timetableService = jasmine.createSpyObj<TimetableService>('TimetableService', ['list', 'getById', 'create', 'changeStatus', 'delete']);
        entryService = jasmine.createSpyObj<TimetableEntryService>('TimetableEntryService', ['create', 'update', 'delete', 'getByTimetable']);
        assignmentService = jasmine.createSpyObj<CourseAssignmentService>('CourseAssignmentService', ['getByCourse']);
        const programService = jasmine.createSpyObj<ProgramService>('ProgramService', ['getAll']);
        const catalog = jasmine.createSpyObj<AcademicCatalogService>('AcademicCatalogService', ['getCurrentAcademicYear']);
        const courseService = jasmine.createSpyObj<CourseService>('CourseService', ['getByProgramLevel']);
        const roomService = jasmine.createSpyObj<RoomService>('RoomService', ['getAll']);

        programService.getAll.and.returnValue(of([program]));
        catalog.getCurrentAcademicYear.and.returnValue(of({ id: 'year-1', label: '2026-2027' }));
        courseService.getByProgramLevel.and.returnValue(
            of([{ id: 'course-1', code: 'ALG', name: 'Algèbre', description: '', credits: 3, course_unit_id: 'cu-1' }])
        );
        roomService.getAll.and.returnValue(of([room]));
        assignmentService.getByCourse.and.returnValue(options.assignments ?? of([assignment({})]));
        timetableService.create.and.callFake((payload) => of(timetable({ program_level_id: payload.program_level_id, week_start: payload.week_start })));
        timetableService.delete.and.returnValue(of(undefined));
        entryService.create.and.callFake((payload) =>
            of(payload.entries.map((item, index) => entry({ ...item, id: `new-${index}`, note: item.note ?? '' })))
        );
        entryService.update.and.callFake((id, payload) => of(entry({ ...payload, id, note: payload.note ?? '' })));
        entryService.delete.and.returnValue(of(undefined));
        if (options.edit) {
            timetableService.getById.and.returnValue(of(options.edit.timetable));
            entryService.getByTimetable.and.returnValue(of(options.edit.entries));
        }
        if (options.editError) {
            const error = options.editError;
            timetableService.getById.and.returnValue(throwError(() => error));
            entryService.getByTimetable.and.returnValue(of([]));
        }
        const routeId = options.edit?.timetable.id ?? (options.editError ? 'tt-missing' : null);

        TestBed.configureTestingModule({
            imports: [TimetableFormPage],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(routeId ? { id: routeId } : {})) } },
                { provide: TimetableService, useValue: timetableService },
                { provide: TimetableEntryService, useValue: entryService },
                { provide: ProfessorLabelService, useValue: { labels: () => of(new Map([['prof-1', 'PO Ada Lovelace']])) } },
                { provide: ProgramService, useValue: programService },
                { provide: AcademicCatalogService, useValue: catalog },
                { provide: CourseService, useValue: courseService },
                { provide: CourseAssignmentService, useValue: assignmentService },
                { provide: RoomService, useValue: roomService },
                {
                    provide: AuthService,
                    useValue: { getCurrentUser: () => ({ id: 'admin', email: 'admin@unh.edu', authorities: options.authorities ?? ALL_RIGHTS }) }
                }
            ]
        });

        router = TestBed.inject(Router);
        location = TestBed.inject(Location);
        spyOn(router, 'navigate').and.resolveTo(true);
        spyOn(location, 'replaceState');

        fixture = TestBed.createComponent(TimetableFormPage);
        component = fixture.componentInstance;
        confirmationService = fixture.debugElement.injector.get(ConfirmationService);
        fixture.detectChanges();
    }

    function fillHeader(levelId = 'pl-1', week = new Date(2026, 9, 7)): void {
        component.headerForm.controls.program_id.setValue('prog-1');
        component.headerForm.controls.program_level_id.setValue(levelId);
        component.headerForm.controls.week_start.setValue(week);
    }

    /** Ouvre la fenêtre « Ajouter une ligne » et la remplit, sans la valider. */
    function fillSession(values: { days?: number[]; start?: Date; end?: Date } = {}): void {
        component.openSessionDialog();
        component.sessionForm.patchValue({
            course_id: 'course-1',
            start: values.start ?? at(8),
            end: values.end ?? at(10),
            days: (values.days ?? [1]) as (1 | 2 | 3 | 4 | 5 | 6 | 7)[],
            room_id: 'room-1',
            session_type: 'LECTURE'
        });
        component.onSessionCourseChange();
    }

    function addFilledLine(values: { days?: number[]; start?: Date; end?: Date } = {}): void {
        fillSession(values);
        component.submitSession();
    }

    describe('création', () => {
        it('should create the timetable once the header is complete, with hidden year and faculty', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(399);
            expect(timetableService.create).not.toHaveBeenCalled();
            jasmine.clock().tick(1);

            expect(timetableService.create).toHaveBeenCalledOnceWith({
                academic_year_id: 'year-1',
                faculty_id: 'fac-1',
                faculty_name: 'Sciences',
                program_id: 'prog-1',
                program_name: 'Informatique',
                program_level_id: 'pl-1',
                program_level_name: 'Licence 1',
                week_start: '2026-10-05'
            });
            expect(component.timetable()?.id).toBe('tt-1');
            // L'état du routeur est conservé : « Retour » sait encore revenir en arrière.
            const [path, query, state] = (location.replaceState as jasmine.Spy).calls.mostRecent().args;
            expect([path, query]).toEqual(['/scheduling/timetable/tt-1/edit', '']);
            expect(state).toBe(location.getState());
        });

        it('should delete then recreate the timetable when the header changes before any session is saved', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);

            component.headerForm.controls.week_start.setValue(new Date(2026, 9, 14));
            jasmine.clock().tick(400);

            expect(timetableService.delete).toHaveBeenCalledOnceWith('tt-1');
            expect(timetableService.create).toHaveBeenCalledTimes(2);
            expect(timetableService.create.calls.mostRecent().args[0].week_start).toBe('2026-10-12');
        });

        it('should bring a typed date back to the Monday of its week', () => {
            createComponent();
            component.headerForm.controls.week_start.setValue(new Date(2026, 9, 8));
            expect(component.headerForm.controls.week_start.value).toEqual(new Date(2026, 9, 5));
            jasmine.clock().tick(400);
        });

        it('should not recreate the timetable when another day of the same week is picked', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            component.headerForm.controls.week_start.setValue(new Date(2026, 9, 9));
            jasmine.clock().tick(400);

            expect(timetableService.create).toHaveBeenCalledTimes(1);
            expect(timetableService.delete).not.toHaveBeenCalled();
        });

        it('should offer to open the existing timetable on a 409', () => {
            createComponent();
            timetableService.create.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Existe déjà' } })));
            timetableService.list.and.returnValue(
                of({ content: [timetable({ id: 'tt-existing' })], page: 0, size: 1, total_elements: 1, total_pages: 1 })
            );
            fillHeader();
            jasmine.clock().tick(400);

            expect(component.headerError()).toBe('Existe déjà');
            expect(timetableService.list).toHaveBeenCalledWith({ programLevelId: 'pl-1', page: 0, size: 100 });
            expect(component.existingTimetableId()).toBe('tt-existing');

            component.openExisting();
            expect(router.navigate).toHaveBeenCalledWith(['/scheduling/timetable', 'tt-existing', 'edit']);
        });

        it('should not create anything without a current academic year', () => {
            createComponent();
            component.currentYear.set(null);
            fillHeader();
            jasmine.clock().tick(400);

            expect(timetableService.create).not.toHaveBeenCalled();
            expect(component.headerError()).toContain('Aucune année académique');
        });

        it('should reset the course of every line when the level changes', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine();

            component.headerForm.controls.program_level_id.setValue('pl-2');
            jasmine.clock().tick(400);

            const line = component.lines.at(0);
            expect(line.controls.course_id.value).toBeNull();
            expect(line.controls.course_assignment_id.value).toBeNull();
            expect(line.controls.room_id.value).toBe('room-1');

            component.save();
            expect(component.lineIssues(line, 0)).toEqual(['Session incomplète : modifiez-la pour la compléter.']);
        });
    });

    describe('affectations', () => {
        it('should pick the only professor of the course for the timetable year, ignoring other years', () => {
            createComponent({
                assignments: of([assignment({ id: 'ca-old', academic_year_id: 'year-0' }), assignment({ id: 'ca-1' }), assignment({ id: 'ca-off', status: 'INACTIVE' })])
            });
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine();

            const line = component.lines.at(0);
            expect(line.controls.course_assignment_id.value).toBe('ca-1');
            expect(component.assignmentOptions(line).map((option) => option.value)).toEqual(['ca-1']);
        });

        it('should not apply a late answer to a session whose course has changed', () => {
            const answer = new Subject<CourseAssignment[]>();
            createComponent({ assignments: answer });
            fillHeader();
            jasmine.clock().tick(400);
            fillSession();
            expect(component.assignmentsLoaded(component.sessionForm)).toBeFalse();

            component.sessionForm.controls.course_id.setValue('course-2');
            answer.next([assignment({})]);

            expect(component.sessionForm.controls.course_assignment_id.value).toBeNull();
        });

        it('should explain that no professor is assigned for the year', () => {
            createComponent({ assignments: of([assignment({ academic_year_id: 'year-0' })]) });
            fillHeader();
            jasmine.clock().tick(400);
            fillSession();
            component.submitSession();

            expect(component.sessionIssues()).toEqual(['Aucun professeur n’est affecté à ce cours pour l’année de l’horaire.']);
        });
    });

    describe('enregistrement', () => {
        it('should require the timetable and at least one line', () => {
            createComponent();
            component.save();
            expect(component.saveError()).toContain('programme, le niveau et la semaine');

            fillHeader();
            jasmine.clock().tick(400);
            component.save();
            expect(component.saveError()).toBe('Ajoutez au moins une session.');
        });

        it('should validate a session only when the dialog is submitted', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            fillSession({ days: [], start: at(10), end: at(9) });
            expect(component.sessionIssues()).toEqual([]);

            component.submitSession();

            expect(component.sessionIssues()).toEqual(['L’heure de fin doit être après l’heure de début.', 'Sélectionnez au moins un jour.']);
            expect(component.lines.length).toBe(0);
            expect(component.dialogVisible()).toBeTrue();

            component.openSessionDialog();
            expect(component.sessionIssues()).toEqual([]);
            component.submitSession();
            expect(component.sessionIssues()).toEqual([
                'Choisissez un cours.',
                'Renseignez l’heure de début et de fin.',
                'Sélectionnez au moins un jour.',
                'Choisissez une salle.'
            ]);
        });

        it('should list a validated session and close the dialog', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine({ days: [3, 1] });
            fixture.detectChanges();

            expect(component.dialogVisible()).toBeFalse();
            expect(component.lines.length).toBe(1);
            const line = component.lines.at(0);
            expect(component.courseLabel(line)).toBe('Algèbre');
            expect(component.hoursLabel(line)).toBe('08:00 – 10:00');
            expect(component.daysLabel(line)).toBe('Lundi, Mercredi');
            expect(component.roomLabel(line)).toBe('A101');
            expect(component.typeLabel(line)).toBe('Cours');
        });

        it('should send the note of a session with each of its days', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            fillSession({ days: [1, 2] });
            component.sessionForm.controls.note.setValue('Apporter la calculatrice');
            component.submitSession();

            component.save();

            const entries = entryService.create.calls.mostRecent().args[0].entries;
            expect(entries.map((item) => item.note)).toEqual(['Apporter la calculatrice', 'Apporter la calculatrice']);
        });

        it('should refuse a session overlapping another line, but not the line it edits', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine({ days: [1, 3] });

            fillSession({ days: [3], start: at(9), end: at(11) });
            component.submitSession();
            expect(component.sessionIssues()).toEqual(['Chevauche la ligne 1 sur un même jour.']);
            expect(component.lines.length).toBe(1);

            component.openSessionDialog(0);
            component.sessionForm.controls.start.setValue(at(9));
            component.submitSession();
            expect(component.sessionIssues()).toEqual([]);
            expect(component.hoursLabel(component.lines.at(0))).toBe('09:00 – 10:00');
        });

        it('should load rooms once, on the first opening of the dialog', () => {
            createComponent();
            const rooms = TestBed.inject(RoomService) as jasmine.SpyObj<RoomService>;
            expect(rooms.getAll).not.toHaveBeenCalled();

            component.openSessionDialog();
            component.closeSessionDialog();
            component.openSessionDialog();

            expect(rooms.getAll).toHaveBeenCalledTimes(1);
            expect(component.rooms().length).toBe(1);
        });

        it('should create one session per selected day and go back to the pending list', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine({ days: [3, 1] });

            component.save();

            expect(entryService.create).toHaveBeenCalledOnceWith({
                timetable_id: 'tt-1',
                entries: [
                    jasmine.objectContaining({ date: '2026-10-05', start_hour: '08:00:00', end_hour: '10:00:00', course_assignment_id: 'ca-1' }),
                    jasmine.objectContaining({ date: '2026-10-07' })
                ]
            });
            expect(router.navigate).toHaveBeenCalledWith(['/scheduling/timetable', 'pending'], { state: { saved: true } });
            expect(component.confirmLeave()).toBeTrue();
        });

        it('should attach a rejected batch error to its line and day', () => {
            createComponent();
            entryService.create.and.returnValue(
                throwError(
                    () =>
                        new HttpErrorResponse({
                            status: 422,
                            error: { detail: 'Lot refusé', errors: [{ index: 1, code: 'ROOM_CONFLICT', message: 'Salle occupée' }] }
                        })
                )
            );
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine({ days: [1] });
            addFilledLine({ days: [2, 4] });

            component.save();

            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.lineIssues(component.lines.at(1), 1)).toEqual(['Mardi : Salle occupée']);
            expect(component.lineIssues(component.lines.at(0), 0)).toEqual([]);
            expect(component.saveError()).toContain('corrigez les lignes signalées');
        });
    });

    describe('édition', () => {
        function createEditComponent(status: Timetable['status'] = 'DRAFT'): void {
            createComponent({
                edit: {
                    timetable: timetable({ status }),
                    entries: [
                        entry({ id: 'e-mon', date: '2026-10-05' }),
                        entry({ id: 'e-wed', date: '2026-10-07' }),
                        entry({ id: 'e-fri', date: '2026-10-09', start_hour: '14:00:00', end_hour: '16:00:00' })
                    ]
                }
            });
        }

        it('should group saved sessions into lines and lock the header', () => {
            createEditComponent();

            expect(component.title()).toBe('Modifier un horaire');
            expect(component.lines.length).toBe(2);
            expect(component.lines.at(0).controls.days.value).toEqual([1, 3]);
            expect(component.headerForm.disabled).toBeTrue();
            expect(component.headerForm.getRawValue().program_level_id).toBe('pl-1');
        });

        it('should only write the differences on save', () => {
            createEditComponent();
            component.lines.at(0).controls.days.setValue([1, 2]);
            component.lines.at(1).controls.start.setValue(at(15));
            component.lines.at(1).controls.end.setValue(at(17));

            component.save();

            expect(entryService.delete).toHaveBeenCalledOnceWith('e-wed');
            expect(entryService.update).toHaveBeenCalledOnceWith('e-fri', jasmine.objectContaining({ start_hour: '15:00:00', date: '2026-10-09' }));
            expect(entryService.create).toHaveBeenCalledOnceWith({ timetable_id: 'tt-1', entries: [jasmine.objectContaining({ date: '2026-10-06' })] });
            expect(router.navigate).toHaveBeenCalled();
        });

        it('should edit a saved line through the dialog and keep its saved sessions', () => {
            createEditComponent();
            const line = component.lines.at(0);
            expect(component.roomLabel(line)).toBe('A101');
            expect(component.courseLabel(line)).toBe('Algèbre');

            component.openSessionDialog(0);
            expect(component.dialogTitle()).toBe('Modifier la session');
            expect(component.sessionForm.controls.days.value).toEqual([1, 3]);
            component.sessionForm.controls.session_type.setValue('EXAM');
            component.submitSession();

            expect(component.lines.length).toBe(2);
            expect(line.controls.session_type.value).toBe('EXAM');
            expect(line.controls.entry_ids.value).toEqual({ 1: 'e-mon', 3: 'e-wed' });
            expect(component.lines.dirty).toBeTrue();
        });

        it('should be read only once validated', () => {
            createEditComponent('VALIDATED');

            expect(component.readOnly()).toBeTrue();
            expect(component.lines.disabled).toBeTrue();
            const html = fixture.nativeElement as HTMLElement;
            expect(html.querySelector('.timetable-form-top p-tag')?.textContent).toContain('Validé');
            expect(html.querySelector('[aria-label="Enregistrer les sessions de l’horaire"]')).toBeNull();
        });

        it('should report failed writes per line and keep successful ones', () => {
            createEditComponent();
            entryService.delete.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500, error: { detail: 'Panne' } })));
            entryService.update.and.returnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Salle occupée' } })));
            component.lines.at(0).controls.days.setValue([1, 2]);
            component.lines.at(1).controls.start.setValue(at(15));
            component.lines.at(1).controls.end.setValue(at(17));

            component.save();

            expect(router.navigate).not.toHaveBeenCalled();
            expect(component.saveError()).toBe('Une séance n’a pas pu être supprimée : Panne');
            expect(component.lineIssues(component.lines.at(1), 1)).toEqual(['Vendredi : Salle occupée']);
            // Le mardi créé est rattaché à sa ligne : un nouvel essai ne le recréera pas.
            expect(component.lines.at(0).controls.entry_ids.value[2]).toBe('new-0');
            expect(component.persisted().map((item) => item.id)).toContain('e-wed');
        });

        it('should keep the inactive assignment of a saved session selectable', () => {
            createComponent({
                assignments: of([]),
                edit: { timetable: timetable(), entries: [entry({ id: 'e-mon', date: '2026-10-05' })] }
            });

            expect(component.assignmentOptions(component.lines.at(0))).toEqual([{ label: 'Ada Lovelace (affectation inactive)', value: 'ca-1' }]);
        });

        it('should report a timetable that cannot be loaded', () => {
            createComponent({ editError: new HttpErrorResponse({ status: 404, error: { detail: 'Horaire introuvable' } }) });

            expect(component.loadError()).toBe('Horaire introuvable');
            expect(component.loading()).toBeFalse();
        });
    });

    describe('export', () => {
        it('should export the saved sessions with the faculty, the level code and graded professors', () => {
            createComponent({ edit: { timetable: timetable(), entries: [entry({ id: 'e-mon', date: '2026-10-05' })] } });

            const [document] = component.exportDocuments();
            expect(document.title).toBe('Sciences');
            expect(document.heading).toBe('L1 — Informatique');
            expect(document.weekStart).toBe('2026-10-05');
            expect(document.sessions).toEqual([jasmine.objectContaining({ course: 'Algèbre', professor: 'PO Ada Lovelace', room: 'A101' })]);
            expect(component.exportBlockedReason()).toBeNull();
        });

        it('should block the export while sessions are modified, or before any is saved', () => {
            createComponent({ edit: { timetable: timetable(), entries: [entry({ id: 'e-mon', date: '2026-10-05' })] } });
            component.lines.markAsDirty();
            expect(component.exportBlockedReason()).toContain('Enregistrez d’abord');

            TestBed.resetTestingModule();
            createComponent();
            expect(component.exportDocuments()).toEqual([]);
            expect(component.exportBlockedReason()).toBe('Aucune session enregistrée à exporter.');
        });
    });

    describe('statut', () => {
        function openSaved(status: Timetable['status'] = 'DRAFT', entries = [entry({ id: 'e-mon', date: '2026-10-05' })], authorities?: string[]): void {
            createComponent({ edit: { timetable: timetable({ status }), entries }, authorities });
            timetableService.changeStatus.and.callFake((id, payload) => of(timetable({ id, status: payload.status })));
            spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
                confirmation.accept?.();
                return confirmationService;
            });
        }

        const labels = () => component.statusActions().map((action) => action.label);

        it('should walk through submit, validate and reopen', () => {
            openSaved();
            expect(component.statusLabel()).toBe('Brouillon');
            expect(labels()).toEqual(['Soumettre']);

            component.changeStatus(component.statusActions()[0]);
            expect(timetableService.changeStatus).toHaveBeenCalledWith('tt-1', { status: 'SUBMITTED' });
            expect(component.statusLabel()).toBe('Soumis');
            expect(labels()).toEqual(['Renvoyer en brouillon', 'Valider']);

            component.changeStatus(component.statusActions()[1]);
            expect(component.statusLabel()).toBe('Validé');
            expect(component.readOnly()).toBeTrue();
            expect(component.lines.disabled).toBeTrue();
            expect(labels()).toEqual(['Rouvrir']);

            component.changeStatus(component.statusActions()[0]);
            expect(timetableService.changeStatus.calls.mostRecent().args[1]).toEqual({ status: 'SUBMITTED' });
            expect(component.readOnly()).toBeFalse();
            expect(component.lines.enabled).toBeTrue();
        });

        it('should show the actions in the subtitle bar and the status at the top right', () => {
            openSaved('SUBMITTED');
            fixture.detectChanges();
            const html = fixture.nativeElement as HTMLElement;
            const buttons = Array.from(html.querySelectorAll('app-content-subtopbar button')).map((button) => button.textContent?.trim());

            expect(buttons).toEqual(['Retour', 'Renvoyer en brouillon', 'Valider']);
            expect(html.querySelector('.timetable-form-top p-tag')?.textContent).toContain('Soumis');

            (html.querySelectorAll('app-content-subtopbar button')[2] as HTMLButtonElement).click();
            expect(timetableService.changeStatus).toHaveBeenCalledWith('tt-1', { status: 'VALIDATED' });
        });

        it('should send a submitted timetable back to draft', () => {
            openSaved('SUBMITTED');
            component.changeStatus(component.statusActions()[0]);
            expect(timetableService.changeStatus).toHaveBeenCalledWith('tt-1', { status: 'DRAFT' });
            expect(labels()).toEqual(['Soumettre']);
        });

        it('should ask to save modified sessions first', () => {
            openSaved();
            component.lines.markAsDirty();
            component.changeStatus(component.statusActions()[0]);

            expect(confirmationService.confirm).not.toHaveBeenCalled();
            expect(component.statusError()).toBe('Enregistrez d’abord les sessions modifiées.');
        });

        it('should refuse to submit a timetable without any saved session', () => {
            openSaved('DRAFT', []);
            component.changeStatus(component.statusActions()[0]);

            expect(timetableService.changeStatus).not.toHaveBeenCalled();
            expect(component.statusError()).toBe('Enregistrez au moins une session avant de soumettre l’horaire.');
        });

        it('should report a refused transition', () => {
            openSaved();
            timetableService.changeStatus.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Transition interdite' } })));
            component.changeStatus(component.statusActions()[0]);

            expect(component.statusError()).toBe('Transition interdite');
            expect(component.statusLabel()).toBe('Brouillon');
            expect(component.statusChanging()).toBeFalse();
        });

        it('should offer no transition without the timetable update right', () => {
            openSaved('DRAFT', undefined, ['scheduling:timetable-entry:update:all']);
            expect(component.statusLabel()).toBe('Brouillon');
            expect(component.statusActions()).toEqual([]);
        });
    });

    describe('sortie de page', () => {
        it('should silently delete an empty timetable it created', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);

            let leave: boolean | undefined;
            const result = component.confirmLeave();
            (result as Observable<boolean>).subscribe((value) => (leave = value));

            expect(leave).toBeTrue();
            expect(timetableService.delete).toHaveBeenCalledOnceWith('tt-1');
        });

        it('should ask before dropping unsaved lines, and stay on reject', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine();
            spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
                confirmation.reject?.();
                return confirmationService;
            });

            let leave: boolean | undefined;
            (component.confirmLeave() as Observable<boolean>).subscribe((value) => (leave = value));

            expect(leave).toBeFalse();
            expect(timetableService.delete).not.toHaveBeenCalled();
        });

        it('should delete the empty timetable when the user confirms leaving unsaved lines', () => {
            createComponent();
            fillHeader();
            jasmine.clock().tick(400);
            addFilledLine();
            spyOn(confirmationService, 'confirm').and.callFake((confirmation) => {
                confirmation.accept?.();
                return confirmationService;
            });

            let leave: boolean | undefined;
            (component.confirmLeave() as Observable<boolean>).subscribe((value) => (leave = value));

            expect(leave).toBeTrue();
            expect(timetableService.delete).toHaveBeenCalledOnceWith('tt-1');
        });

        it('should fall back to the calendar on cancel when the page was opened directly', () => {
            createComponent();
            spyOn(location, 'back');
            component.cancel();
            expect(location.back).not.toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/scheduling/timetable']);
        });

        it('should go back to the previous screen with « Retour » and « Annuler »', () => {
            createComponent();
            spyOn(location, 'getState').and.returnValue({ navigationId: 4 });
            const back = spyOn(location, 'back');

            const retour = component.actions().find((action) => action.label === 'Retour');
            expect(retour?.routerLink).toBeUndefined();
            retour?.command?.();
            component.cancel();

            expect(back).toHaveBeenCalledTimes(2);
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should leave freely when nothing was created or changed', () => {
            createComponent();
            expect(component.confirmLeave()).toBeTrue();
        });
    });
});
