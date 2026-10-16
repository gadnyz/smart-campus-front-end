import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { PrintableTimetable } from '../../models/timetable-print.model';
import { TimetableExportService } from '../../services/timetable-export.service';

type ExportKind = 'print' | 'pdf' | 'excel';

/**
 * Bouton « Exporter » : imprimer, télécharger le PDF ou le classeur Excel des semaines fournies.
 * Les semaines sont passées déjà prêtes (pas de chargement au clic), pour que l'impression puisse
 * ouvrir son onglet dans le geste de l'utilisateur.
 */
@Component({
    selector: 'app-timetable-export-menu',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, MenuModule, ToastModule],
    providers: [MessageService],
    template: `
        <p-toast />
        <span [attr.title]="disabledReason()">
        <p-button
            label="Exporter"
            icon="pi pi-download"
            severity="secondary"
            [outlined]="true"
            size="small"
            [loading]="busy() !== null"
            [disabled]="unavailable()"
            [ariaLabel]="unavailable() ? 'Exporter : aucune séance à exporter' : 'Exporter l’horaire'"
            (onClick)="menu.toggle($event)"
        />
        </span>
        <p-menu #menu [model]="items()" [popup]="true" appendTo="body" />
    `
})
export class TimetableExportMenu {
    private readonly exportService = inject(TimetableExportService);
    private readonly messageService = inject(MessageService);

    readonly documents = input<readonly PrintableTimetable[]>([]);
    /** Raison de l'indisponibilité, affichée au survol (sessions non enregistrées…). */
    readonly disabledReason = input<string | null>(null);

    readonly busy = signal<ExportKind | null>(null);
    readonly unavailable = computed(() => this.documents().length === 0 || this.disabledReason() !== null);

    readonly items = computed<MenuItem[]>(() => [
        { label: 'Imprimer', icon: 'pi pi-print', command: () => this.run('print') },
        { label: 'Télécharger le PDF', icon: 'pi pi-file-pdf', command: () => this.run('pdf') },
        { label: 'Télécharger le fichier Excel', icon: 'pi pi-file-excel', command: () => this.run('excel') }
    ]);

    run(kind: ExportKind): void {
        const documents = this.documents();
        if (this.unavailable() || this.busy() !== null) {
            return;
        }
        this.busy.set(kind);
        // Appel synchrone dans le geste : l'impression ouvre son onglet avant tout chargement.
        const task = kind === 'print' ? this.exportService.print(documents) : kind === 'pdf' ? this.exportService.downloadPdf(documents) : this.exportService.downloadExcel(documents);
        task.catch((error: unknown) => {
            this.messageService.add({
                severity: 'error',
                summary: 'Export',
                detail: error instanceof Error && error.message ? error.message : 'L’export n’a pas pu être généré.'
            });
        }).finally(() => this.busy.set(null));
    }
}
