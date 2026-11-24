import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { PermissionMode, PermissionValue } from '@/app/core/permissions/permission.model';

export type SubtopbarAction = {
    label: string;
    icon?: string;
    severity?: 'primary' | 'secondary' | 'contrast' | 'success' | 'info' | 'warn' | 'help' | 'danger';
    outlined?: boolean;
    text?: boolean;
    routerLink?: string | string[];
    command?: () => void;
    disabled?: boolean;
    loading?: boolean;
    /** Pastille sur le bouton (un compteur, par exemple) ; masquée quand absente. */
    badge?: string;
    badgeSeverity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';
    ariaLabel?: string;
    permissions?: readonly PermissionValue[];
    mode?: PermissionMode;
    /**
     * Action principale : reste visible quand la barre range les autres dans le menu « ⋮ »
     * (`maxVisible`). Sans action marquée, les premières de la liste restent visibles.
     */
    primary?: boolean;
};

/** Parcours d'une fiche à l'autre : Précédent, la position (« 3/42 »), Suivant. */
export interface SubtopbarNavigation {
    position?: string | null;
    hasPrevious: boolean;
    hasNext: boolean;
    previous: () => void;
    next: () => void;
    disabled?: boolean;
}

@Component({
    selector: 'app-content-subtopbar',
    standalone: true,
    imports: [CommonModule, RouterModule, BadgeModule, ButtonModule, MenuModule],
    templateUrl: './content-subtopbar.html',
    styleUrl: './content-subtopbar.scss'
})
export class ContentSubtopbar {
    private readonly permissionService = inject(PermissionService);

    /** Le module (« Académique »…), identique au menu, écrit en capitales au-dessus du titre. */
    kicker = input('');
    title = input('Vue');
    actions = input<SubtopbarAction[]>([]);
    /** Précédent et Suivant d'une fiche ; absent sur les listes. */
    navigation = input<SubtopbarNavigation | null>(null);
    /**
     * Nombre d'actions affichées en boutons ; les autres vont dans le menu « ⋮ ». `null` (par
     * défaut) : toutes en boutons, comme avant.
     */
    maxVisible = input<number | null>(null);

    /**
     * Couleur d'une action. « info » (bleu ciel) désignait l'action principale : elle prend la
     * couleur du thème, pour qu'une seule teinte signale l'action principale dans toute l'application.
     */
    severity(action: SubtopbarAction): SubtopbarAction['severity'] {
        return action.severity === 'info' ? 'primary' : action.severity || 'secondary';
    }

    /** Actions autorisées, dans l'ordre donné par la page. */
    readonly allowedActions = computed(() =>
        this.actions().filter((action) =>
            this.permissionService.canAccess({
                permissions: action.permissions,
                mode: action.mode
            })
        )
    );

    /** Les actions en boutons : les principales d'abord, dans la limite de `maxVisible`. */
    readonly visibleActions = computed(() => {
        const allowed = this.allowedActions();
        const limit = this.maxVisible();
        if (limit === null || allowed.length <= limit) {
            return allowed;
        }
        const chosen = new Set(allowed.filter((action) => action.primary).slice(0, limit));
        for (const action of allowed) {
            if (chosen.size >= limit) {
                break;
            }
            chosen.add(action);
        }
        return allowed.filter((action) => chosen.has(action));
    });

    /** Les autres actions, rangées dans le menu d'outils « ⋮ ». */
    readonly menuItems = computed<MenuItem[]>(() => {
        const visible = new Set(this.visibleActions());
        return this.allowedActions()
            .filter((action) => !visible.has(action))
            .map((action) => ({
                label: action.label,
                icon: action.icon,
                disabled: action.disabled || action.loading,
                routerLink: action.routerLink,
                command: action.command ? () => action.command?.() : undefined,
                styleClass: action.severity === 'danger' ? 'content-subtopbar-menu-danger' : undefined
            }));
    });
}
