import { Component, DestroyRef, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { forkJoin } from 'rxjs';
import { ProgramReference } from '@/app/features/academic/academic.public-api';

import {
    CandidateGender,
    CandidateResponse,
    CandidatureType,
    MaritalStatus,
    SubmitCandidatureRequest,
    UpdateCandidatureRequest
} from '../../models/candidate.model';
import { AdmissionAcademicReferenceService, CandidateAcademicLabels, SelectOption } from '../../services/admission-academic-reference.service';

/**
 * Modification d'un dossier candidat, commune à « Mon dossier » (`PUT /candidates/me`) et à
 * la fiche du personnel (`PUT /candidates/{id}`) : le formulaire, sa lecture et son envoi.
 */

const FIELD_LABELS: Record<string, string> = {
    faculty_id: 'Faculté',
    program_id: 'Filière',
    level_id: 'Promotion',
    first_name: 'Prénom',
    last_name: 'Nom',
    middle_name: 'Post-nom',
    gender: 'Genre',
    birth_date: 'Date de naissance',
    birth_place: 'Lieu de naissance',
    marital_status: 'État civil',
    nationality: 'Nationalité',
    phone: 'Téléphone',
    province: 'Province',
    territory: 'Territoire',
    sector: 'Secteur',
    commune: 'Village / Commune',
    tutor_full_name: 'Nom du tuteur',
    tutor_email: 'Email du tuteur',
    tutor_phone: 'Téléphone du tuteur',
    emergency_full_name: 'Contact d’urgence',
    emergency_email: 'Email d’urgence',
    emergency_phone: 'Téléphone d’urgence',
    school_name: 'École',
    option: 'Option',
    percentage: 'Pourcentage',
    graduation_year: 'Année d’obtention',
    study_country: 'Pays d’étude',
    study_city: 'Ville d’étude',
    candidature_type: 'Type de candidature'
};

function optionalEmail(control: AbstractControl) {
    return String(control.value ?? '').trim() ? Validators.email(control) : null;
}

export function createCandidateForm(fb: FormBuilder) {
    return fb.nonNullable.group({
        faculty_id: ['', Validators.required],
        program_id: ['', Validators.required],
        level_id: ['', Validators.required],
        first_name: ['', [Validators.required, Validators.maxLength(100)]],
        last_name: ['', [Validators.required, Validators.maxLength(100)]],
        middle_name: ['', Validators.maxLength(100)],
        gender: ['MALE' as CandidateGender, Validators.required],
        birth_date: ['', Validators.required],
        birth_place: ['', Validators.required],
        marital_status: ['SINGLE' as MaritalStatus, Validators.required],
        nationality: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', Validators.required],
        province: ['', Validators.required],
        territory: ['', Validators.required],
        sector: ['', Validators.required],
        commune: ['', Validators.required],
        tutor_full_name: ['', Validators.required],
        tutor_email: ['', optionalEmail],
        tutor_phone: ['', Validators.required],
        tutor_profession: [''],
        emergency_full_name: ['', Validators.required],
        emergency_email: ['', optionalEmail],
        emergency_phone: ['', Validators.required],
        emergency_relationship: [''],
        school_name: ['', Validators.required],
        option: ['', Validators.required],
        percentage: fb.control<number | null>(null, [Validators.required, Validators.min(0), Validators.max(100)]),
        graduation_year: [1900, [Validators.required, Validators.min(1900)]],
        study_country: ['', Validators.required],
        study_city: ['', Validators.required],
        candidature_type: ['NEW' as CandidatureType, Validators.required]
    });
}

export type CandidateForm = ReturnType<typeof createCandidateForm>;

/** Passe en modification : l'email, identifiant du compte, reste en lecture. */
export function enableCandidateForm(form: CandidateForm): void {
    // Sans émettre : la cascade faculté → filière → promotion viderait les choix enregistrés.
    form.enable({ emitEvent: false });
    form.controls.email.disable({ emitEvent: false });
}

export function patchCandidateForm(form: CandidateForm, c: CandidateResponse): void {
    form.patchValue(
        {
            faculty_id: c.faculty_id,
            program_id: c.program_id,
            level_id: c.level_id,
            first_name: c.first_name,
            last_name: c.last_name,
            middle_name: c.middle_name ?? '',
            gender: c.gender,
            birth_date: c.birth_date,
            birth_place: c.birth_place,
            marital_status: c.marital_status,
            nationality: c.nationality,
            email: c.email,
            phone: c.phone,
            province: c.origin?.province ?? '',
            territory: c.origin?.territory ?? '',
            sector: c.origin?.sector ?? '',
            commune: c.origin?.commune ?? '',
            tutor_full_name: c.tutor?.full_name ?? '',
            tutor_email: c.tutor?.email ?? '',
            tutor_phone: c.tutor?.phone ?? '',
            tutor_profession: c.tutor?.profession ?? '',
            emergency_full_name: c.emergency_contact?.full_name ?? '',
            emergency_email: c.emergency_contact?.email ?? '',
            emergency_phone: c.emergency_contact?.phone ?? '',
            emergency_relationship: c.emergency_contact?.relationship ?? '',
            school_name: c.academic_background?.school_name ?? '',
            option: c.academic_background?.option ?? '',
            percentage: c.academic_background?.percentage ?? null,
            graduation_year: c.academic_background?.graduation_year ?? 1900,
            study_country: c.academic_background?.study_country ?? '',
            study_city: c.academic_background?.study_city ?? '',
            candidature_type: c.candidature.type
        },
        { emitEvent: false }
    );
}

function formatDate(date: unknown): string {
    if (date instanceof Date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    return String(date ?? '');
}

/** Corps de `PUT /candidates/{id}` : celui du dépôt, sans l'email. */
export function candidateUpdatePayload(form: CandidateForm): UpdateCandidatureRequest {
    const raw = form.getRawValue();
    return {
        faculty_id: raw.faculty_id,
        program_id: raw.program_id,
        level_id: raw.level_id,
        first_name: raw.first_name.trim(),
        last_name: raw.last_name.trim(),
        middle_name: raw.middle_name.trim(),
        gender: raw.gender,
        birth_date: formatDate(raw.birth_date),
        birth_place: raw.birth_place.trim(),
        marital_status: raw.marital_status,
        nationality: raw.nationality.trim(),
        phone: raw.phone.trim(),
        origin: {
            province: raw.province.trim(),
            territory: raw.territory.trim(),
            sector: raw.sector.trim(),
            commune: raw.commune.trim()
        },
        tutor: {
            full_name: raw.tutor_full_name.trim(),
            email: (raw.tutor_email ?? '').trim(),
            phone: raw.tutor_phone.trim(),
            profession: (raw.tutor_profession ?? '').trim()
        },
        emergency_contact: {
            full_name: raw.emergency_full_name.trim(),
            email: (raw.emergency_email ?? '').trim(),
            phone: raw.emergency_phone.trim(),
            relationship: (raw.emergency_relationship ?? '').trim()
        },
        academic_background: {
            school_name: raw.school_name.trim(),
            option: raw.option.trim(),
            percentage: Number(raw.percentage),
            graduation_year: Number(raw.graduation_year),
            study_country: raw.study_country.trim(),
            study_city: raw.study_city.trim()
        },
        candidature: { type: raw.candidature_type }
    };
}

/** Corps de `PUT /candidates/me` : celui du dépôt, email compris. */
export function candidateOwnPayload(form: CandidateForm): SubmitCandidatureRequest {
    return { ...candidateUpdatePayload(form), email: String(form.controls.email.getRawValue()).trim() };
}

/** Libellés des champs encore invalides, pour dire exactement quoi compléter. */
export function invalidCandidateFields(form: CandidateForm): string {
    const invalid = Object.entries(form.controls)
        .filter(([, control]) => control.enabled && control.invalid)
        .map(([name]) => FIELD_LABELS[name] ?? name);
    return invalid.length ? `À compléter : ${invalid.join(', ')}.` : 'Vérifiez les champs obligatoires.';
}

/**
 * Choix faculté → filière → promotion du formulaire. Changer la faculté vide la filière et la
 * promotion, changer la filière vide la promotion — seulement en modification.
 */
export class CandidateAcademicChoices {
    readonly faculties = signal<SelectOption[]>([]);
    readonly programs = signal<SelectOption[]>([]);
    readonly levels = signal<SelectOption[]>([]);

    constructor(
        private readonly academicRefs: AdmissionAcademicReferenceService,
        private readonly form: CandidateForm,
        isEditing: () => boolean,
        destroyRef: DestroyRef
    ) {
        form.controls.faculty_id.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((facultyId) => {
            if (isEditing()) this.onFacultyChange(facultyId);
        });
        form.controls.program_id.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((programId) => {
            if (isEditing()) this.onProgramChange(programId);
        });
    }

    /** Options correspondant au dossier enregistré. */
    load(facultyId: string, programId: string): void {
        this.academicRefs.getFacultyOptions().subscribe({ next: (options) => this.faculties.set(options) });
        if (!facultyId) return;
        forkJoin({
            programs: this.academicRefs.getProgramOptionsByFaculty(facultyId),
            programRefs: this.academicRefs.getProgramReferencesByFaculty(facultyId)
        }).subscribe({
            next: ({ programs, programRefs }) => {
                this.programs.set(programs);
                this.levels.set(this.levelOptions(programRefs, programId));
            }
        });
    }

    private onFacultyChange(facultyId: string): void {
        this.programs.set([]);
        this.levels.set([]);
        this.form.patchValue({ program_id: '', level_id: '' }, { emitEvent: false });
        if (!facultyId) return;
        this.academicRefs.getProgramOptionsByFaculty(facultyId).subscribe({ next: (options) => this.programs.set(options) });
    }

    private onProgramChange(programId: string): void {
        this.levels.set([]);
        this.form.patchValue({ level_id: '' }, { emitEvent: false });
        if (!programId) return;
        this.academicRefs.getProgramReferencesByFaculty(this.form.controls.faculty_id.value).subscribe({
            next: (programs) => this.levels.set(this.levelOptions(programs, programId))
        });
    }

    private levelOptions(programs: ProgramReference[], programId: string): SelectOption[] {
        const program = programs.find((p) => p.id === programId);
        return (
            program?.levels?.map((item) => ({
                label: item.level.code ? `${item.level.code} - ${item.level.name}` : item.level.name,
                value: item.level.id
            })) ?? []
        );
    }
}

/** Les rubriques du dossier en saisie. */
@Component({
    selector: 'app-candidate-dossier-form',
    standalone: true,
    imports: [ReactiveFormsModule, DatePicker, InputTextModule, SelectModule],
    templateUrl: './candidate-dossier-form.html',
    styleUrl: './candidate-dossier-form.scss'
})
export class CandidateDossierForm {
    readonly form = input.required<CandidateForm>();
    readonly choices = input.required<CandidateAcademicChoices>();
    readonly labels = input<CandidateAcademicLabels | null>(null);

    readonly genderOptions = [
        { label: 'Masculin', value: 'MALE' as CandidateGender },
        { label: 'Féminin', value: 'FEMALE' as CandidateGender },
        { label: 'Autre', value: 'OTHER' as CandidateGender }
    ];

    readonly maritalStatusOptions = [
        { label: 'Célibataire', value: 'SINGLE' as MaritalStatus },
        { label: 'Marié(e)', value: 'MARRIED' as MaritalStatus },
        { label: 'Divorcé(e)', value: 'DIVORCED' as MaritalStatus },
        { label: 'Veuf / Veuve', value: 'WIDOWED' as MaritalStatus },
        { label: 'Autre', value: 'OTHER' as MaritalStatus }
    ];

    readonly candidatureTypeOptions = [
        { label: 'Nouvelle inscription', value: 'NEW' as CandidatureType },
        { label: 'Inscription spéciale', value: 'SPECIAL' as CandidatureType }
    ];

    isInvalid(controlName: string): boolean {
        const control = this.form().get(controlName);
        return !!control && control.invalid && (control.dirty || control.touched);
    }
}
