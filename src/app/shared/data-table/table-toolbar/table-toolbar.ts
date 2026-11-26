import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { EXPORT_SERVICE } from '../../export/export.service';
import { ImportConfig } from '../../import/import.model';
import { ImportDialog } from '../../import/import-dialog/import-dialog';
import { ColumnDef, defaultVisibleKeys, shownColumns } from '../column.model';
import { toTableDocument } from '../table-export';
import { TableQuery } from '../table-query';

type Busy = 'print' | 'excel' | null;

const STORAGE_PREFIX = 'smartcampus.columns.';

/**
 * Les actions d'un tableau : choisir les colonnes, Imprimer, Exporter en Excel, Actualiser et, si
 * la page le permet, Importer. L'impression et l'export reprennent exactement ce que montre
 * l'écran : les lignes filtrées et les seules colonnes affichées.
 */
@Component({
    selector: 'app-table-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, CheckboxModule, PopoverModule, TooltipModule, ImportDialog],
    template: `
        <div class="table-toolbar" role="toolbar" [attr.aria-label]="'Actions sur ' + title()">
            @if (hideableColumns().length) {
            <p-button icon="pi pi-table" severity="secondary" [text]="true" size="small" pTooltip="Colonnes" tooltipPosition="top"
                ariaLabel="Choisir les colonnes affichées" (onClick)="columnsPanel.toggle($event)" />
            <p-popover #columnsPanel appendTo="body">
                <fieldset class="table-toolbar-columns">
                    <legend>Colonnes affichées</legend>
                    @for (column of hideableColumns(); track column.key) {
                    <div class="table-toolbar-column">
                        <p-checkbox [inputId]="'column-' + column.key" [binary]="true" [ngModel]="isShown(column.key)"
                            (ngModelChange)="toggleColumn(column.key, $event)" />
                        <label [for]="'column-' + column.key">{{ column.label }}</label>
                    </div>
                    }
                    <p-button label="Colonnes par défaut" [text]="true" size="small" (onClick)="resetColumns()" />
                </fieldset>
            </p-popover>
            }
            <p-button icon="pi pi-print" severity="secondary" [text]="true" size="small" pTooltip="Imprimer" tooltipPosition="top"
                ariaLabel="Imprimer la liste" [loading]="busy() === 'print'" [disabled]="busy() !== null" (onClick)="print()" />
            <p-button icon="pi pi-file-excel" severity="secondary" [text]="true" size="small" pTooltip="Exporter en Excel" tooltipPosition="top"
                ariaLabel="Exporter la liste en Excel" [loading]="busy() === 'excel'" [disabled]="busy() !== null" (onClick)="excel()" />
            <p-button icon="pi pi-refresh" severity="secondary" [text]="true" size="small" pTooltip="Actualiser" tooltipPosition="top"
                ariaLabel="Actualiser la liste" [disabled]="refreshing()" (onClick)="refresh.emit()" />
            @if (importConfig(); as config) {
            <p-button icon="pi pi-upload" severity="secondary" [text]="true" size="small" pTooltip="Importer" tooltipPosition="top"
                ariaLabel="Importer depuis Excel" (onClick)="importVisible.set(true)" />
            <app-import-dialog [config]="config" [(visible)]="importVisible" (imported)="refresh.emit()" />
            }
        </div>
    `,
    styles: [
        `
            .table-toolbar {
                display: inline-flex;
                align-items: center;
                gap: 0.125rem;
            }
            .table-toolbar-columns {
                display: flex;
                flex-direction: column;
                gap: 0.4rem;
                margin: 0;
                padding: 0;
                border: 0;
                min-width: 14rem;
            }
            .table-toolbar-columns legend {
                margin-bottom: 0.25rem;
                font-weight: 600;
            }
            .table-toolbar-column {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
        `
    ]
})
export class TableToolbar<T> implements OnInit {
    private readonly injector = inject(Injector);
    private readonly messages = inject(MessageService, { optional: true });

    readonly title = input.required<string>();
    readonly subtitle = input<string | undefined>(undefined);
    readonly columns = input.required<readonly ColumnDef<T>[]>();
    /** Les lignes affichées : déjà filtrées. */
    readonly rows = input.required<readonly T[]>();
    readonly query = input<TableQuery | undefined>(undefined);
    readonly refreshing = input(false);
    /** Import Excel, seulement quand la page le permet. */
    readonly importConfig = input<ImportConfig<T> | null>(null);
    /** Clés des colonnes affichées, partagées avec le tableau de la page. */
    readonly visibleKeys = model<string[]>([]);
    /** Clé de mémorisation du choix des colonnes (dans ce navigateur) ; absente : pas de mémoire. */
    readonly storageKey = input<string | null>(null);
    readonly refresh = output<void>();

    readonly busy = signal<Busy>(null);
    readonly importVisible = signal(false);
    readonly hideableColumns = computed(() => this.columns().filter((column) => column.hideable !== false));

    ngOnInit(): void {
        const saved = this.readSaved();
        const known = new Set(this.columns().map((column) => column.key));
        this.visibleKeys.set(saved ? saved.filter((key) => known.has(key)) : defaultVisibleKeys(this.columns()));
    }

    isShown(key: string): boolean {
        return this.visibleKeys().includes(key);
    }

    /** Ajoute ou retire une colonne, à sa place dans l'ordre du tableau. */
    toggleColumn(key: string, shown: boolean): void {
        const keys = new Set(this.visibleKeys());
        if (shown) {
            keys.add(key);
        } else {
            keys.delete(key);
        }
        this.setKeys(this.columns().filter((column) => keys.has(column.key)).map((column) => column.key));
    }

    resetColumns(): void {
        this.setKeys(defaultVisibleKeys(this.columns()));
    }

    print(): void {
        // Appel direct depuis le clic : l'onglet d'impression s'ouvre avant tout traitement.
        void this.run('print', this.exporter().print(this.document()));
    }

    excel(): void {
        void this.run('excel', this.exporter().downloadExcel(this.document()));
    }

    private setKeys(keys: string[]): void {
        this.visibleKeys.set(keys);
        const storageKey = this.storageKey();
        if (storageKey) {
            try {
                localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(keys));
            } catch {
                // Stockage indisponible (navigation privée) : le choix vaut pour cette visite.
            }
        }
    }

    private readSaved(): string[] | null {
        const storageKey = this.storageKey();
        if (!storageKey) {
            return null;
        }
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + storageKey) ?? 'null') as unknown;
            return Array.isArray(saved) ? saved.filter((key): key is string => typeof key === 'string') : null;
        } catch {
            return null;
        }
    }

    /** Lu au clic : un tableau qui n'exporte rien ne dépend pas du module d'export. */
    private exporter() {
        return this.injector.get(EXPORT_SERVICE);
    }

    /** Seules les colonnes affichées partent à l'impression et à l'export. */
    private document() {
        return toTableDocument({
            title: this.title(),
            subtitle: this.subtitle(),
            columns: shownColumns(this.columns(), this.visibleKeys()),
            allColumns: this.columns(),
            rows: this.rows(),
            query: this.query()
        });
    }

    private async run(kind: Busy, work: Promise<void>): Promise<void> {
        this.busy.set(kind);
        try {
            await work;
        } catch (error) {
            this.messages?.add({
                severity: 'error',
                summary: kind === 'print' ? 'Impression' : 'Export',
                detail: error instanceof Error && error.message ? error.message : 'Le document n’a pas pu être généré.',
                life: 8000
            });
        } finally {
            this.busy.set(null);
        }
    }
}
