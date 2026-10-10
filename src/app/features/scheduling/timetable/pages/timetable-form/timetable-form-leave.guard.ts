import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface LeaveConfirmable {
    confirmLeave(): boolean | Observable<boolean>;
}

/** Laisse la page formulaire décider : sessions non enregistrées, brouillon vide à supprimer. */
export const timetableFormLeaveGuard: CanDeactivateFn<LeaveConfirmable> = (component) => component.confirmLeave();
