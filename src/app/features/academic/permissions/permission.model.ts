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

    ProgramReadAll: 'academic:program:read:all',
    ProgramReadOwn: 'academic:program:read:own',
    ProgramCreateAll: 'academic:program:create:all',
    ProgramUpdateAll: 'academic:program:update:all',
    ProgramDeleteAll: 'academic:program:delete:all',

    CourseReadAll: 'academic:course:read:all',
    CourseReadOwn: 'academic:course:read:own',
    CourseCreateAll: 'academic:course:create:all',
    CourseUpdateAll: 'academic:course:update:all',
    CourseDeleteAll: 'academic:course:delete:all',

    CourseUnitReadAll: 'academic:course-unit:read:all',
    CourseUnitCreateAll: 'academic:course-unit:create:all',
    CourseUnitUpdateAll: 'academic:course-unit:update:all',
    CourseUnitDeleteAll: 'academic:course-unit:delete:all',

    ProfessorReadAll: 'academic:professor:read:all',
    ProfessorCreateAll: 'academic:professor:create:all',
    ProfessorUpdateAll: 'academic:professor:update:all',
    ProfessorDeleteAll: 'academic:professor:delete:all',

    CourseAssignmentReadAll: 'academic:course-assignment:read:all',
    CourseAssignmentCreateAll: 'academic:course-assignment:create:all',
    CourseAssignmentUpdateAll: 'academic:course-assignment:update:all',

    StudentReadAll: 'academic:student:read:all',
    StudentUpdateAll: 'academic:student:update:all'
} as const;

export type AcademicPermission = (typeof AcademicPermission)[keyof typeof AcademicPermission];