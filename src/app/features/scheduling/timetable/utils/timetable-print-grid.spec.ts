import { PrintSession, PrintableTimetable } from '../models/timetable-print.model';
import { buildPrintGrid, exportFileName, isoWeek, printTime, printableFromTimetable, toPrintSession, weekPeriod } from './timetable-print-grid';

function session(overrides: Partial<PrintSession>): PrintSession {
    return {
        date: '2026-10-19',
        start_hour: '08:00:00',
        end_hour: '12:00:00',
        course: 'Réseaux Informatiques 1',
        professor: 'Prof. Ebedon Mufind',
        room: '412',
        session_type: 'LECTURE',
        ...overrides
    };
}

function timetable(sessions: PrintSession[], weekStart = '2026-10-19'): PrintableTimetable {
    return { title: 'Faculté des Sciences Informatiques', heading: 'L1 — Science Informatique', weekStart, sessions };
}

describe('timetable-print-grid', () => {
    it('should write times like the paper timetable', () => {
        expect(printTime('08:00:00')).toBe('8h00');
        expect(printTime('13:30')).toBe('13h30');
    });

    it('should number ISO weeks, across year boundaries', () => {
        expect(isoWeek('2026-10-12')).toBe(42);
        expect(isoWeek('2026-01-01')).toBe(1);
        expect(isoWeek('2021-01-01')).toBe(53);
        expect(isoWeek('2024-12-30')).toBe(1);
    });

    it('should phrase the period of a week', () => {
        expect(weekPeriod('2026-10-19')).toBe('Du 19 au 25 octobre 2026');
        expect(weekPeriod('2026-09-28')).toBe('Du 28 septembre au 4 octobre 2026');
        expect(weekPeriod('2026-12-28')).toBe('Du 28 décembre 2026 au 3 janvier 2027');
    });

    it('should lay out Monday to Saturday, one row per time slot, with a pause row between morning and afternoon', () => {
        const grid = buildPrintGrid(
            timetable([
                session({ date: '2026-10-19' }),
                session({ date: '2026-10-24' }),
                session({ date: '2026-10-19', start_hour: '13:00:00', end_hour: '17:00:00', course: 'Anglais Technique - 2', professor: 'CT. Godwill Ilunga' }),
                session({ date: '2026-10-26', course: 'Hors semaine' })
            ])
        );

        expect(grid.weekLabel).toBe('Semaine 43');
        expect(grid.period).toBe('Du 19 au 25 octobre 2026');
        expect(grid.days.map((day) => day.weekday)).toEqual(['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']);
        expect(grid.days[0].label).toBe('19 octobre');
        expect(grid.rows.map((row) => (row.kind === 'slot' ? row.label : 'pause'))).toEqual(['8h00 - 12h00', 'pause', '13h00 - 17h00']);

        const morning = grid.rows[0];
        expect(morning.kind === 'slot' && morning.cells.map((cell) => cell.length)).toEqual([1, 0, 0, 0, 0, 1]);
        const afternoon = grid.rows[2];
        expect(afternoon.kind === 'slot' && afternoon.cells[0][0].course).toBe('Anglais Technique - 2');
    });

    it('should add Sunday only when it has a session, and no pause between close slots', () => {
        const grid = buildPrintGrid(
            timetable([session({ date: '2026-10-25', start_hour: '08:00:00', end_hour: '10:00:00' }), session({ date: '2026-10-25', start_hour: '10:30:00', end_hour: '12:00:00' })])
        );
        expect(grid.days.length).toBe(7);
        expect(grid.days[6].weekday).toBe('Dimanche');
        expect(grid.rows.every((row) => row.kind === 'slot')).toBeTrue();
    });

    it('should return no rows for an empty week', () => {
        expect(buildPrintGrid(timetable([])).rows).toEqual([]);
    });

    it('should build a printable week from a promotion timetable, with the level code when known', () => {
        const source = {
            faculty_name: 'Faculté des Sciences Informatiques',
            program_id: 'prog-1',
            program_name: 'Science Informatique',
            program_level_id: 'pl-1',
            program_level_name: 'Licence 1',
            week_start: '2026-10-19'
        };
        const programs = [{ id: 'prog-1', name: 'Science Informatique', code: 'SI', faculty_id: 'fac-1', levels: [{ id: 'pl-1', is_common: false, level: { id: 'l1', code: 'L1', name: 'Licence 1', level_order: 1 } }] }];

        expect(printableFromTimetable(source, [], programs).heading).toBe('L1 — Science Informatique');
        expect(printableFromTimetable(source, [], []).heading).toBe('Licence 1 — Science Informatique');
        expect(printableFromTimetable(source, [], []).title).toBe('Faculté des Sciences Informatiques');
    });

    it('should keep the promotion of a professor session', () => {
        const printed = toPrintSession({
            id: 'e-1',
            date: '2026-10-19',
            start_hour: '08:00:00',
            end_hour: '10:00:00',
            course_code: 'ALG',
            course_name: 'Algèbre',
            professor_name: 'PO Ada Lovelace',
            room_name: 'A101',
            session_type: 'EXAM',
            note: '',
            promotion: 'Informatique · Licence 1'
        });
        expect(printed).toEqual(jasmine.objectContaining({ course: 'Algèbre', professor: 'PO Ada Lovelace', room: 'A101', promotion: 'Informatique · Licence 1' }));
    });

    it('should name export files after the promotion and the weeks', () => {
        expect(exportFileName([timetable([])])).toBe('horaire-l1-science-informatique-2026-10-19');
        expect(exportFileName([timetable([], '2026-10-26'), timetable([])])).toBe('horaire-l1-science-informatique-2026-10-19-au-2026-10-26');
    });
});
