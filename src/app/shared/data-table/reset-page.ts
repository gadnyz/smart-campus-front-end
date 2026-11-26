import { Signal, effect, untracked } from '@angular/core';
import type { Table } from 'primeng/table';

/**
 * Revient à la première page du tableau quand la recherche ou les filtres changent : sans cela,
 * un filtrage fait depuis la page 3 laisse le tableau sur une page désormais vide.
 * À appeler dans le constructeur d'une page (contexte d'injection).
 */
export function resetPageOnChange(trigger: Signal<unknown>, table: Signal<Table | undefined>): void {
    effect(() => {
        trigger();
        const current = untracked(table);
        if (current) {
            current.first = 0;
        }
    });
}
