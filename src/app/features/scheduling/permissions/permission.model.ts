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
    TimetableReadFaculty: 'scheduling:timetable:read:faculty',
    TimetableReadPromotion: 'scheduling:timetable:read:promotion',
    TimetableCreateAll: 'scheduling:timetable:create:all',
    TimetableCreateFaculty: 'scheduling:timetable:create:faculty',
    TimetableUpdateAll: 'scheduling:timetable:update:all',
    TimetableUpdateFaculty: 'scheduling:timetable:update:faculty',
    TimetableDeleteAll: 'scheduling:timetable:delete:all',
    TimetableDeleteFaculty: 'scheduling:timetable:delete:faculty',

    TimetableEntryReadAll: 'scheduling:timetable-entry:read:all',
    TimetableEntryReadOwn: 'scheduling:timetable-entry:read:own',
    TimetableEntryReadFaculty: 'scheduling:timetable-entry:read:faculty',
    TimetableEntryCreateAll: 'scheduling:timetable-entry:create:all',
    TimetableEntryCreateFaculty: 'scheduling:timetable-entry:create:faculty',
    TimetableEntryUpdateAll: 'scheduling:timetable-entry:update:all',
    TimetableEntryUpdateFaculty: 'scheduling:timetable-entry:update:faculty',
    TimetableEntryDeleteAll: 'scheduling:timetable-entry:delete:all',
    TimetableEntryDeleteFaculty: 'scheduling:timetable-entry:delete:faculty'
} as const;

export type SchedulingPermission = (typeof SchedulingPermission)[keyof typeof SchedulingPermission];