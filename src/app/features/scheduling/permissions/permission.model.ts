/**
 * Autorités exposées par le backend « Scheduling Rest API » (voir /v3/api-docs/Scheduling%20Rest%20API).
 * Seules les autorités "room:*" sont branchées dans l'UI pour le moment ; les autres sont
 * déclarées en commentaire pour préparer les étapes Emplois du temps et Séances.
 */
export const SchedulingPermission = {
    RoomReadAll: 'scheduling:room:read:all',
    RoomCreateAll: 'scheduling:room:create:all',
    RoomUpdateAll: 'scheduling:room:update:all',
    RoomDeleteAll: 'scheduling:room:delete:all'

    // Emplois du temps — pas encore branché dans l'UI.
    // TimetableReadAll: 'scheduling:timetable:read:all',
    // TimetableCreateAll: 'scheduling:timetable:create:all',
    // TimetableUpdateAll: 'scheduling:timetable:update:all',
    // TimetableDeleteAll: 'scheduling:timetable:delete:all',

    // Séances (timetable entries) — pas encore branché dans l'UI.
    // TimetableEntryReadAll: 'scheduling:timetable-entry:read:all',
    // TimetableEntryReadOwn: 'scheduling:timetable-entry:read:own',
    // TimetableEntryCreateAll: 'scheduling:timetable-entry:create:all',
    // TimetableEntryUpdateAll: 'scheduling:timetable-entry:update:all',
    // TimetableEntryDeleteAll: 'scheduling:timetable-entry:delete:all',
} as const;

export type SchedulingPermission = (typeof SchedulingPermission)[keyof typeof SchedulingPermission];
