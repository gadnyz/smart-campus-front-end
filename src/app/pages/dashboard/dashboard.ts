import { Component } from '@angular/core';
import { StatsWidget } from './components/statswidget';
import { ContentSubtopbar , SubtopbarAction} from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { UserList } from '@/app/features/identity/users/components/user-list/user-list';

@Component({
    selector: 'app-dashboard',
    imports: [StatsWidget, UserList, ContentSubtopbar],
    template: `
        <app-content-subtopbar
            kicker=""
            title=""
            [actions]="dashboardActions"
        />

        <div class="grid grid-cols-12 gap-8">
            <app-stats-widget class="contents" />
            <div class="col-span-12">
                <app-user-list/>
            </div>
        </div>
    `
})
export class Dashboard {
      dashboardActions: SubtopbarAction[] = [
        { label: 'Filtrer', icon: 'pi pi-filter', severity: 'info', outlined: true },
    ];
}
