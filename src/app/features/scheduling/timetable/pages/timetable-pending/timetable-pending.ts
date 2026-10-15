import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { Timetable, TimetableStatus, timetableStatusLabel, timetableStatusSeverity } from '../../models/timetable.model';
import { TimetableScopeService, scopeQuery } from '../../services/timetable-scope.service';
import { TimetableService } from '../../services/timetable.service';
import { TIMETABLE_PATH } from '../../utils/timetable-routes';
import { formatWeekStart } from '../../utils/timetable-time';

const PAGE_SIZE = 10;

const EMPTY_MESSAGES: Record<TimetableStatus, string> = {
    DRAFT: 'Aucun brouillon.',
    SUBMITTED: 'Aucun horaire soumis.',
    VALIDATED: 'Aucun horaire validé.'
};

/**
 * Liste des horaires par statut, du plus proche au plus lointain : brouillons, soumis et
 * validés (à ouvrir pour les consulter ou les rouvrir). L'API ne filtre que sur un statut à la
 * fois : chaque statut a donc sa propre vue paginée.
 */
@Component({
    selector: 'app-timetable-pending-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, SelectButtonModule, TableModule, TagModule, ToastModule, ContentSubtopbar],
    templateUrl: './timetable-pending.html',
    providers: [MessageService]
})
export class TimetablePendingPage implements OnInit {
    private readonly timetableService = inject(TimetableService);
    private readonly permissionService = inject(PermissionService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    /** Un SAF ne liste que les horaires de sa faculté. */
    private readonly scope = inject(TimetableScopeService);
    private readonly facultyScope = scopeQuery(this.scope.facultyId());

    readonly pageSize = PAGE_SIZE;
    readonly formatWeekStart = formatWeekStart;
    readonly statusLabel = timetableStatusLabel;
    readonly statusSeverity = timetableStatusSeverity;
    readonly statusOptions: { label: string; value: TimetableStatus }[] = [
        { label: 'Brouillons', value: 'DRAFT' },
        { label: 'Soumis', value: 'SUBMITTED' },
        { label: 'Validés', value: 'VALIDATED' }
    ];
    readonly status = signal<TimetableStatus>('DRAFT');
    readonly emptyMessage = computed(() => EMPTY_MESSAGES[this.status()]);
    /** Premier rang affiché : remis à 0 quand le statut change. */
    readonly first = signal(0);
    readonly timetables = signal<Timetable[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly loadError = signal<string | null>(null);

    readonly canEdit = computed(() =>
        this.permissionService.hasAnyPermission([SchedulingPermission.TimetableUpdateAll, SchedulingPermission.TimetableEntryUpdateAll])
    );

    readonly actions: SubtopbarAction[] = [
        { label: 'Calendrier', icon: 'pi pi-calendar', severity: 'secondary', outlined: true, routerLink: TIMETABLE_PATH },
        {
            label: 'Ajouter un horaire',
            icon: 'pi pi-plus',
            routerLink: `${TIMETABLE_PATH}/new`,
            permissions: [SchedulingPermission.TimetableCreateAll]
        }
    ];

    private lastPage = 0;

    ngOnInit(): void {
        const state = history.state as { saved?: boolean } | null;
        if (state?.saved) {
            // Après le rendu : le p-toast doit être en place pour afficher le message.
            queueMicrotask(() => this.messageService.add({ severity: 'success', summary: 'Horaire', detail: 'Horaire enregistré.' }));
        }
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        const rows = event.rows ?? PAGE_SIZE;
        this.first.set(event.first ?? 0);
        this.load(Math.floor((event.first ?? 0) / rows), rows);
    }

    onStatusChange(status: TimetableStatus | null): void {
        // SelectButton renvoie null quand on reclique l'option active : on la garde.
        if (!status || status === this.status()) {
            return;
        }
        this.status.set(status);
        this.first.set(0);
        this.load(0, PAGE_SIZE);
    }

    reload(): void {
        this.load(this.lastPage, PAGE_SIZE);
    }

    edit(timetable: Timetable): void {
        void this.router.navigate([TIMETABLE_PATH, timetable.id, 'edit']);
    }

    private load(page: number, size: number): void {
        this.lastPage = page;
        this.loadError.set(null);
        // Un SAF sans faculté ne doit rien voir plutôt que les horaires de toutes les facultés.
        if (this.scope.facultyMissing()) {
            this.loadError.set('Votre compte n’est rattaché à aucune faculté : demandez à un administrateur de le compléter.');
            return;
        }
        this.loading.set(true);
        this.timetableService
            .list({ status: this.status(), ...this.facultyScope, page, size, sort: ['weekStart,asc'] })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (result) => {
                    this.timetables.set(result.content);
                    this.totalRecords.set(result.total_elements);
                    this.loading.set(false);
                },
                error: () => {
                    this.timetables.set([]);
                    this.totalRecords.set(0);
                    this.loading.set(false);
                    this.loadError.set('Impossible de charger les horaires en attente.');
                }
            });
    }
}
