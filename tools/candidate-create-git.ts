import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { CandidateDocumentType, CandidateGender, CandidateResponse, CandidatureType, MaritalStatus, SubmitCandidatureRequest } from '../../models/candidate.model';
import { CandidateService } from '../../services/candidate.service';
import { AdmissionAcademicReferenceService } from '../../services/admission-academic-reference.service';
import { AuthFooter } from '@/app/core/auth/auth-footer/auth-footer';
import { appBrand } from '@/app/core/config/app-brand';
import { AcademicReference, LevelReference, ProgramReference } from '@/app/features/academic/academic.public-api';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { Divider } from 'primeng/divider';
import { StepperModule } from 'primeng/stepper';

import {
    type CountryCode,
    getCountries,
    getCountryCallingCode,
    parsePhoneNumberFromString
} from 'libphonenumber-js/max';

type CountryOption = {
    code: CountryCode;
    name: string;
    callingCode: string;
};
type SelectOption<T = string> = {
    label: string;
    value: T;
};

type CandidateDocumentDraft = {
    type: CandidateDocumentType;
    label: string;
    file: File | null;
};

type ProgramLevelOption = SelectOption & {
    isCommon: boolean;
    order: number;
};

type ProgramOption = SelectOption & {
    facultyId: string;
    facultyName?: string;
    code?: string;
    levels: ProgramLevelOption[];
};

@Component({
    selector: 'app-candidate-create',
    standalone: true,
    imports: [
        CommonModule,
        StepperModule,
        ReactiveFormsModule,
        FluidModule,
        InputTextModule,
        SelectModule,
        ButtonModule,
        ToastModule,
        AuthFooter,
        DatePicker,   // <-- Ajout├®
        InputNumber,  // <-- Ajout├®
        Divider       // <-- Ajout├®
    ],
    templateUrl: './candidate-create.html',
    styleUrl: './candidate-create.scss',
    providers: [MessageService]
})
export class CandidateCreate implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly messageService = inject(MessageService);
    private readonly candidateService = inject(CandidateService);
    private readonly academicReferenceService = inject(AdmissionAcademicReferenceService);
    readonly documentUploads = signal<CandidateDocumentDraft[]>(this.initialDocumentUploads());
    readonly submitting = signal(false);
    readonly loadingFaculties = signal(false);
    readonly loadingPrograms = signal(false);
    readonly loadingLevels = signal(false);
    readonly validationErrors = signal<Record<string, string>>({});

    readonly faculties = signal<SelectOption[]>([]);
    readonly programs = signal<ProgramOption[]>([]);
    readonly levels = signal<SelectOption[]>([]);
    readonly allLevels = signal<SelectOption[]>([]);
    readonly programMessage = signal('');
    readonly levelMessage = signal('');
    readonly publicMode = signal(true);
    readonly submittedCandidate = signal<CandidateResponse | null>(null);
    readonly activeStep = signal(1);

    readonly brand = appBrand;

    readonly genderOptions: SelectOption<CandidateGender>[] = [
        { label: 'Masculin', value: 'MALE' },
        { label: 'F├®minin', value: 'FEMALE' },
        { label: 'Autre', value: 'OTHER' }
    ];

    readonly maritalStatusOptions: SelectOption<MaritalStatus>[] = [
        { label: 'C├®libataire', value: 'SINGLE' },
        { label: 'Mari├®(e)', value: 'MARRIED' },
        { label: 'Divorc├®(e)', value: 'DIVORCED' },
        { label: 'Veuf / Veuve', value: 'WIDOWED' },
        { label: 'Autre', value: 'OTHER' }
    ];


    readonly candidatureTypeOptions: SelectOption<CandidatureType>[] = [
        { label: 'Nouvelle inscription', value: 'NEW' },
        { label: 'Inscription sp├®ciale', value: 'SPECIAL' }
    ];

    readonly form = this.fb.nonNullable.group({
        faculty_id: ['', Validators.required],
        program_id: [{ value: '', disabled: true }, Validators.required],
        level_id: [{ value: '', disabled: true }, Validators.required],

        first_name: ['', [Validators.required, Validators.maxLength(100)]],
        last_name: ['', [Validators.required, Validators.maxLength(100)]],
        middle_name: ['', Validators.maxLength(100)],
        gender: ['MALE' as CandidateGender, Validators.required],
        birth_date: ['', Validators.required],
        birth_place: ['', Validators.required],
        marital_status: ['SINGLE' as MaritalStatus, Validators.required],
        nationality: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone_country: ['CD' as CountryCode, Validators.required],
        phone: ['', [
            Validators.required,
            this.phoneValidator('phone_country')
        ]],

        province: ['', Validators.required],
        territory: ['', Validators.required],
        sector: ['', Validators.required],
        commune: ['', Validators.required],

        tutor_full_name: ['', Validators.required],
        tutor_email: [''],
        tutor_phone_country: ['CD' as CountryCode, Validators.required],
        tutor_phone: ['', [
            Validators.required,
            this.phoneValidator('tutor_phone_country')
        ]],
        tutor_profession: [''],

        emergency_full_name: [''],
        emergency_email: [''],
        emergency_phone_country: ['CD' as CountryCode],
        emergency_phone: ['', [
            this.phoneValidator('emergency_phone_country')
        ]],
        emergency_relationship: [''],

        school_name: ['', Validators.required],
        option: ['', Validators.required],
        percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        graduation_year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
        study_country: ['', Validators.required],
        study_city: ['', Validators.required],

        candidature_type: ['NEW' as CandidatureType, Validators.required]
    });



    ngOnInit(): void {
        this.loadFaculties();
        this.loadLevels();

        this.form.controls.faculty_id.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((facultyId) => {
            this.programs.set([]);
            this.levels.set([]);
            this.programMessage.set('');
            this.levelMessage.set('');

            this.form.controls.program_id.setValue('');
            this.form.controls.program_id.disable();

            this.form.controls.level_id.setValue('');
            this.form.controls.level_id.disable();

            if (facultyId) {
                this.loadPrograms(facultyId);
            }
        });

        this.form.controls.program_id.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.applyLevelRules();
        });

        this.form.controls.level_id.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((levelId) => {
                this.updateCandidatureType(levelId);
            });


    }
    isInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return !!control && control.invalid && (control.dirty || control.touched);
    }

    fieldError(field: string): string {
        return this.validationErrors()[field] ?? '';
    }

    submit(): void {
        this.validationErrors.set({});

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.showWarning('Veuillez compl├®ter correctement les champs obligatoires.');
            return;
        }

        this.submitting.set(true);

        this.candidateService.submit(this.buildPayload(), { publicRequest: true }).pipe(
            switchMap((candidate) => this.uploadSelectedDocuments(candidate.id).pipe(map(() => candidate)))
        ).subscribe({
            next: (candidate) => {
                this.submitting.set(false);
                this.submittedCandidate.set(candidate);
            },
            error: (error: HttpErrorResponse) => {
                this.submitting.set(false);

                if (error.status === 400 && error.error?.invalid_fields) {
                    this.validationErrors.set(error.error.invalid_fields);
                    this.showError(error.error?.detail ?? 'La requ├¬te contient des champs non valides.');
                    return;
                }

                if (error.status === 401) {
                    this.showError('Session expir├®e ou non authentifi├®e.');
                    return;
                }

                if (error.status === 403) {
                    this.showError('Tu nÔÇÖas pas les privil├¿ges n├®cessaires pour cr├®er une candidature.');
                    return;
                }

                if (error.status === 404) {
                    this.showError(error.error?.detail ?? 'Une r├®f├®rence acad├®mique est introuvable.');
                    return;
                }

                if (error.status === 409) {
                    this.showError(error.error?.detail ?? 'Une candidature similaire existe d├®j├á.');
                    return;
                }

                this.showError(error.error?.detail ?? 'Une erreur est survenue lors de la cr├®ation de la candidature.');
            }
        });
    }

    private loadFaculties(): void {
        this.loadingFaculties.set(true);

        this.academicReferenceService.getFacultyOptions(this.publicMode()).subscribe({
            next: (options) => {
                this.faculties.set(options);
                this.loadingFaculties.set(false);
            },
            error: () => {
                this.loadingFaculties.set(false);
                this.showError('Impossible de charger les facult├®s.');
            }
        });
    }

    private loadPrograms(facultyId: string): void {
        this.loadingPrograms.set(true);

        this.academicReferenceService.getProgramReferencesByFaculty(facultyId, this.publicMode()).subscribe({
            next: (programs) => {
                const options = programs.map((program) => this.toProgramOption(program));

                this.programs.set(options);
                this.loadingPrograms.set(false);

                if (!options.length) {
                    this.programMessage.set('Aucun programme nÔÇÖest rattach├® ├á cette facult├®.');
                    this.form.controls.program_id.disable();
                    return;
                }

                this.programMessage.set('');
                this.form.controls.program_id.enable();
            },
            error: () => {
                this.loadingPrograms.set(false);
                this.programMessage.set('Impossible de charger les programmes de cette facult├®.');
            }
        });
    }

    private loadLevels(): void {
        this.loadingLevels.set(true);

        this.academicReferenceService.getLevelReferences(this.publicMode()).subscribe({
            next: (levels) => {
                this.allLevels.set(levels.map((level) => this.toOption(level)));
                this.loadingLevels.set(false);
                this.applyLevelRules();
            },
            error: () => {
                this.loadingLevels.set(false);
                this.showError('Impossible de charger les niveaux.');
            }
        });
    }


    canContinueStep(step: number): boolean {
        if (step === 2) {
            return this.isStepValid(2) && !this.loadingPrograms() && !this.programMessage() && !this.levelMessage();
        }

        return this.isStepValid(step);
    }

    private applyLevelRules(): void {
        const program = this.selectedProgram();

        this.levels.set([]);
        this.levelMessage.set('');
        this.form.controls.level_id.setValue('');
        this.form.controls.level_id.disable();

        if (!program) {
            return;
        }

        if (!program.levels.length) {
            this.levelMessage.set('Aucun niveau nÔÇÖest rattach├® ├á ce programme.');
            return;
        }

        this.levels.set(program.levels);
        this.form.controls.level_id.enable();

        if (program.levels.length === 1) {
            this.form.controls.level_id.setValue(program.levels[0].value);
        }
    }

    private updateCandidatureType(levelId: string): void {
        const program = this.selectedProgram();
        const selectedLevel = program?.levels.find((level) => level.value === levelId);

        if (!program || !selectedLevel) {
            return;
        }

        const programHasPreparatoryLevel = program.levels.some((level) =>
            this.isPreparatoryLevel(level)
        );

        let candidatureType: CandidatureType;

        if (this.isPreparatoryLevel(selectedLevel)) {
            candidatureType = 'NEW';
        } else if (this.isL1(selectedLevel) && programHasPreparatoryLevel) {
            candidatureType = 'SPECIAL';
        } else if (this.isL1(selectedLevel) || this.isMaster1(selectedLevel)) {
            candidatureType = 'NEW';
        } else {
            candidatureType = 'SPECIAL';
        }

        this.form.controls.candidature_type.setValue(candidatureType);
    }

    private isPreparatoryLevel(level: SelectOption): boolean {
        const normalized = this.normalize(level.label);

        return normalized.includes('prepa')
            || normalized.includes('preparatoire');
    }

    candidatureTypeLabel(): string {
        if (!this.form.controls.level_id.value) {
            return '';
        }

        const type = this.form.controls.candidature_type.value;

        return this.candidatureTypeOptions.find(
            (option) => option.value === type
        )?.label ?? '';
    }


    private selectedProgram(): ProgramOption | null {
        const programId = this.form.controls.program_id.value;
        return this.programs().find((program) => program.value === programId) ?? null;
    }

    private selectedFaculty(): SelectOption | null {
        const facultyId = this.form.controls.faculty_id.value;
        return this.faculties().find((faculty) => faculty.value === facultyId) ?? null;
    }

    private isStOrArchitectureSelection(): boolean {
        const raw = `${this.selectedFaculty()?.label ?? ''} ${this.selectedProgram()?.label ?? ''}`;
        const normalized = this.normalize(raw);
        const upper = raw.toUpperCase();

        return /\bST\b/.test(upper) || (normalized.includes('science') && normalized.includes('technolog')) || normalized.includes('architecture');
    }

    private isL1(level: SelectOption): boolean {
        const normalized = this.normalize(level.label);
        const upper = level.label.toUpperCase();

        return /\bL1\b/.test(upper) || normalized.includes('licence 1');
    }

    private isL2(level: SelectOption): boolean {
        const normalized = this.normalize(level.label);
        const upper = level.label.toUpperCase();

        return /\bL2\b/.test(upper) || normalized.includes('licence 2');
    }

    private isMaster1(level: SelectOption): boolean {
        const normalized = this.normalize(level.label);
        const upper = level.label.toUpperCase();

        return /\bM1\b/.test(upper) || normalized.includes('master 1');
    }

    private toProgramOption(program: ProgramReference): ProgramOption {
        return {
            label: program.code ? `${program.code} - ${program.name}` : program.name,
            value: program.id,
            code: program.code,
            facultyId: program.faculty_id,
            facultyName: program.faculty_name,
            levels: (program.levels ?? [])
                .map((item) => ({
                    label: item.level.code ? `${item.level.code} - ${item.level.name}` : item.level.name,
                    value: item.level.id,
                    isCommon: item.is_common,
                    order: item.level.level_order ?? 0
                }))
                .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
        };
    }

    private toOption(item: AcademicReference | LevelReference): SelectOption {
        return {
            label: item.code ? `${item.code} - ${item.name}` : item.name,
            value: item.id
        };
    }

    private normalize(value: string): string {
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    private buildPayload(): SubmitCandidatureRequest {
        const raw = this.form.getRawValue();
        return {
            faculty_id: raw.faculty_id,
            program_id: raw.program_id,
            level_id: raw.level_id,
            first_name: raw.first_name.trim(),
            last_name: raw.last_name.trim(),
            middle_name: raw.middle_name.trim(),
            gender: raw.gender,
            birth_date: this.formatDate(raw.birth_date), // <-- Modifi├® pour assurer la compatibilit├® API
            birth_place: raw.birth_place.trim(),
            marital_status: raw.marital_status,
            nationality: raw.nationality.trim(),
            email: raw.email.trim(),
            phone: this.normalizePhone(raw.phone, raw.phone_country),
            origin: {
                province: raw.province.trim(),
                territory: raw.territory.trim(),
                sector: raw.sector.trim(),
                commune: raw.commune.trim()
            },
            tutor: {
                full_name: raw.tutor_full_name.trim(),
                email: raw.tutor_email.trim(),
                phone: this.normalizePhone(
                    raw.tutor_phone,
                    raw.tutor_phone_country
                ),
                profession: raw.tutor_profession.trim()
            },
            emergency_contact: {
                full_name: raw.emergency_full_name.trim(),
                email: raw.emergency_email.trim(),
                phone: this.normalizePhone(
                    raw.emergency_phone,
                    raw.emergency_phone_country
                ),
                relationship: raw.emergency_relationship.trim()
            },
            academic_background: {
                school_name: raw.school_name.trim(),
                option: raw.option.trim(),
                percentage: Number(raw.percentage),
                graduation_year: Number(raw.graduation_year),
                study_country: raw.study_country.trim(),
                study_city: raw.study_city.trim()
            },
            candidature: {
                type: raw.candidature_type
            }
        };
    }

    private showSuccess(detail: string): void {
        this.messageService.add({ severity: 'success', summary: 'Succ├¿s', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }

    private showWarning(detail: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Attention', detail, life: 3000 });
    }
    private readonly stepFields: Record<number, string[]> = {
        1: [
            'first_name', 'last_name', 'gender', 'birth_date', 'birth_place',
            'marital_status', 'nationality', 'email', 'phone',
            'province', 'territory', 'sector', 'commune'
        ],
        2: [
            'faculty_id', 'program_id', 'level_id', 'candidature_type',
            'school_name', 'option', 'percentage', 'graduation_year',
            'study_country', 'study_city'
        ],
        3: ['tutor_full_name', 'tutor_phone', 'tutor_email', 'emergency_email'],
        4: []
    };

    isStepValid(step: number): boolean {
        return (this.stepFields[step] ?? []).every((field) => this.form.get(field)?.valid);
    }

    nextStep(): void {
        if (!this.validateStep(this.activeStep())) {
            return;
        }

        this.activeStep.update((step) => Math.min(step + 1, 4));
    }

    previousStep(): void {
        this.activeStep.update((step) => Math.max(step - 1, 1));
    }

    private validateStep(step: number): boolean {
        const fields = this.stepFields[step] ?? [];

        fields.forEach((field) => this.form.get(field)?.markAsTouched());

        if (!this.isStepValid(step)) {
            this.showWarning('Veuillez compl├®ter correctement cette ├®tape.');
            return false;
        }

        return true;
    }

    startAnotherApplication(): void {
        this.submittedCandidate.set(null);
        this.activeStep.set(1);
        this.form.reset({
            gender: 'MALE',
            marital_status: 'SINGLE',
            percentage: 0,
            graduation_year: new Date().getFullYear(),
            candidature_type: 'NEW',
            phone_country: 'CD',
            tutor_phone_country: 'CD',
            emergency_phone_country: 'CD'
        });
        this.documentUploads.set(this.initialDocumentUploads());

    }

    onDocumentSelected(event: Event, type: CandidateDocumentType): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;

        this.documentUploads.update((documents) =>
            documents.map((document) => (document.type === type ? { ...document, file } : document))
        );

        input.value = '';
    }

    removeDocument(type: CandidateDocumentType): void {
        this.documentUploads.update((documents) =>
            documents.map((document) => (document.type === type ? { ...document, file: null } : document))
        );
    }

    private initialDocumentUploads(): CandidateDocumentDraft[] {
        return [
            { type: 'ID_CARD', label: 'Pi├¿ce dÔÇÖidentit├®', file: null },
            { type: 'DIPLOMA', label: 'Dipl├┤me', file: null },
            { type: 'TRANSCRIPT', label: 'Relev├® de notes', file: null },
            { type: 'PAYMENT_SLIP', label: 'Preuve de paiement', file: null },
            { type: 'PHOTO', label: 'Photo', file: null }
        ];
    }

    private uploadSelectedDocuments(candidateId: string) {
        const documents = this.documentUploads().filter((document) => document.file);

        if (!documents.length) {
            return of([]);
        }

        return forkJoin(
            documents.map((document) => {
                const file = document.file as File;
                const extension = this.fileExtension(file.name);

                return this.candidateService.requestDocumentUploadUrl(candidateId, document.type, extension, { publicRequest: true }).pipe(
                    switchMap((upload) =>
                        this.candidateService.uploadDocument(upload.upload_url, file).pipe(
                            switchMap(() =>
                                this.candidateService.confirmDocumentUpload(
                                    candidateId,
                                    { object_path: upload.object_path, type: document.type },
                                    { publicRequest: true }
                                )
                            )
                        )
                    )
                );
            })
        );
    }

    private fileExtension(fileName: string): string {
        return fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '';
    }

    displayValue(value: unknown): string {
        return value === null || value === undefined || value === '' ? '-' : String(value);
    }

    optionLabel(options: SelectOption[], value: string): string {
        return options.find((option) => option.value === value)?.label ?? this.displayValue(value);
    }

    private formatDate(date: unknown): string {
        if (date instanceof Date) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return typeof date === 'string' ? date : '';
    }

    private readonly countryNames = new Intl.DisplayNames(['fr'], {
        type: 'region'
    });

    readonly countryOptions: CountryOption[] = getCountries()
        .map((code) => ({
            code,
            name: this.countryNames.of(code) ?? code,
            callingCode: `+${getCountryCallingCode(code)}`
        }))
        .sort((first, second) =>
            first.name.localeCompare(second.name, 'fr')
        );
    private phoneValidator(countryControlName: string): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = String(control.value ?? '').trim();

            if (!value) {
                return null;
            }

            const country = control.parent
                ?.get(countryControlName)
                ?.value as CountryCode | undefined;

            if (!country) {
                return { phoneCountryRequired: true };
            }

            const parsed = parsePhoneNumberFromString(value, {
                defaultCountry: country,
                extract: false
            });

            if (!parsed?.isValid()) {
                return { invalidPhone: true };
            }

            if (parsed.country && parsed.country !== country) {
                return { phoneCountryMismatch: true };
            }

            return null;
        };
    }

    private normalizePhone(value: string, country: CountryCode): string {
        const normalized = value.trim();

        if (!normalized) {
            return '';
        }

        const parsed = parsePhoneNumberFromString(normalized, {
            defaultCountry: country,
            extract: false
        });

        return parsed?.isValid() ? parsed.number : normalized;
    }

    private bindPhoneCountry(
        countryControlName: string,
        phoneControlName: string
    ): void {
        this.form.get(countryControlName)?.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.form.get(phoneControlName)?.updateValueAndValidity({
                    emitEvent: false
                });
            });
    }

}
