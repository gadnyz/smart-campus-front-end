import { CommonModule, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { CandidateGender, CandidatureType, MaritalStatus, SubmitCandidatureRequest } from '../../models/candidate.model';
import { CandidateService } from '../../services/candidate.service';
import { AdmissionCatalogItem, AdmissionCatalogService } from '../../services/admission-catalog.service';

type SelectOption<T = string> = {
    label: string;
    value: T;
};

@Component({
    selector: 'app-candidate-create',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FluidModule, InputTextModule, SelectModule, ButtonModule, ToastModule, ContentSubtopbar],
    templateUrl: './candidate-create.html',
    styleUrl: './candidate-create.scss',
    providers: [MessageService]
})
export class CandidateCreate implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly location = inject(Location);
    private readonly router = inject(Router);
    private readonly fb = inject(FormBuilder);
    private readonly messageService = inject(MessageService);
    private readonly candidateService = inject(CandidateService);
    private readonly catalogService = inject(AdmissionCatalogService);

    readonly submitting = signal(false);
    readonly loadingFaculties = signal(false);
    readonly loadingPrograms = signal(false);
    readonly loadingLevels = signal(false);
    readonly validationErrors = signal<Record<string, string>>({});

    readonly faculties = signal<SelectOption[]>([]);
    readonly programs = signal<SelectOption[]>([]);
    readonly levels = signal<SelectOption[]>([]);

    readonly genderOptions: SelectOption<CandidateGender>[] = [
        { label: 'Masculin', value: 'MALE' },
        { label: 'Féminin', value: 'FEMALE' },
        { label: 'Autre', value: 'OTHER' }
    ];

    readonly maritalStatusOptions: SelectOption<MaritalStatus>[] = [
        { label: 'Célibataire', value: 'SINGLE' },
        { label: 'Marié(e)', value: 'MARRIED' },
        { label: 'Divorcé(e)', value: 'DIVORCED' },
        { label: 'Veuf / Veuve', value: 'WIDOWED' },
        { label: 'Autre', value: 'OTHER' }
    ];

    readonly candidatureTypeOptions: SelectOption<CandidatureType>[] = [
        { label: 'Nouvelle admission', value: 'NEW' },
        { label: 'Admission spéciale', value: 'SPECIAL' }
    ];

    readonly form = this.fb.nonNullable.group({
        faculty_id: ['', Validators.required],
        program_id: [{ value: '', disabled: true }, Validators.required],
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
        tutor_email: ['', Validators.email],
        tutor_phone: ['', Validators.required],
        tutor_profession: ['', Validators.required],

        emergency_full_name: ['', Validators.required],
        emergency_email: ['', Validators.email],
        emergency_phone: ['', Validators.required],
        emergency_relationship: ['', Validators.required],

        school_name: ['', Validators.required],
        option: ['', Validators.required],
        percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
        graduation_year: [new Date().getFullYear(), [Validators.required, Validators.min(1900)]],
        study_country: ['', Validators.required],
        study_city: ['', Validators.required],

        candidature_type: ['NEW' as CandidatureType, Validators.required]
    });

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => this.goBack()
        },
        {
            label: 'Créer',
            icon: 'pi pi-save',
            severity: 'info',
            loading: this.submitting(),
            disabled: this.submitting() || this.loadingFaculties() || this.loadingPrograms() || this.loadingLevels(),
            command: () => this.submit()
        }
    ]);

    ngOnInit(): void {
        this.loadFaculties();
        this.loadLevels();

        this.form.controls.faculty_id.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((facultyId) => {
            this.programs.set([]);
            this.form.controls.program_id.setValue('');
            this.form.controls.program_id.disable();

            if (facultyId) {
                this.loadPrograms(facultyId);
            }
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
            this.showWarning('Veuillez compléter correctement les champs obligatoires.');
            return;
        }

        this.submitting.set(true);

        this.candidateService.submit(this.buildPayload()).subscribe({
            next: (candidate) => {
                this.submitting.set(false);
                this.showSuccess('Candidature créée avec succès.');
                void this.router.navigate(['/admission/candidates', candidate.id]);
            },
            error: (error: HttpErrorResponse) => {
                this.submitting.set(false);

                if (error.status === 400 && error.error?.invalid_fields) {
                    this.validationErrors.set(error.error.invalid_fields);
                    this.showError(error.error?.detail ?? 'La requête contient des champs non valides.');
                    return;
                }

                if (error.status === 401) {
                    this.showError('Session expirée ou non authentifiée.');
                    return;
                }

                if (error.status === 403) {
                    this.showError('Tu n’as pas les privilèges nécessaires pour créer une candidature.');
                    return;
                }

                if (error.status === 404) {
                    this.showError(error.error?.detail ?? 'Une référence académique est introuvable.');
                    return;
                }

                if (error.status === 409) {
                    this.showError(error.error?.detail ?? 'Une candidature similaire existe déjà.');
                    return;
                }

                this.showError(error.error?.detail ?? 'Une erreur est survenue lors de la création de la candidature.');
            }
        });
    }

    goBack(): void {
        if (window.history.length > 1) {
            this.location.back();
            return;
        }

        void this.router.navigate(['/admission']);
    }

    private loadFaculties(): void {
        this.loadingFaculties.set(true);

        this.catalogService.getFaculties().subscribe({
            next: (response) => {
                this.faculties.set(this.toOptions(response.content));
                this.loadingFaculties.set(false);
            },
            error: () => {
                this.loadingFaculties.set(false);
                this.showError('Impossible de charger les facultés.');
            }
        });
    }

    private loadPrograms(facultyId: string): void {
        this.loadingPrograms.set(true);

        this.catalogService.getProgramsByFaculty(facultyId).subscribe({
            next: (response) => {
                this.programs.set(this.toOptions(response.content));
                this.form.controls.program_id.enable();
                this.loadingPrograms.set(false);
            },
            error: () => {
                this.loadingPrograms.set(false);
                this.showError('Impossible de charger les programmes.');
            }
        });
    }

    private loadLevels(): void {
        this.loadingLevels.set(true);

        this.catalogService.getLevels().subscribe({
            next: (response) => {
                this.levels.set(this.toOptions(response.content));
                this.loadingLevels.set(false);
            },
            error: () => {
                this.loadingLevels.set(false);
                this.showError('Impossible de charger les niveaux.');
            }
        });
    }

    private toOptions(items: AdmissionCatalogItem[]): SelectOption[] {
        return items.map((item) => ({
            label: item.code ? `${item.code} - ${item.name}` : item.name,
            value: item.id
        }));
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
            birth_date: raw.birth_date,
            birth_place: raw.birth_place.trim(),
            marital_status: raw.marital_status,
            nationality: raw.nationality.trim(),
            email: raw.email.trim(),
            phone: raw.phone.trim(),
            origin: {
                province: raw.province.trim(),
                territory: raw.territory.trim(),
                sector: raw.sector.trim(),
                commune: raw.commune.trim()
            },
            tutor: {
                full_name: raw.tutor_full_name.trim(),
                email: raw.tutor_email.trim(),
                phone: raw.tutor_phone.trim(),
                profession: raw.tutor_profession.trim()
            },
            emergency_contact: {
                full_name: raw.emergency_full_name.trim(),
                email: raw.emergency_email.trim(),
                phone: raw.emergency_phone.trim(),
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
        this.messageService.add({ severity: 'success', summary: 'Succès', detail, life: 3000 });
    }

    private showError(detail: string): void {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail, life: 3000 });
    }

    private showWarning(detail: string): void {
        this.messageService.add({ severity: 'warn', summary: 'Attention', detail, life: 3000 });
    }
}