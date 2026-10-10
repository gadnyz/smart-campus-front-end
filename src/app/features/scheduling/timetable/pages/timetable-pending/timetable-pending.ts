import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { Timetable } from '../../models/timetable.model';
import { TimetableService } from '../../services/timetable.service';
import { TIMETABLE_PATH } from '../../utils/timetable-routes';
import { formatWeekStart } from '../../utils/timetable-time';

const PAGE_SIZE = 10;

/** Horaires en attente : les brouillons, du plus proche au plus lointain. */
@Component({
    selector: 'app-timetable-pending-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ButtonModule, TableModule, ToastModule, ContentSubtopbar],
    templateUrl: './timetable-pending.html',
    providers: [MessageService]
})
export class TimetablePendingPage implements OnInit {
    private readonly timetableService = inject(TimetableService);
    private readonly permissionService = inject(PermissionService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);

    readonly pageSize = PAGE_SIZE;
    readonly formatWeekStart = formatWeekStart;
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
        this.load(Math.floor((event.first ?? 0) / rows), rows);
    }

    reload(): void {
        this.load(this.lastPage, PAGE_SIZE);
    }

    edit(timetable: Timetable): void {
        void this.router.navigate([TIMETABLE_PATH, timetable.id, 'edit']);
    }

    private load(page: number, size: number): void {
        this.lastPage = page;
        this.loading.set(true);
        this.loadError.set(null);
        this.timetableService
            .list({ status: 'DRAFT', page, size, sort: ['weekStart,asc'] })
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
