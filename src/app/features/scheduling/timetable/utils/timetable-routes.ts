import { SchedulingPermission } from '../../permissions/permission.model';

/** Racine des écrans horaires, sous la route `scheduling` déclarée par `schedulingFeature`. */
export const TIMETABLE_PATH = '/scheduling/timetable';

/**
 * Gestion des horaires (admin Scheduling, SAF) : calendrier, liste, création, édition. La lecture
 * seule (`timetable:read:all`) ne suffit pas : étudiants et professeurs la détiennent aussi.
 * Une seule définition pour les routes, le menu et les actions, avec le mode `any`.
 */
export const MANAGE_TIMETABLES = [SchedulingPermission.TimetableCreateAll, SchedulingPermission.TimetableUpdateAll] as const;
