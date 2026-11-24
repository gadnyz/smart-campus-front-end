import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { SelectModule } from 'primeng/select';
import { ColumnDef } from '../column.model';
import { FilterOperator, FilterRule, OPERATOR_LABELS, TableQuery, describeRule, describeSort, distinctValues, normalize, operatorsFor } from '../table-query';

/**
 * Recherche, filtres et tri d'un tableau, configurés par ses colonnes (`ColumnDef`).
 *
 * - Recherche simple : un champ texte sur les colonnes `searchable`.
 * - Filtres avancés, comme le filtre de Google Sheets : on choisit une colonne, puis une condition
 *   selon son type (valeurs exactes à cocher, contient, ne contient pas, commence par, vide, avant,
 *   après, entre…). Les filtres se combinent (ET).
 * - Tri croissant ou décroissant sur n'importe quelle colonne.
 *
 * Les filtres actifs restent visibles en pastilles, qu'on retire une à une ou toutes d'un coup.
 * Le composant ne filtre rien lui-même : il tient la `query`, que la page applique (côté
 * navigateur avec `applyQuery`, ou en partie par l'API).
 */
@Component({
    selector: 'app-data-filter',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, CheckboxModule, ChipModule, IconFieldModule, InputIconModule, InputNumberModule, InputTextModule, PopoverModule, SelectModule],
    templateUrl: './data-filter.html',
    styleUrl: './data-filter.scss'
})
export class DataFilter<T> {
    readonly columns = input.required<readonly ColumnDef<T>[]>();
    /** Lignes chargées : elles donnent les valeurs à cocher (« valeur exacte »). */
    readonly rows = input<readonly T[]>([]);
    readonly searchPlaceholder = input('Rechercher…');
    readonly query = model.required<TableQuery>();

    readonly operatorLabels = OPERATOR_LABELS;

    // ----- Brouillon du filtre en cours de saisie -----
    readonly draftKey = signal<string | null>(null);
    readonly draftOperator = signal<FilterOperator | null>(null);
    readonly draftValue = signal<string | number | null>(null);
    readonly draftTo = signal<string | number | null>(null);
    readonly draftValues = signal<string[]>([]);
    readonly valueSearch = signal('');

    readonly filterableColumns = computed(() => this.columns().filter((column) => column.filterable !== false));
    readonly sortableColumns = computed(() => this.columns().filter((column) => column.sortable !== false));
    readonly columnOptions = computed(() => this.filterableColumns().map((column) => ({ label: column.label, value: column.key })));
    readonly sortOptions = computed(() => this.sortableColumns().map((column) => ({ label: column.label, value: column.key })));
    readonly draftColumn = computed(() => this.columns().find((column) => column.key === this.draftKey()) ?? null);
    readonly operatorOptions = computed(() => {
        const column = this.draftColumn();
        return column ? operatorsFor(column.type).map((operator) => ({ label: OPERATOR_LABELS[operator], value: operator })) : [];
    });
    /** Valeurs à cocher de la colonne choisie, filtrées par la petite recherche du panneau. */
    readonly draftChoices = computed(() => {
        const column = this.draftColumn();
        if (!column) {
            return [];
        }
        const search = normalize(this.valueSearch());
        return distinctValues(this.rows(), column).filter((value) => !search || normalize(value).includes(search));
    });
    readonly draftReady = computed(() => {
        const operator = this.draftOperator();
        if (!this.draftColumn() || !operator) {
            return false;
        }
        if (operator === 'empty' || operator === 'notEmpty') {
            return true;
        }
        if (operator === 'in') {
            return this.draftValues().length > 0;
        }
        const filled = (value: string | number | null) => value !== null && String(value).trim() !== '';
        return operator === 'between' ? filled(this.draftValue()) && filled(this.draftTo()) : filled(this.draftValue());
    });

    /** Pastilles des filtres et du tri actifs. */
    readonly chips = computed(() => {
        const byKey = new Map(this.columns().map((column) => [column.key, column]));
        return this.query().filters.map((rule, index) => ({ index, label: describeRule(rule, byKey.get(rule.key)) }));
    });
    readonly sortLabel = computed(() => describeSort(this.query().sort, this.columns()));
    readonly activeCount = computed(() => this.query().filters.length);

    onSearch(search: string): void {
        this.query.update((query) => ({ ...query, search }));
    }

    selectColumn(key: string | null): void {
        this.draftKey.set(key);
        const column = this.columns().find((item) => item.key === key);
        this.draftOperator.set(column ? operatorsFor(column.type)[0] : null);
        this.resetValues();
    }

    selectOperator(operator: FilterOperator | null): void {
        this.draftOperator.set(operator);
        this.resetValues();
    }

    toggleValue(value: string, checked: boolean): void {
        this.draftValues.update((values) => (checked ? [...values, value] : values.filter((item) => item !== value)));
    }

    selectAllValues(all: boolean): void {
        this.draftValues.set(all ? [...this.draftChoices()] : []);
    }

    /** Ajoute le filtre ; un filtre de la même colonne et de la même condition est remplacé. */
    addFilter(): boolean {
        const key = this.draftKey();
        const operator = this.draftOperator();
        if (!key || !operator || !this.draftReady()) {
            return false;
        }
        const rule: FilterRule = { key, operator };
        if (operator === 'in') {
            rule.values = [...this.draftValues()];
        } else if (operator !== 'empty' && operator !== 'notEmpty') {
            rule.value = this.draftValue();
            if (operator === 'between') {
                rule.to = this.draftTo();
            }
        }
        this.query.update((query) => ({
            ...query,
            filters: [...query.filters.filter((item) => !(item.key === key && item.operator === operator)), rule]
        }));
        this.draftKey.set(null);
        this.draftOperator.set(null);
        this.resetValues();
        return true;
    }

    removeFilter(index: number): void {
        this.query.update((query) => ({ ...query, filters: query.filters.filter((_, position) => position !== index) }));
    }

    setSort(key: string | null): void {
        this.query.update((query) => ({ ...query, sort: key ? { key, direction: query.sort?.direction ?? 'asc' } : null }));
    }

    toggleDirection(): void {
        this.query.update((query) => (query.sort ? { ...query, sort: { ...query.sort, direction: query.sort.direction === 'asc' ? 'desc' : 'asc' } } : query));
    }

    clearSort(): void {
        this.setSort(null);
    }

    clearAll(): void {
        this.query.update((query) => ({ ...query, search: '', filters: [], sort: null }));
    }

    private resetValues(): void {
        this.draftValue.set(null);
        this.draftTo.set(null);
        this.draftValues.set([]);
        this.valueSearch.set('');
    }
}
