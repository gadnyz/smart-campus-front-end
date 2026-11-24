import { ColumnDef } from './column.model';
import { EMPTY_QUERY, TableQuery, applyQuery, describeQuery, distinctValues, operatorsFor } from './table-query';

// Premier jeu de champs : des étudiants (texte, liste de valeurs, date).
interface Student {
    name: string;
    promotion: string;
    gender: 'MALE' | 'FEMALE';
    enrolledOn: string | null;
}

const studentColumns: ColumnDef<Student>[] = [
    { key: 'name', label: 'Nom', type: 'text', value: (row) => row.name, searchable: true },
    { key: 'promotion', label: 'Promotion', type: 'text', value: (row) => row.promotion, searchable: true },
    {
        key: 'gender',
        label: 'Genre',
        type: 'enum',
        value: (row) => row.gender,
        options: [
            { label: 'Masculin', value: 'MALE' },
            { label: 'Féminin', value: 'FEMALE' }
        ]
    },
    { key: 'enrolledOn', label: 'Inscription', type: 'date', value: (row) => row.enrolledOn }
];

const students: Student[] = [
    { name: 'Élodie Kalenga', promotion: 'L1 Génie Logiciel', gender: 'FEMALE', enrolledOn: '2026-09-15' },
    { name: 'Fiston Kalala', promotion: 'L1 Génie Logiciel', gender: 'MALE', enrolledOn: '2026-10-01' },
    { name: 'Caleb Mukeba', promotion: 'L3 Intelligence Artificielle', gender: 'MALE', enrolledOn: null }
];

// Second jeu de champs : des salles (texte, nombre, booléen).
interface Room {
    name: string;
    capacity: number | null;
    online: boolean;
}

const roomColumns: ColumnDef<Room>[] = [
    { key: 'name', label: 'Salle', type: 'text', value: (row) => row.name, searchable: true },
    { key: 'capacity', label: 'Capacité', type: 'number', value: (row) => row.capacity },
    { key: 'online', label: 'Visioconférence', type: 'boolean', value: (row) => row.online }
];

const rooms: Room[] = [
    { name: '402 A', capacity: 60, online: false },
    { name: 'Salle Justine', capacity: 120, online: true },
    { name: 'Local 7', capacity: null, online: false }
];

const query = (patch: Partial<TableQuery>): TableQuery => ({ ...EMPTY_QUERY, ...patch });
const names = (rows: { name: string }[]) => rows.map((row) => row.name);

describe('table-query', () => {
    describe('avec des étudiants', () => {
        it('should search the main fields, without accents or case', () => {
            expect(names(applyQuery(students, studentColumns, query({ search: 'elodie' })))).toEqual(['Élodie Kalenga']);
            expect(names(applyQuery(students, studentColumns, query({ search: 'génie' })))).toEqual(['Élodie Kalenga', 'Fiston Kalala']);
        });

        it('should combine filters (AND) on exact values and text conditions', () => {
            const result = applyQuery(
                students,
                studentColumns,
                query({
                    filters: [
                        { key: 'promotion', operator: 'in', values: ['L1 Génie Logiciel'] },
                        { key: 'name', operator: 'notContains', value: 'élodie' }
                    ]
                })
            );
            expect(names(result)).toEqual(['Fiston Kalala']);
        });

        it('should filter a list of values by its readable label', () => {
            expect(names(applyQuery(students, studentColumns, query({ filters: [{ key: 'gender', operator: 'in', values: ['Féminin'] }] })))).toEqual(['Élodie Kalenga']);
        });

        it('should filter dates, and find empty cells', () => {
            expect(names(applyQuery(students, studentColumns, query({ filters: [{ key: 'enrolledOn', operator: 'after', value: '2026-09-20' }] })))).toEqual(['Fiston Kalala']);
            expect(names(applyQuery(students, studentColumns, query({ filters: [{ key: 'enrolledOn', operator: 'between', value: '2026-09-01', to: '2026-09-30' }] })))).toEqual([
                'Élodie Kalenga'
            ]);
            expect(names(applyQuery(students, studentColumns, query({ filters: [{ key: 'enrolledOn', operator: 'empty' }] })))).toEqual(['Caleb Mukeba']);
        });

        it('should sort, keeping empty cells last', () => {
            const sorted = applyQuery(students, studentColumns, query({ sort: { key: 'enrolledOn', direction: 'desc' } }));
            expect(names(sorted)).toEqual(['Fiston Kalala', 'Élodie Kalenga', 'Caleb Mukeba']);
        });

        it('should describe the active search, filters and sort for an export', () => {
            const described = describeQuery(
                query({ search: 'kal', filters: [{ key: 'gender', operator: 'in', values: ['Masculin'] }], sort: { key: 'name', direction: 'asc' } }),
                studentColumns
            );
            expect(described).toEqual(['Recherche : « kal »', 'Genre : Masculin', 'Tri : Nom (A → Z)']);
        });

        it('should offer the distinct values of a column, with every option of a list', () => {
            expect(distinctValues(students, studentColumns[1])).toEqual(['L1 Génie Logiciel', 'L3 Intelligence Artificielle']);
            expect(distinctValues([], studentColumns[2])).toEqual(['Féminin', 'Masculin']);
        });
    });

    describe('avec des salles', () => {
        it('should filter numbers by bounds and range', () => {
            expect(names(applyQuery(rooms, roomColumns, query({ filters: [{ key: 'capacity', operator: 'gte', value: 100 }] })))).toEqual(['Salle Justine']);
            expect(names(applyQuery(rooms, roomColumns, query({ filters: [{ key: 'capacity', operator: 'between', value: 50, to: 70 }] })))).toEqual(['402 A']);
        });

        it('should filter yes/no columns and sort numbers', () => {
            expect(names(applyQuery(rooms, roomColumns, query({ filters: [{ key: 'online', operator: 'in', values: ['Oui'] }] })))).toEqual(['Salle Justine']);
            expect(names(applyQuery(rooms, roomColumns, query({ sort: { key: 'capacity', direction: 'asc' } })))).toEqual(['402 A', 'Salle Justine', 'Local 7']);
            expect(describeQuery(query({ sort: { key: 'capacity', direction: 'desc' } }), roomColumns)).toEqual(['Tri : Capacité (décroissant)']);
        });

        it('should offer conditions that fit each type', () => {
            expect(operatorsFor('number')).toContain('between');
            expect(operatorsFor('boolean')).toEqual(['in', 'empty', 'notEmpty']);
            expect(operatorsFor('text')).toContain('notContains');
        });
    });
});
