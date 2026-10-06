import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EventClickArg, EventInput } from '@fullcalendar/core';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { AcademicCatalogService, Program, ProgramService } from '@/app/features/academic/academic.public-api';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { SchedulingPermission } from '../../../permissions/permission.model';
import { TimetableCalendar, TimetableCalendarRange } from '../../components/timetable-calendar/timetable-calendar';

interface SelectOption {
    label: string;
    value: string;
}

@Component({
    selector: 'app-timetable-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, SelectModule, ContentSubtopbar, TimetableCalendar],
    templateUrl: './timetable.html',
    styleUrl: './timetable.scss'
})
export class TimetablePage implements OnInit {
    private readonly catalog = inject(AcademicCatalogService);
    private readonly programService = inject(ProgramService);
    private readonly permissionService = inject(PermissionService);
    private readonly destroyRef = inject(DestroyRef);

    readonly programs = signal<Program[]>([]);
    readonly programId = signal<string | null>(null);
    readonly programLevelId = signal<string | null>(null);
    readonly loadingPrograms = signal(false);
    readonly loadError = signal<string | null>(null);

    /** Validated timetable entries, once the store fills this signal. */
    readonly events = signal<EventInput[]>([]);
    readonly visibleRange = signal<TimetableCalendarRange | null>(null);
    readonly draftCount = signal(0);
    readonly createVisible = signal(false);
    readonly draftsVisible = signal(false);

    readonly canCreate = computed(() =>
        this.permissionService.hasAnyPermission([SchedulingPermission.TimetableCreateAll])
    );

    readonly draftBadge = computed(() => {
        const count = this.draftCount();
        return count > 0 ? String(count) : undefined;
    });

    readonly programOptions = computed<SelectOption[]>(() =>
        this.programs().map((program) => ({ label: program.name, value: program.id }))
    );

    readonly programLevelOptions = computed<SelectOption[]>(() => {
        const program = this.programs().find((item) => item.id === this.programId());
        return (program?.levels ?? []).map((level) => ({
            label: level.is_common ? `${level.level.code} (commun)` : `${level.level.code} — ${level.level.name}`,
            value: level.id
        }));
    });

    ngOnInit(): void {
        this.loadPrograms();
    }

    loadPrograms(): void {
        this.loadingPrograms.set(true);
        this.loadError.set(null);

        this.catalog
            .getFaculties()
            .pipe(
                switchMap((faculties) => {
                    if (faculties.length === 0) {
                        return of([] as Program[]);
                    }
                    return forkJoin(
                        faculties.map((faculty) =>
                            this.programService.getByFaculty(faculty.id).pipe(catchError(() => of([] as Program[])))
                        )
                    ).pipe(map((groups) => groups.flat()));
                }),
                takeUntilDestroyed(this.destroyRef)
            )
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

    openCreate(): void {
        this.createVisible.set(true);
    }

    openDrafts(): void {
        this.draftsVisible.set(true);
    }
}