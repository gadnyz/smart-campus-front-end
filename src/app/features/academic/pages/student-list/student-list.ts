import { CommonModule } from '@angular/common';
import { apiErrorMessage } from '@/app/shared/http/api-error';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { Table, TableModule } from 'primeng/table';
import { resetPageOnChange } from '@/app/shared/data-table/reset-page';
import { ToastModule } from 'primeng/toast';
import { map } from 'rxjs';
import { DetailNavigationService } from '@/app/shared/navigation/detail-navigation.service';
import { ContentSubtopbar } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { ColumnDef, cellText, defaultVisibleKeys, shownColumns } from '@/app/shared/data-table/column.model';
import { DataFilter } from '@/app/shared/data-table/data-filter/data-filter';
import { TableToolbar } from '@/app/shared/data-table/table-toolbar/table-toolbar';
import { EMPTY_QUERY, TableQuery, applyQuery } from '@/app/shared/data-table/table-query';
import { ProgramReference } from '../../models/academic-reference.model';
import { STUDENT_GENDER_OPTIONS, Student, StudentQuery, formatStudentGender, studentDisplayName } from '../../models/student.model';
import { AcademicCatalogService } from '../../services/academic-catalog.service';
import { FacultyService } from '../../services/faculty.service';
import { StudentService } from '../../services/student.service';
import { FacultyScopeService } from '@/app/core/auth/services/faculty-scope.service';
import { levelLabel, promotionLabel } from '../../utils/promotion-label';

type Option = { label: string; value: string };

/** Étudiants chargés en une fois pour la faculté, le programme ou la promotion choisis. */
export const STUDENT_LOAD_LIMIT = 1000;

/** La promotion d'un étudiant : « L1 Génie Logiciel ». */
export function studentPromotion(student: Student): string {
    return promotionLabel({ code: student.level_code, name: student.level_name }, student.program_name || student.program_code);
}

/** Les colonnes de la liste, déclarées une fois : affichage, recherche, filtres, tri et export. */
export const STUDENT_COLUMNS: ColumnDef<Student>[] = [
    { key: 'name', label: 'Étudiant', type: 'text', value: (row) => studentDisplayName(row), searchable: true, hideable: false, exportWidth: 2 },
    { key: 'matricule', label: 'Matricule', type: 'text', value: (row) => row.matricule, searchable: true },
    // Promotion et faculté : déjà des listes de l'API au-dessus du tableau, pas reprises en filtre.
    { key: 'promotion', label: 'Promotion', type: 'text', value: (row) => studentPromotion(row), searchable: true, apiKey: 'program_level_id', exportWidth: 2 },
    { key: 'faculty', label: 'Faculté', type: 'text', value: (row) => row.faculty_name, apiKey: 'faculty_id', exportWidth: 2 },
    { key: 'email', label: 'E-mail', type: 'text', value: (row) => row.email, exportWidth: 2 },
    {
        key: 'gender',
        label: 'Genre',
        type: 'enum',
        value: (row) => row.gender,
        options: STUDENT_GENDER_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
        visible: false
    },
    { key: 'nationality', label: 'Nationalité', type: 'text', value: (row) => row.nationality, visible: false },
    { key: 'phone', label: 'Téléphone', type: 'text', value: (row) => row.phone, visible: false }
];

/**
 * Liste des étudiants, pilote du composant de recherche (fonctionnement mixte) :
 *
 * - la faculté, le programme et la promotion sont des filtres de l'API (`GET /students`) ;
 * - la recherche (nom, matricule, promotion), les filtres avancés, le tri et la pagination se
 *   font dans le navigateur, sur les étudiants chargés pour ce périmètre.
 *
 * Imprimer et exporter reprennent exactement les lignes filtrées et triées.
 */
@Component({
    selector: 'app-student-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ButtonModule, CardModule, SelectModule, TableModule, ToastModule, ContentSubtopbar, DataFilter, TableToolbar],
    templateUrl: './student-list.html',
    styleUrl: './student-list.scss',
    providers: [MessageService]
})
export class StudentListPage implements OnInit {
    private readonly studentService = inject(StudentService);
    private readonly catalog = inject(AcademicCatalogService);
    private readonly facultyService = inject(FacultyService);
    private readonly messageService = inject(MessageService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly detailNavigation = inject(DetailNavigationService);
    private readonly facultyScope = inject(FacultyScopeService);
    private readonly navigationScope = 'academic.students';

    readonly columns = STUDENT_COLUMNS;
    /** Colonnes affichées, choisies avec la barre d'outils ; aussi celles imprimées. */
    readonly visibleKeys = signal<string[]>(defaultVisibleKeys(STUDENT_COLUMNS));
    readonly shownList = computed(() => shownColumns(this.columns, this.visibleKeys()));
    readonly cellText = cellText;
    readonly loading = signal(false);
    readonly loadingCatalog = signal(false);
    readonly students = signal<Student[]>([]);
    /** Total annoncé par l'API pour le périmètre : au-delà de la limite, tous ne sont pas chargés. */
    readonly totalElements = signal(0);
    readonly query = signal<TableQuery>(EMPTY_QUERY);
    /** Les lignes affichées, imprimées et exportées. */
    readonly visibleStudents = computed(() => applyQuery(this.students(), this.columns, this.query()));
    readonly truncated = computed(() => this.totalElements() > this.students().length);

    readonly facultyFilter = signal<string | null>(null);
    readonly programFilter = signal<string | null>(null);
    readonly programLevelFilter = signal<string | null>(null);

    readonly faculties = signal<Option[]>([]);
    private readonly programRefs = signal<ProgramReference[]>([]);
    readonly programs = computed<Option[]>(() => this.programRefs().map((program) => ({ label: program.name, value: program.id })));
    /** Promotions du programme choisi : le filtre de l'API porte sur la promotion, pas sur le niveau seul. */
    readonly programLevels = computed<Option[]>(() => {
        const program = this.programRefs().find((item) => item.id === this.programFilter());
        return (program?.levels ?? []).filter((item) => !!item.id).map((item) => ({ label: levelLabel(item.level), value: item.id as string }));
    });
    readonly facultyLocked = computed(() => this.facultyScope.isScopedFor('academic:student:read'));
    readonly subtitle = computed(() => {
        const faculty = this.faculties().find((item) => item.value === this.facultyFilter())?.label;
        const program = this.programs().find((item) => item.value === this.programFilter())?.label;
        const level = this.programLevels().find((item) => item.value === this.programLevelFilter())?.label;
        return [faculty, level && program ? `${level} ${program}` : program].filter(Boolean).join(' · ') || undefined;
    });

    private readonly table = viewChild(Table);

    constructor() {
        resetPageOnChange(this.query, this.table);
        // Fiche précédente / suivante : dans l'ordre affiché, filtres compris.
        effect(() => this.registerNavigation(this.visibleStudents()));
    }

    ngOnInit(): void {
        this.applyQueryFilters();
        const locked = this.facultyScope.scopedIdFor('academic:student:read');
        if (locked) {
            this.facultyFilter.set(locked);
        } else if (!this.facultyFilter() && this.facultyScope.workingFacultyId()) {
            // Portée all : on reprend la dernière faculté choisie.
            this.facultyFilter.set(this.facultyScope.workingFacultyId());
        }
        this.loadCatalog();
        this.loadStudents();
    }

    onFacultyChange(facultyId: string | null): void {
        this.facultyScope.rememberFaculty(facultyId);
        this.facultyFilter.set(facultyId);
        this.programFilter.set(null);
        this.programLevelFilter.set(null);
        this.loadPrograms(facultyId);
        this.reload();
    }

    onProgramChange(programId: string | null): void {
        this.programFilter.set(programId);
        this.programLevelFilter.set(null);
        this.reload();
    }

    onProgramLevelChange(programLevelId: string | null): void {
        this.programLevelFilter.set(programLevelId);
        this.reload();
    }

    reload(): void {
        this.syncQueryParams();
        this.loadStudents();
    }

    openDetail(student: Student): void {
        void this.router.navigate(['/academic/students', student.id]);
    }

    displayName(student: Student): string {
        return studentDisplayName(student);
    }

    genderLabel(student: Student): string {
        return formatStudentGender(student.gender);
    }

    promotion(student: Student): string {
        return studentPromotion(student);
    }

    /** La colonne est-elle affichée ? */
    shown(key: string): boolean {
        return this.visibleKeys().includes(key);
    }

    private scopeQuery(): StudentQuery {
        return {
            page: 0,
            size: STUDENT_LOAD_LIMIT,
            facultyId: this.facultyScope.scopedIdFor('academic:student:read') ?? this.facultyFilter(),
            programId: this.programFilter(),
            programLevelId: this.programLevelFilter(),
            search: null
        };
    }

    private loadStudents(): void {
        this.loading.set(true);
        this.studentService.getAll(this.scopeQuery()).subscribe({
            next: (response) => {
                this.students.set(response.content);
                this.totalElements.set(response.total_elements);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.students.set([]);
                this.totalElements.set(0);
                this.loading.set(false);
                this.showError(error instanceof HttpErrorResponse ? apiErrorMessage(error, 'Impossible de charger les étudiants.') : 'Impossible de charger les étudiants.');
            }
        });
    }

    private loadCatalog(): void {
        const locked = this.facultyScope.scopedIdFor('academic:student:read');
        this.loadingCatalog.set(true);
        const faculties$ = locked ? this.facultyService.getById(locked).pipe(map((faculty) => [faculty])) : this.catalog.getFaculties();
        faculties$.subscribe({
            next: (faculties) => {
                this.faculties.set(faculties.map((faculty) => ({ label: faculty.name, value: faculty.id })));
                this.loadingCatalog.set(false);
            },
            error: () => {
                this.faculties.set([]);
                this.loadingCatalog.set(false);
            }
        });
        this.loadPrograms(this.facultyFilter());
    }

    private loadPrograms(facultyId: string | null): void {
        const request$ = facultyId ? this.catalog.getProgramsByFaculty(facultyId) : this.catalog.getPrograms();
        request$.subscribe({
            next: (programs) => this.programRefs.set(programs),
            error: () => this.programRefs.set([])
        });
    }

    private applyQueryFilters(): void {
        const params = this.route.snapshot.queryParamMap;
        this.facultyFilter.set(params.get('facultyId') || null);
        this.programFilter.set(params.get('programId') || null);
        this.programLevelFilter.set(params.get('programLevelId') || null);
        const search = params.get('search') ?? '';
        if (search) {
            this.query.set({ ...EMPTY_QUERY, search });
        }
    }

    private syncQueryParams(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { facultyId: this.facultyFilter(), programId: this.programFilter(), programLevelId: this.programLevelFilter() },
            queryParamsHandling: 'merge'
        });
    }

    private registerNavigation(students: readonly Student[]): void {
        this.detailNavigation.setContext({
            scope: this.navigationScope,
            listRoute: ['/academic/students'],
            page: 0,
            size: Math.max(students.length, 1),
            totalElements: students.length,
            totalPages: 1,
            items: students.map((student) => ({ id: student.id, label: studentDisplayName(student) })),
            filters: { facultyId: this.facultyFilter(), programId: this.programFilter(), programLevelId: this.programLevelFilter() }
        });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 5000 });
    }
}
