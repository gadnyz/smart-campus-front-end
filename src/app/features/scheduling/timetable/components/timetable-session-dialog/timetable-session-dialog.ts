import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { sessionTypeLabel } from '../../models/timetable-entry.model';
import { CalendarSession } from '../../models/timetable-view.model';
import { formatEntryTime } from '../../utils/timetable-time';

/** Détail d'une séance cliquée dans un calendrier, en lecture seule. */
@Component({
    selector: 'app-timetable-session-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DialogModule],
    template: `
        <p-dialog
            [header]="title()"
            [visible]="session() !== null"
            (visibleChange)="$event || closed.emit()"
            [modal]="true"
            [draggable]="false"
            [dismissableMask]="true"
            [style]="{ width: '28rem' }"
            [breakpoints]="{ '640px': '95vw' }"
            appendTo="body"
        >
            @if (session(); as current) {
                <dl class="session-details">
                    <dt>Date</dt>
                    <dd>{{ when() }}</dd>
                    <dt>Type</dt>
                    <dd>{{ typeLabel(current.session_type) }}</dd>
                    @if (current.promotion) {
                        <dt>Promotion</dt>
                        <dd>{{ current.promotion }}</dd>
                    }
                    <dt>Enseignant</dt>
                    <dd>{{ current.professor_name || '—' }}</dd>
                    <dt>Salle</dt>
                    <dd>{{ current.room_name || '—' }}</dd>
                    @if (current.note) {
                        <dt>Note</dt>
                        <dd class="session-note">{{ current.note }}</dd>
                    }
                </dl>
            }
        </p-dialog>
    `,
    styles: `
        .session-details {
            display: grid;
            grid-template-columns: max-content 1fr;
            gap: 0.5rem 1rem;
            margin: 0;
        }
        dt {
            color: var(--p-text-muted-color);
            font-size: 0.875rem;
        }
        dd {
            margin: 0;
            min-width: 0;
        }
        .session-note {
            white-space: pre-line;
        }
    `
})
export class TimetableSessionDialog {
    readonly session = input<CalendarSession | null>(null);
    readonly closed = output<void>();

    readonly typeLabel = sessionTypeLabel;

    readonly title = computed(() => {
        const session = this.session();
        if (!session) {
            return '';
        }
        return session.course_code ? `${session.course_code} · ${session.course_name}` : session.course_name;
    });

    readonly when = computed(() => {
        const session = this.session();
        if (!session) {
            return '';
        }
        const [year, month, day] = session.date.split('-').map(Number);
        const date = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day));
        return `${date}, ${formatEntryTime(session.start_hour)} – ${formatEntryTime(session.end_hour)}`;
    });
}
