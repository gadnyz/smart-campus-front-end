import { ChangeDetectionStrategy, Component, Injector, computed, inject, input, model, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { apiErrorMessage } from '../../http/api-error';
import { readableApiText } from '../../http/readable-api-text';
import { exportSlug } from '../../export/export.service';
import { ImportConfig, ImportLine, SPREADSHEET_IO } from '../import.model';
import { importColumns, readImport, templateRows } from '../import-reader';

type Step = 'file' | 'preview' | 'done';

/**
 * Import Excel en trois temps : télécharger le modèle et choisir le fichier, contrôler l'aperçu
 * (erreurs ligne par ligne), puis enregistrer les lignes valides. Rien n'est enregistré avant la
 * confirmation.
 */
@Component({
    selector: 'app-import-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, DialogModule, TableModule, TagModule],
    templateUrl: './import-dialog.html'
})
export class ImportDialog<T> {
    private readonly injector = inject(Injector);

    /** Lu au premier usage : la fenêtre fermée ne dépend pas de la librairie Excel. */
    private get spreadsheet() {
        return this.injector.get(SPREADSHEET_IO);
    }

    readonly config = input.required<ImportConfig<T>>();
    readonly visible = model(false);
    /** Au moins une ligne enregistrée : la liste doit être actualisée. */
    readonly imported = output<void>();

    readonly step = signal<Step>('file');
    readonly fileName = signal<string | null>(null);
    readonly reading = signal(false);
    readonly saving = signal(false);
    readonly fileError = signal<string | null>(null);
    readonly lines = signal<ImportLine[]>([]);
    /** Résultat de l'enregistrement : les lignes refusées par le serveur, avec la raison. */
    readonly rejected = signal<{ line: number; message: string }[]>([]);
    readonly savedCount = signal(0);

    readonly headers = computed(() => importColumns(this.config().columns).map((column) => column.label));
    readonly validLines = computed(() => this.lines().filter((line) => line.errors.length === 0));
    readonly invalidLines = computed(() => this.lines().filter((line) => line.errors.length > 0));

    async downloadTemplate(): Promise<void> {
        const { headers, example } = templateRows(this.config().columns);
        await this.spreadsheet.downloadTemplate(exportSlug('modele', this.config().templateName), headers, example);
    }

    async onFile(event: Event): Promise<void> {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
            return;
        }
        this.fileError.set(null);
        this.fileName.set(file.name);
        this.reading.set(true);
        try {
            const { lines, missingColumns } = readImport(await this.spreadsheet.readRows(file), this.config().columns);
            if (missingColumns.length > 0) {
                this.fileError.set(`Colonnes obligatoires absentes : ${missingColumns.join(', ')}. Partez du modèle à télécharger.`);
            } else if (lines.length === 0) {
                this.fileError.set('Le fichier ne contient aucune ligne à importer.');
            } else {
                this.lines.set(lines);
                this.step.set('preview');
            }
        } catch {
            this.fileError.set('Ce fichier ne peut pas être lu : enregistrez-le au format Excel (.xlsx).');
        } finally {
            this.reading.set(false);
            (event.target as HTMLInputElement).value = '';
        }
    }

    /** Enregistre les lignes valides une à une ; une ligne refusée n'arrête pas les suivantes. */
    async save(): Promise<void> {
        this.saving.set(true);
        const rejected: { line: number; message: string }[] = [];
        let saved = 0;
        for (const line of this.validLines()) {
            try {
                await this.config().save(line.values);
                saved++;
            } catch (error) {
                rejected.push({
                    line: line.line,
                    message: error instanceof HttpErrorResponse ? apiErrorMessage(error, 'Ligne refusée par le serveur.') : readableApiText(String((error as Error)?.message ?? 'Ligne refusée.'))
                });
            }
        }
        this.saving.set(false);
        this.savedCount.set(saved);
        this.rejected.set(rejected);
        this.step.set('done');
        if (saved > 0) {
            this.imported.emit();
        }
    }

    restart(): void {
        this.step.set('file');
        this.lines.set([]);
        this.rejected.set([]);
        this.fileName.set(null);
        this.fileError.set(null);
    }

    close(): void {
        this.visible.set(false);
        this.restart();
    }
}
