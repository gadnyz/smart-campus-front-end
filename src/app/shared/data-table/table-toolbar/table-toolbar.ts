import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { EXPORT_SERVICE } from '../../export/export.service';
import { ImportConfig } from '../../import/import.model';
import { ImportDialog } from '../../import/import-dialog/import-dialog';
import { ColumnDef } from '../column.model';
import { toTableDocument } from '../table-export';
import { TableQuery } from '../table-query';

type Busy = 'print' | 'excel' | null;

/**
 * Les actions d'un tableau : Imprimer, Exporter en Excel, Actualiser et, si la page le permet,
 * Importer. L'export reprend ce qui est affiché (lignes filtrées et triées, filtres en tête).
 */
@Component({
    selector: 'app-table-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, TooltipModule, ImportDialog],
    template: `
        <div class="table-toolbar" role="toolbar" [attr.aria-label]="'Actions sur ' + title()">
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
        `
    ]
})
export class TableToolbar<T> {
    private readonly exporter = inject(EXPORT_SERVICE);
    private readonly messages = inject(MessageService, { optional: true });

    readonly title = input.required<string>();
    readonly subtitle = input<string | undefined>(undefined);
    readonly columns = input.required<readonly ColumnDef<T>[]>();
    /** Les lignes affichées : déjà filtrées et triées. */
    readonly rows = input.required<readonly T[]>();
    readonly query = input<TableQuery | undefined>(undefined);
    readonly refreshing = input(false);
    /** Import Excel, seulement quand la page le permet. */
    readonly importConfig = input<ImportConfig<T> | null>(null);
    readonly refresh = output<void>();

    readonly busy = signal<Busy>(null);
    readonly importVisible = signal(false);

    print(): void {
        // Appel direct depuis le clic : l'onglet d'impression s'ouvre avant tout traitement.
        void this.run('print', this.exporter.print(this.document()));
    }

    excel(): void {
        void this.run('excel', this.exporter.downloadExcel(this.document()));
    }

    private document() {
        return toTableDocument({ title: this.title(), subtitle: this.subtitle(), columns: this.columns(), rows: this.rows(), query: this.query() });
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
