/**
 * Autorités exposées par le backend « Scheduling Rest API ».
 * Lecture et écriture sont des clés distinctes : une route de consultation
 * ne doit exiger que les clés `read`.
 */
export const SchedulingPermission = {
    RoomReadAll: 'scheduling:room:read:all',
    RoomCreateAll: 'scheduling:room:create:all',
    RoomUpdateAll: 'scheduling:room:update:all',
    RoomDeleteAll: 'scheduling:room:delete:all',

    TimetableReadAll: 'scheduling:timetable:read:all',
    TimetableCreateAll: 'scheduling:timetable:create:all',
    TimetableUpdateAll: 'scheduling:timetable:update:all',
    TimetableDeleteAll: 'scheduling:timetable:delete:all',

    TimetableEntryReadAll: 'scheduling:timetable-entry:read:all',
    TimetableEntryReadOwn: 'scheduling:timetable-entry:read:own',
    TimetableEntryCreateAll: 'scheduling:timetable-entry:create:all',
    TimetableEntryUpdateAll: 'scheduling:timetable-entry:update:all',
    TimetableEntryDeleteAll: 'scheduling:timetable-entry:delete:all'
} as const;

export type SchedulingPermission = (typeof SchedulingPermission)[keyof typeof SchedulingPermission];