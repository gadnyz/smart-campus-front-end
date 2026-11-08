import { manageAuthorities } from '@/app/core/permissions/permission-scope';

/**
 * Autorités du module Academic. Portées : `own`, `promotion`, `program`, `faculty`, `all`
 * (voir `core/permissions/permission-scope.ts`) ; seules celles déclarées par le backend figurent ici.
 */
export const AcademicPermission = {
    AcademicYearReadAll: 'academic:academic-year:read:all',
    AcademicYearCreateAll: 'academic:academic-year:create:all',
    AcademicYearUpdateAll: 'academic:academic-year:update:all',
    AcademicYearDeleteAll: 'academic:academic-year:delete:all',

    SemesterReadAll: 'academic:semester:read:all',
    SemesterReadOwn: 'academic:semester:read:own',
    SemesterCreateAll: 'academic:semester:create:all',
    SemesterUpdateAll: 'academic:semester:update:all',
    SemesterDeleteAll: 'academic:semester:delete:all',

    LevelReadAll: 'academic:level:read:all',
    LevelReadOwn: 'academic:level:read:own',
    LevelCreateAll: 'academic:level:create:all',
    LevelUpdateAll: 'academic:level:update:all',
    LevelDeleteAll: 'academic:level:delete:all',

    ProfessorGradeReadAll: 'academic:professor-grade:read:all',
    ProfessorGradeCreateAll: 'academic:professor-grade:create:all',
    ProfessorGradeUpdateAll: 'academic:professor-grade:update:all',
    ProfessorGradeDeleteAll: 'academic:professor-grade:delete:all',

    FacultyReadAll: 'academic:faculty:read:all',
    FacultyReadOwn: 'academic:faculty:read:own',
    FacultyCreateAll: 'academic:faculty:create:all',
    FacultyUpdateAll: 'academic:faculty:update:all',
    FacultyDeleteAll: 'academic:faculty:delete:all',

    FacultyLeadershipReadFaculty: 'academic:faculty-leadership:read:faculty',

    ProgramReadAll: 'academic:program:read:all',
    ProgramReadOwn: 'academic:program:read:own',
    ProgramCreateAll: 'academic:program:create:all',
    ProgramUpdateAll: 'academic:program:update:all',
    ProgramDeleteAll: 'academic:program:delete:all',

    CourseReadAll: 'academic:course:read:all',
    CourseReadOwn: 'academic:course:read:own',
    CourseReadFaculty: 'academic:course:read:faculty',
    CourseReadPromotion: 'academic:course:read:promotion',
    CourseCreateAll: 'academic:course:create:all',
    CourseUpdateAll: 'academic:course:update:all',
    CourseDeleteAll: 'academic:course:delete:all',

    CourseUnitReadAll: 'academic:course-unit:read:all',
    CourseUnitReadFaculty: 'academic:course-unit:read:faculty',
    CourseUnitReadPromotion: 'academic:course-unit:read:promotion',
    CourseUnitCreateAll: 'academic:course-unit:create:all',
    CourseUnitUpdateAll: 'academic:course-unit:update:all',
    CourseUnitDeleteAll: 'academic:course-unit:delete:all',

    ProfessorReadAll: 'academic:professor:read:all',
    ProfessorReadOwn: 'academic:professor:read:own',
    ProfessorReadFaculty: 'academic:professor:read:faculty',
    ProfessorCreateAll: 'academic:professor:create:all',
    ProfessorUpdateAll: 'academic:professor:update:all',
    ProfessorDeleteAll: 'academic:professor:delete:all',

    CourseAssignmentReadAll: 'academic:course-assignment:read:all',
    CourseAssignmentReadFaculty: 'academic:course-assignment:read:faculty',
    CourseAssignmentReadPromotion: 'academic:course-assignment:read:promotion',
    CourseAssignmentCreateAll: 'academic:course-assignment:create:all',
    CourseAssignmentCreateFaculty: 'academic:course-assignment:create:faculty',
    CourseAssignmentUpdateAll: 'academic:course-assignment:update:all',
    CourseAssignmentUpdateFaculty: 'academic:course-assignment:update:faculty',

    StudentReadAll: 'academic:student:read:all',
    StudentReadFaculty: 'academic:student:read:faculty',
    StudentUpdateAll: 'academic:student:update:all',
    StudentUpdateFaculty: 'academic:student:update:faculty',
    StudentReadOwn: 'academic:student:read:own', // placeholder — module étudiant pas encore branché
} as const;

export type AcademicPermission = (typeof AcademicPermission)[keyof typeof AcademicPermission];
/** Ressources du module, pour les droits indépendants de la portée (`canWrite`, `canManage`). */
export const AcademicResource = {
    Faculty: 'academic:faculty',
    Program: 'academic:program',
    CourseUnit: 'academic:course-unit',
    Course: 'academic:course',
    CourseAssignment: 'academic:course-assignment',
    Professor: 'academic:professor',
    Student: 'academic:student'
} as const;

/** Clés ouvrant chaque écran de gestion : une écriture à portée de gestion, ou la lecture de tout. */
export const AcademicManage = {
    Faculty: manageAuthorities(AcademicResource.Faculty),
    CourseUnit: manageAuthorities(AcademicResource.CourseUnit),
    Course: manageAuthorities(AcademicResource.Course),
    Professor: manageAuthorities(AcademicResource.Professor),
    Student: manageAuthorities(AcademicResource.Student)
} as const;
