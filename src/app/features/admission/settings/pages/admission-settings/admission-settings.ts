import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { AdmissionSettings as AdmissionSettingsModel } from '../../models/admission-settings.model';
import { AdmissionSettingsStore } from '../../services/admission-settings.store';

@Component({
    selector: 'app-admission-settings',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, CheckboxModule, ToastModule, ContentSubtopbar],
    providers: [MessageService],
    templateUrl: './admission-settings.html',
    styleUrl: './admission-settings.scss'
})
export class AdmissionSettingsPage implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly location = inject(Location);
    private readonly messageService = inject(MessageService);
    private readonly admissionSettingsStore = inject(AdmissionSettingsStore);

    readonly saving = signal(false);
    readonly editing = signal(false);

    private snapshot: AdmissionSettingsModel | null = null;

    readonly form = this.fb.nonNullable.group({
        publicApplyEnabled: [true]
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
        this.admissionSettingsStore.load();
        this.patchForm(this.admissionSettingsStore.settings());
        this.form.disable();
    }

    toggleEdit(): void {
        if (this.editing()) {
            this.cancelEdit();
            return;
        }

        this.snapshot = this.admissionSettingsStore.settings();
        this.editing.set(true);
        this.form.enable();
    }

    cancelEdit(): void {
        const settings = this.snapshot ?? this.admissionSettingsStore.settings();
        this.patchForm(settings);
        this.editing.set(false);
        this.form.disable();
        this.snapshot = null;
    }

    save(): void {
        if (!this.editing()) {
            return;
        }

        this.saving.set(true);
        this.admissionSettingsStore.save({
            publicApplyEnabled: this.form.getRawValue().publicApplyEnabled
        });

        this.editing.set(false);
        this.form.disable();
        this.snapshot = null;

        this.messageService.add({
            severity: 'success',
            summary: 'Paramètres enregistrés',
            detail: 'Activation du portail mise à jour.'
        });

        this.saving.set(false);
    }

    goBack(): void {
        if (this.editing()) {
            this.cancelEdit();
        }

        this.location.back();
    }

    private patchForm(settings: AdmissionSettingsModel): void {
        this.form.patchValue({
            publicApplyEnabled: settings.publicApplyEnabled
        });
    }
}
