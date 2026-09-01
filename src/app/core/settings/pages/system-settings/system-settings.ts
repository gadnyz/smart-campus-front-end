import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { AcademicCatalogService } from '@/app/features/academic/services/academic-catalog.service';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { CoreSettings } from '../../models/core-settings.model';
import { CoreSettingsStore } from '../../services/core-settings.store';

type YearOption = { label: string; value: string | null };

@Component({
    selector: 'app-system-settings',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        InputTextModule,
        SelectModule,
        ButtonModule,
        ToastModule,
        ContentSubtopbar
    ],
    providers: [MessageService],
    templateUrl: './system-settings.html',
    styleUrl: '../../styles/settings-panel.scss'
})
export class SystemSettingsPage implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly location = inject(Location);
    private readonly messageService = inject(MessageService);
    private readonly coreSettingsStore = inject(CoreSettingsStore);
    private readonly academicCatalog = inject(AcademicCatalogService);

    readonly saving = signal(false);
    readonly editing = signal(false);
    readonly academicYearOptions = signal<YearOption[]>([]);

    private snapshot: CoreSettings | null = null;

    readonly form = this.fb.nonNullable.group({
        systemEmail: ['', [Validators.required, Validators.email]],
        supportEmail: ['', [Validators.required, Validators.email]],
        currentAcademicYearId: [null as string | null]
    });

    readonly actions = computed<SubtopbarAction[]>(() => {
        const base: SubtopbarAction[] = [
            {
                label: this.editing() ? 'Annuler' : 'Modifier',
                icon: this.editing() ? 'pi pi-times' : 'pi pi-pencil',
                severity: this.editing() ? 'secondary' : 'info',
                outlined: this.editing(),
                command: () => this.toggleEdit()
            }
        ];

        if (this.editing()) {
            base.push({
                label: 'Enregistrer',
                icon: 'pi pi-save',
                severity: 'info',
                loading: this.saving(),
                disabled: this.saving(),
                command: () => this.save()
            });
        }

        return base;
    });

    ngOnInit(): void {
        this.coreSettingsStore.load();
        this.patchForm(this.coreSettingsStore.settings());
        this.form.disable();

        this.academicCatalog
            .getAcademicYears()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (years) => {
                    this.academicYearOptions.set([
                        { label: 'Non définie', value: null },
                        ...years.map((year) => ({ label: year.label, value: year.id }))
                    ]);
                },
                error: () => {
                    this.academicYearOptions.set([{ label: 'Non définie', value: null }]);
                }
            });
    }

    toggleEdit(): void {
        if (this.editing()) {
            this.cancelEdit();
            return;
        }

        this.snapshot = this.coreSettingsStore.settings();
        this.editing.set(true);
        this.form.enable();
    }

    cancelEdit(): void {
        const settings = this.snapshot ?? this.coreSettingsStore.settings();
        this.patchForm(settings);
        this.editing.set(false);
        this.form.disable();
        this.snapshot = null;
    }

    save(): void {
        if (!this.editing()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.coreSettingsStore.save(this.form.getRawValue());
        this.editing.set(false);
        this.form.disable();
        this.snapshot = null;

        this.messageService.add({
            severity: 'success',
            summary: 'Paramètres enregistrés',
            detail: 'Emails et année académique mis à jour.'
        });

        this.saving.set(false);
    }

    goBack(): void {
        if (this.editing()) {
            this.cancelEdit();
        }

        this.location.back();
    }

    private patchForm(settings: CoreSettings): void {
        this.form.patchValue(settings);
    }
}
