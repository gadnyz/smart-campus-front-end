import { writeAuthorities } from '@/app/core/permissions/permission-scope';
import { SchedulingManage, SchedulingResource } from '../../permissions/permission.model';

/** Racine des écrans horaires, sous la route `scheduling` déclarée par `schedulingFeature`. */
export const TIMETABLE_PATH = '/scheduling/timetable';

/**
 * Gestion des horaires (admin Scheduling, secrétaire académique de faculté) : calendrier, liste,
 * création, édition. Une écriture sur les horaires à une portée de gestion (faculté ou tout), ou
 * la lecture de tout ; la lecture d'une promotion (étudiants, professeurs) n'y suffit pas.
 * Une seule définition pour les routes, le menu et les actions, avec le mode `any`.
 */
export const MANAGE_TIMETABLES = SchedulingManage.Timetable;

/** Créer un horaire, à la portée de sa faculté ou partout. */
export const CREATE_TIMETABLES = writeAuthorities(`${SchedulingResource.Timetable}:create`);

/** Ouvrir un horaire en édition : modifier l'horaire ou ses séances. */
export const EDIT_TIMETABLES = [
    ...writeAuthorities(`${SchedulingResource.Timetable}:update`),
    ...writeAuthorities(`${SchedulingResource.TimetableEntry}:update`)
];
