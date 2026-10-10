import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventClickArg, EventInput } from '@fullcalendar/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { Program, ProgramService } from '@/app/features/academic/academic.public-api';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { TimetableCalendar, TimetableCalendarRange } from '../../components/timetable-calendar/timetable-calendar';
import { TimetableService } from '../../services/timetable.service';
import { programLevelOptions } from '../../utils/program-level';
import { TIMETABLE_PATH } from '../../utils/timetable-routes';

interface SelectOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-timetable-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, RouterLink, ButtonModule, SelectModule, ContentSubtopbar, TimetableCalendar],
    templateUrl: './timetable.html',
    styleUrl: './timetable.scss'
})
export class TimetablePage implements OnInit {
    private readonly timetableService = inject(TimetableService);
    private readonly programService = inject(ProgramService);
    private readonly permissionService = inject(PermissionService);
    private readonly destroyRef = inject(DestroyRef);

    readonly newTimetableLink = `${TIMETABLE_PATH}/new`;
    readonly pendingLink = `${TIMETABLE_PATH}/pending`;

    readonly programs = signal<Program[]>([]);
    readonly programId = signal<string | null>(null);
    readonly programLevelId = signal<string | null>(null);
    readonly loadingPrograms = signal(false);
    readonly loadError = signal<string | null>(null);

    /** Validated timetable entries, once the store fills this signal. */
    readonly events = signal<EventInput[]>([]);
    readonly visibleRange = signal<TimetableCalendarRange | null>(null);
    readonly draftCount = signal(0);

    readonly canCreate = computed(() => this.permissionService.hasAnyPermission([SchedulingPermission.TimetableCreateAll]));
    readonly canListPending = computed(() => this.permissionService.hasAnyPermission([SchedulingPermission.TimetableReadAll]));

    readonly draftBadge = computed(() => {
        const count = this.draftCount();
        return count > 0 ? String(count) : undefined;
    });

    readonly programOptions = computed<SelectOption[]>(() => this.programs().map((program) => ({ label: program.name, value: program.id })));

    readonly programLevelOptions = computed<SelectOption[]>(() => programLevelOptions(this.programs(), this.programId()));

    ngOnInit(): void {
        this.loadPrograms();
        if (this.canListPending()) {
            this.refreshDraftCount();
        }
    }

    loadPrograms(): void {
        this.loadingPrograms.set(true);
        this.loadError.set(null);

        this.programService
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (programs) => {
                    this.programs.set(programs);
                    this.loadingPrograms.set(false);
                },
                error: () => {
                    this.programs.set([]);
                    this.loadingPrograms.set(false);
                    this.loadError.set('Impossible de charger les programmes.');
                }
            });
    }

    onProgramChange(programId: string | null): void {
        this.programId.set(programId);
        this.programLevelId.set(null);
    }

    onProgramLevelChange(programLevelId: string | null): void {
        this.programLevelId.set(programLevelId);
    }

    onRangeChange(range: TimetableCalendarRange): void {
        this.visibleRange.set(range);
    }

    onEventSelected(event: EventClickArg): void {
        void event;
    }

    private refreshDraftCount(): void {
        this.timetableService
            .list({ status: 'DRAFT', page: 0, size: 1 })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (page) => this.draftCount.set(page.total_elements),
                error: () => this.draftCount.set(0)
            });
    }
}
