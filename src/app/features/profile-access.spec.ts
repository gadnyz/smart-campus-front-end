import { TestBed } from '@angular/core/testing';
import { Routes } from '@angular/router';
import { AuthService } from '@/app/core/auth/services/auth.service';
import { FeatureMenuItem } from '@/app/core/modules/app-feature.model';
import { PermissionRouteData } from '@/app/core/permissions/permission.model';
import { PermissionService } from '@/app/core/permissions/permission.service';
import { academicFeature } from './academic/academic.feature';
import academicRoutes from './academic/routes';
import { admissionFeature } from './admission/admission.feature';
import admissionRoutes from './admission/routes';
import { schedulingFeature } from './scheduling/scheduling.feature';
import timetableRoutes from './scheduling/timetable/routes';

/**
 * Privilèges des profils tels que l'API les attribue (GET /profiles + /roles, novembre 2026),
 * restreints aux modules Academic, Admission et Scheduling.
 */
const PROFILES: Record<string, string[]> = {
    STUDENT: [
        'academic:course-assignment:read:promotion', 'academic:course-unit:read:promotion', 'academic:course:read:promotion',
        'academic:faculty-leadership:read:faculty', 'academic:faculty:read:own', 'academic:level:read:own', 'academic:professor:read:faculty',
        'academic:program:read:own', 'academic:semester:read:all', 'academic:student:read:own',
        'scheduling:room:read:all', 'scheduling:timetable-entry:read:own', 'scheduling:timetable:read:promotion'
    ],
    PROFESSOR: [
        'academic:course-assignment:read:own', 'academic:course-assignment:read:promotion', 'academic:course-unit:read:promotion',
        'academic:course:read:promotion', 'academic:faculty-leadership:read:faculty', 'academic:faculty:read:own', 'academic:level:read:own',
        'academic:professor:read:faculty', 'academic:professor:read:own', 'academic:program:read:own', 'academic:semester:read:all',
        'scheduling:room:read:all', 'scheduling:timetable-entry:read:all', 'scheduling:timetable-entry:read:own', 'scheduling:timetable:read:promotion'
    ],
    ACADEMIC_SECRETARY: [
        'academic:course-assignment:read:promotion', 'academic:course-unit:read:promotion', 'academic:course:read:promotion',
        'academic:faculty-leadership:read:faculty', 'academic:faculty:read:own', 'academic:level:read:own', 'academic:professor:read:faculty',
        'academic:program:read:own', 'academic:semester:read:all', 'academic:student:read:faculty', 'academic:student:update:faculty',
        'admission:candidate:read:faculty', 'admission:candidate:read:own', 'admission:candidate:update:faculty', 'admission:candidate:update:own',
        'scheduling:room:read:all', 'scheduling:timetable-entry:create:faculty', 'scheduling:timetable-entry:delete:faculty',
        'scheduling:timetable-entry:read:faculty', 'scheduling:timetable-entry:update:faculty', 'scheduling:timetable:create:faculty',
        'scheduling:timetable:delete:faculty', 'scheduling:timetable:read:faculty', 'scheduling:timetable:update:faculty'
    ],
    CANDIDATE: ['admission:candidate:read:own', 'admission:candidate:update:own'],
    ADMIN: ['all', 'faculty', 'course-unit', 'course', 'professor', 'student'].flatMap((resource) =>
        resource === 'all' ? [] : ['create', 'read', 'update', 'delete'].map((action) => `academic:${resource}:${action}:all`)
    ).concat(['admission:candidate:read:all', 'admission:candidate:update:all', 'scheduling:timetable:read:all', 'scheduling:timetable:create:all', 'scheduling:timetable:update:all', 'scheduling:timetable-entry:update:all'])
};

describe('Accès par profil (menus et routes)', () => {
    let authorities: string[] = [];
    let permissions: PermissionService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [{ provide: AuthService, useValue: { getCurrentUser: () => ({ authorities }) } }]
        });
        permissions = TestBed.inject(PermissionService);
    });

    /** Même règle que `AppMenu.filterMenu` et `permissionGuard`. */
    const visible = (item: FeatureMenuItem | PermissionRouteData) =>
        permissions.canAccess({ permissions: item.permissions, mode: item.mode }) &&
        !(item.hiddenWhenPermissions?.length && permissions.canAccess({ permissions: item.hiddenWhenPermissions, mode: item.hiddenWhenMode }));

    const menu = (profile: string): string[] => {
        authorities = PROFILES[profile];
        return [academicFeature, admissionFeature, schedulingFeature]
            .flatMap((feature) => feature.menu ?? [])
            .flatMap((group) => group.items ?? [])
            .filter(visible)
            .map((item) => item['label'] as string);
    };

    const routeOpen = (profile: string, routes: Routes, path: string): boolean => {
        authorities = PROFILES[profile];
        const route = routes.find((item) => item.path === path);
        expect(route).withContext(path).toBeDefined();
        return visible((route?.data ?? {}) as PermissionRouteData);
    };

    it('should give the administrator every management screen', () => {
        expect(menu('ADMIN')).toEqual(jasmine.arrayContaining(['Facultés', 'Unités d’enseignement', 'Cours', 'Professeurs', 'Étudiants', 'Candidatures', 'Horaires']));
        expect(menu('ADMIN')).not.toContain('Mon horaire');
    });

    it('should give the academic secretary the screens of their faculty, and their faculty', () => {
        expect(menu('ACADEMIC_SECRETARY')).toEqual(['Ma faculté', 'Professeurs', 'Étudiants', 'Candidatures', 'Horaires']);
        expect(routeOpen('ACADEMIC_SECRETARY', academicRoutes, 'students/:id')).toBeTrue();
        expect(routeOpen('ACADEMIC_SECRETARY', admissionRoutes, 'candidates/:id')).toBeTrue();
        expect(routeOpen('ACADEMIC_SECRETARY', timetableRoutes, 'timetable/new')).toBeTrue();
        expect(routeOpen('ACADEMIC_SECRETARY', timetableRoutes, 'timetable/:id/edit')).toBeTrue();
        // Lire les professeurs de sa faculté ouvre leur liste (portée faculty), sans les actions.
        expect(routeOpen('ACADEMIC_SECRETARY', academicRoutes, 'professors')).toBeTrue();
        // Une lecture plus étroite (promotion, own) n'ouvre pas la gestion.
        expect(routeOpen('ACADEMIC_SECRETARY', academicRoutes, 'courses')).toBeFalse();
        expect(routeOpen('ACADEMIC_SECRETARY', academicRoutes, 'course-units')).toBeFalse();
        // « Mon dossier » est masqué à qui gère les candidatures, même avec candidate:read:own.
        expect(routeOpen('ACADEMIC_SECRETARY', admissionRoutes, 'my-application')).toBeFalse();
    });

    it('should keep students and professors on their personal screens', () => {
        // Leurs privilèges `academic:professor:read:faculty` ouvrent la liste des professeurs (lecture seule).
        expect(menu('STUDENT')).toEqual(['Ma faculté', 'Professeurs', 'Mon horaire']);
        expect(menu('PROFESSOR')).toEqual(['Ma faculté', 'Mes cours', 'Professeurs', 'Mon horaire']);
        for (const profile of ['STUDENT', 'PROFESSOR']) {
            for (const path of ['students', 'courses', 'course-units']) {
                expect(routeOpen(profile, academicRoutes, path)).withContext(`${profile} ${path}`).toBeFalse();
            }
            expect(routeOpen(profile, timetableRoutes, 'timetable')).withContext(profile).toBeFalse();
        }
        // Le professeur ouvre la fiche de ses cours depuis « Mes cours ».
        expect(routeOpen('PROFESSOR', academicRoutes, 'courses/:id')).toBeTrue();
    });

    it('should not turn editing their own file into managing candidates', () => {
        expect(menu('CANDIDATE')).toEqual(['Mon dossier']);
        expect(routeOpen('CANDIDATE', admissionRoutes, 'candidates')).toBeFalse();
        expect(routeOpen('CANDIDATE', admissionRoutes, 'my-application')).toBeTrue();
    });

    it('should allow writing at a unit scope but never through own', () => {
        authorities = PROFILES['ACADEMIC_SECRETARY'];
        expect(permissions.canWrite('academic:student:update')).toBeTrue();
        expect(permissions.canWrite('admission:candidate:update')).toBeTrue();
        expect(permissions.canWrite('scheduling:timetable:create')).toBeTrue();
        expect(permissions.canWrite('academic:professor:update')).toBeFalse();
        authorities = PROFILES['CANDIDATE'];
        expect(permissions.canWrite('admission:candidate:update')).toBeFalse();
        expect(permissions.canManage('admission:candidate')).toBeFalse();
    });
});
