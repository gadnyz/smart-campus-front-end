import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SCOPE_SEVERITIES, groupPrivileges } from '../../utils/privilege-label';

/**
 * Privilèges d'un rôle regroupés par ressource : l'action suivie de sa portée
 * (Personnel, Promotion, Programme, Faculté, Tous). La clé brute reste en infobulle.
 */
@Component({
    selector: 'app-privilege-groups',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TagModule, TooltipModule],
    template: `
        @if (groups().length) {
            <dl class="privilege-groups">
                @for (group of groups(); track group.key) {
                    <div class="privilege-group">
                        <dt class="privilege-group-label">{{ group.label }}</dt>
                        <dd class="privilege-group-items">
                            @for (item of group.items; track item.name) {
                                <span class="privilege-item" [pTooltip]="item.name" tooltipPosition="top">
                                    <span>{{ item.actionLabel }}</span>
                                    @if (item.scope) {
                                        <p-tag [value]="item.scopeLabel ?? ''" [severity]="severities[item.scope]" />
                                    }
                                </span>
                            }
                        </dd>
                    </div>
                }
            </dl>
        } @else {
            <span class="text-color-secondary">{{ emptyLabel() }}</span>
        }
    `,
    styles: `
        .privilege-groups {
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .privilege-group-label {
            font-size: 0.8125rem;
            color: var(--text-color-secondary);
        }
        .privilege-group-items {
            margin: 0.25rem 0 0;
            display: flex;
            flex-wrap: wrap;
            gap: 0.375rem;
        }
        .privilege-item {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.125rem 0.375rem 0.125rem 0.5rem;
            border: 1px solid var(--surface-border);
            border-radius: var(--content-border-radius, 6px);
            font-size: 0.8125rem;
        }
    `
})
export class PrivilegeGroups {
    readonly privileges = input<readonly string[]>([]);
    readonly emptyLabel = input('Aucun');

    protected readonly severities = SCOPE_SEVERITIES;
    readonly groups = computed(() => groupPrivileges(this.privileges()));
}
