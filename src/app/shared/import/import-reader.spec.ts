import { ColumnDef } from '../data-table/column.model';
import { readImport, templateRows } from './import-reader';

interface Room {
    name: string;
    capacity: number;
    type: 'NORMAL' | 'LAB';
}

const columns: ColumnDef<Room>[] = [
    { key: 'name', label: 'Nom', type: 'text', value: (row) => row.name, import: { required: true, example: '402 A' } },
    { key: 'capacity', label: 'Capacité', type: 'number', value: (row) => row.capacity, import: { required: true, example: '60' } },
    {
        key: 'type',
        label: 'Type',
        type: 'enum',
        value: (row) => row.type,
        options: [
            { label: 'Salle normale', value: 'NORMAL' },
            { label: 'Laboratoire', value: 'LAB' }
        ],
        import: { example: 'Laboratoire' }
    },
    { key: 'id', label: 'Identifiant', type: 'text', value: () => 'x' }
];

describe('readImport', () => {
    it('should describe the template from the importable columns only', () => {
        expect(templateRows(columns)).toEqual({ headers: ['Nom *', 'Capacité *', 'Type'], example: ['402 A', '60', 'Laboratoire'] });
    });

    it('should read the rows by column label, converting each value', () => {
        const { lines, missingColumns } = readImport([['Type', 'Nom *', 'Capacité'], ['laboratoire', 'Local 7', '40'], ['', '', '']], columns);

        expect(missingColumns).toEqual([]);
        expect(lines).toEqual([{ line: 2, values: { name: 'Local 7', capacity: 40, type: 'LAB' }, cells: ['Local 7', '40', 'laboratoire'], errors: [] }]);
    });

    it('should explain each problem on its own line, without any identifier', () => {
        const { lines } = readImport([['Nom', 'Capacité', 'Type'], ['', 'beaucoup', 'Amphi']], columns);

        expect(lines[0].line).toBe(2);
        expect(lines[0].errors).toEqual([
            'Nom est obligatoire.',
            'Capacité : « beaucoup » n’est pas un nombre.',
            'Type : « Amphi » n’est pas une valeur possible (Salle normale, Laboratoire).'
        ]);
    });

    it('should report a missing required column', () => {
        expect(readImport([['Nom'], ['402 A']], columns).missingColumns).toEqual(['Capacité']);
    });
});
