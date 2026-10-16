import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';

export type TimetableView = 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth' | 'listWeek';

export const TIMETABLE_VIEW_OPTIONS: { label: string; value: TimetableView }[] = [
    { label: 'Jour', value: 'timeGridDay' },
    { label: 'Semaine', value: 'timeGridWeek' },
    { label: 'Mois', value: 'dayGridMonth' },
    { label: 'Liste', value: 'listWeek' }
];

/**
 * Barre d'outils du calendrier : navigation, période affichée, vue et, en option, filtres
 * projetés (attribut `timetableFilters`). Les filtres s'affichent dans la barre sur grand écran ;
 * sur téléphone, un bouton les déplie sous la barre pour la garder sur deux lignes au plus.
 */
@Component({
    selector: 'app-timetable-toolbar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, SelectModule],
    templateUrl: './timetable-toolbar.html',
    styleUrl: './timetable-toolbar.scss'
})
export class TimetableToolbar {
    readonly title = input('');
    readonly view = input<TimetableView>('timeGridWeek');
    /** La période affichée contient aujourd'hui : « Aujourd'hui » n'aurait aucun effet. */
    readonly showsToday = input(false);
    /** La page projette des filtres : le bouton « Filtres » est proposé sur téléphone. */
    readonly hasFilters = input(false);
    /** Nombre de filtres renseignés, rappelé sur le bouton quand ils sont repliés. */
    readonly activeFilters = input(0);

    readonly previous = output<void>();
    readonly next = output<void>();
    readonly today = output<void>();
    readonly viewChange = output<TimetableView>();

    readonly viewOptions = TIMETABLE_VIEW_OPTIONS;
    readonly filtersOpen = signal(false);

    toggleFilters(): void {
        this.filtersOpen.update((open) => !open);
    }

    onViewChange(view: TimetableView | null): void {
        if (view && view !== this.view()) {
            this.viewChange.emit(view);
        }
    }
}
