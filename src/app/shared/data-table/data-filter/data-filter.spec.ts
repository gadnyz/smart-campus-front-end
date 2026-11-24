import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ColumnDef } from '../column.model';
import { EMPTY_QUERY, TableQuery } from '../table-query';
import { DataFilter } from './data-filter';

interface Course {
    name: string;
    credits: number;
}

const columns: ColumnDef<Course>[] = [
    { key: 'name', label: 'Cours', type: 'text', value: (row) => row.name, searchable: true },
    { key: 'credits', label: 'Crédits', type: 'number', value: (row) => row.credits }
];

@Component({
    standalone: true,
    imports: [DataFilter],
    template: `<app-data-filter [columns]="columns" [rows]="rows" [(query)]="query" />`
})
class Host {
    readonly columns = columns;
    readonly rows: Course[] = [
        { name: 'Algèbre', credits: 3 },
        { name: 'Réseaux', credits: 5 }
    ];
    readonly query = signal<TableQuery>(EMPTY_QUERY);
}

describe('DataFilter', () => {
    function setup() {
        const fixture = TestBed.createComponent(Host);
        fixture.detectChanges();
        const filter = fixture.debugElement.children[0].componentInstance as DataFilter<Course>;
        return { fixture, filter, host: fixture.componentInstance };
    }

    it('should offer the conditions of the chosen column type, and the values to tick', () => {
        const { filter } = setup();
        filter.selectColumn('name');
        expect(filter.operatorOptions().map((option) => option.value)).toContain('notContains');
        expect(filter.draftChoices()).toEqual(['Algèbre', 'Réseaux']);

        filter.selectColumn('credits');
        expect(filter.operatorOptions().map((option) => option.value)).toContain('between');
    });

    it('should add a filter to the query, show it as a chip, and remove it', () => {
        const { filter, host, fixture } = setup();
        filter.selectColumn('credits');
        filter.selectOperator('gte');
        filter.draftValue.set(4);
        expect(filter.addFilter()).toBeTrue();
        fixture.detectChanges();

        expect(host.query().filters).toEqual([{ key: 'credits', operator: 'gte', value: 4 }]);
        expect(filter.chips().map((chip) => chip.label)).toEqual(['Crédits supérieur ou égal à « 4 »']);

        filter.removeFilter(0);
        expect(host.query().filters).toEqual([]);
    });

    it('should not add an incomplete filter', () => {
        const { filter, host } = setup();
        filter.selectColumn('name');
        filter.selectOperator('in');
        expect(filter.addFilter()).toBeFalse();
        expect(host.query().filters).toEqual([]);
    });

    it('should sort both ways and clear everything at once', () => {
        const { filter, host } = setup();
        filter.onSearch('alg');
        filter.setSort('name');
        filter.toggleDirection();
        expect(host.query().sort).toEqual({ key: 'name', direction: 'desc' });
        expect(filter.sortLabel()).toBe('Tri : Cours (Z → A)');

        filter.clearAll();
        expect(host.query()).toEqual(EMPTY_QUERY);
    });
});
