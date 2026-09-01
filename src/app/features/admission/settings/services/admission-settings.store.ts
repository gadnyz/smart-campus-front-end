import { Injectable, computed, signal } from '@angular/core';
import { readJsonStorage, writeJsonStorage } from '@/app/core/settings/services/settings-storage.util';
import { AdmissionSettings, DEFAULT_ADMISSION_SETTINGS } from '../models/admission-settings.model';

const STORAGE_KEY = 'smartcampus.settings.admission';

@Injectable({ providedIn: 'root' })
export class AdmissionSettingsStore {
    private readonly state = signal<AdmissionSettings>(readJsonStorage(STORAGE_KEY, DEFAULT_ADMISSION_SETTINGS));

    readonly settings = this.state.asReadonly();

    readonly isEnrollmentOpen = computed(() => {
        const { publicApplyEnabled, enrollmentOpensAt, enrollmentClosesAt } = this.state();

        if (!publicApplyEnabled) {
            return false;
        }

        const now = Date.now();

        if (enrollmentOpensAt && now < new Date(enrollmentOpensAt).getTime()) {
            return false;
        }

        if (enrollmentClosesAt && now > new Date(enrollmentClosesAt).getTime()) {
            return false;
        }

        return true;
    });

    readonly enrollmentStatusLabel = computed(() => {
        if (!this.state().publicApplyEnabled) {
            return 'Portail désactivé';
        }

        if (!this.isEnrollmentOpen()) {
            const now = Date.now();
            const opens = this.state().enrollmentOpensAt;

            if (opens && now < new Date(opens).getTime()) {
                return 'Ouverture à venir';
            }

            return 'Période fermée';
        }

        return 'Ouvert';
    });

    load(): AdmissionSettings {
        const next = readJsonStorage(STORAGE_KEY, DEFAULT_ADMISSION_SETTINGS);
        this.state.set(next);
        return next;
    }

    save(partial: Partial<AdmissionSettings>): AdmissionSettings {
        const next = { ...this.state(), ...partial };
        this.state.set(next);
        writeJsonStorage(STORAGE_KEY, next);
        return next;
    }

    reset(): AdmissionSettings {
        this.state.set({ ...DEFAULT_ADMISSION_SETTINGS });
        writeJsonStorage(STORAGE_KEY, DEFAULT_ADMISSION_SETTINGS);
        return DEFAULT_ADMISSION_SETTINGS;
    }
}
