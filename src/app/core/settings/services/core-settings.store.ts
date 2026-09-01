import { Injectable, computed, signal } from '@angular/core';
import { appBrand } from '@/app/core/config/app-brand';
import { CoreSettings, DEFAULT_CORE_SETTINGS } from '../models/core-settings.model';
import { readJsonStorage, writeJsonStorage } from './settings-storage.util';

const STORAGE_KEY = 'smartcampus.settings.core';

export type AppBrandView = {
    appName: string;
    university: string;
    university_website: string;
    footerTagline: string;
    logos: {
        main: string;
        large: string;
        compact: string;
        light: string;
        dark: string;
    };
};

/** Runtime branding comes from appBrand; editable CORE settings are emails + academic year. */
@Injectable({ providedIn: 'root' })
export class CoreSettingsStore {
    private readonly state = signal<CoreSettings>(this.readNormalized());

    readonly settings = this.state.asReadonly();

    readonly brand = computed<AppBrandView>(() => ({
        appName: appBrand.appName,
        university: appBrand.university,
        university_website: appBrand.university_website,
        footerTagline: appBrand.footerTagline,
        logos: { ...appBrand.logos }
    }));

    load(): CoreSettings {
        const next = this.readNormalized();
        this.state.set(next);
        return next;
    }

    save(partial: Partial<CoreSettings>): CoreSettings {
        const next = this.normalize({ ...this.state(), ...partial });
        this.state.set(next);
        writeJsonStorage(STORAGE_KEY, next);
        return next;
    }

    reset(): CoreSettings {
        const defaults = { ...DEFAULT_CORE_SETTINGS };
        this.state.set(defaults);
        writeJsonStorage(STORAGE_KEY, defaults);
        return defaults;
    }

    private readNormalized(): CoreSettings {
        return this.normalize(readJsonStorage(STORAGE_KEY, DEFAULT_CORE_SETTINGS));
    }

    private normalize(value: Partial<CoreSettings> | null | undefined): CoreSettings {
        return {
            systemEmail: value?.systemEmail?.trim() || DEFAULT_CORE_SETTINGS.systemEmail,
            supportEmail: value?.supportEmail?.trim() || DEFAULT_CORE_SETTINGS.supportEmail,
            currentAcademicYearId: value?.currentAcademicYearId ?? null
        };
    }
}
