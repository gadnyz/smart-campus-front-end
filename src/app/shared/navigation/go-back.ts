import { Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Le routeur numérote chaque navigation dans `history.state.navigationId` : 1 pour la page
 * d'arrivée (lien profond, nouvel onglet, rechargement), plus au-delà. Au-dessus de 1, l'entrée
 * précédente de l'historique est un écran de l'application.
 */
export function hasInAppHistory(location: Location): boolean {
    const state = location.getState() as { navigationId?: number } | null;
    return (state?.navigationId ?? 0) > 1;
}

/**
 * Revient à l'écran précédent. Sans écran précédent dans l'application (lien profond, nouvel
 * onglet), ouvre `fallback` plutôt que de quitter l'application ou de ne rien faire.
 */
export function goBack(router: Router, location: Location, fallback: readonly string[]): void {
    if (hasInAppHistory(location)) {
        location.back();
        return;
    }
    void router.navigate([...fallback]);
}
