import { CommonModule, Location } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';
import { $t } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import Lara from '@primeuix/themes/lara';
import Nora from '@primeuix/themes/nora';
import { ContentSubtopbar, SubtopbarAction } from '@/app/shared/ui/content-subtopbar/content-subtopbar';
import { LayoutConfig, LayoutService } from '@/app/layout/service/layout.service';

const presets = {
    Aura,
    Lara,
    Nora
} as const;

const unhPrimary = {
    50: '#f4f9fb',
    100: '#c2dce3',
    200: '#acd0da',
    300: '#84b5c5',
    400: '#6aacc1',
    500: '#3b8aa7',
    600: '#337993',
    700: '#2b677d',
    800: '#225668',
    900: '#1a4452',
    950: '#102a33'
};

type ThemeMode = 'light' | 'dark';
type PresetName = keyof typeof presets;

@Component({
    selector: 'app-preferences',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ToastModule,
        SelectButtonModule,
        ContentSubtopbar
    ],
    template: `
        <p-toast />

        <app-content-subtopbar
            kicker="Compte utilisateur"
            title="Préférences"
            [actions]="actions()"
        />

        <div class="flex flex-col gap-6">
            <div class="card p-0 overflow-hidden">
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-6">
                        <i class="pi pi-palette text-primary"></i>
                        <div>
                            <div class="font-semibold text-lg">Affichage et Thème</div>
                            <div class="text-sm text-color-secondary">
                                Personnalisez l’apparence de l’interface.
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col gap-5">
                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-3 border-b border-surface">
                            <div>
                                <div class="font-medium">Thème de l’interface</div>
                                <div class="text-sm text-color-secondary">
                                    Sélectionnez votre mode d’affichage préféré.
                                </div>
                            </div>

                            <p-selectbutton
                                [options]="themeOptions"
                                optionLabel="label"
                                optionValue="value"
                                [ngModel]="selectedTheme()"
                                (ngModelChange)="onThemeChange($event)"
                                [allowEmpty]="false"
                            />
                        </div>

                        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-3">
                            <div>
                                <div class="font-medium">Preset de l’interface</div>
                                <div class="text-sm text-color-secondary">
                                    Sélectionnez le style visuel de l’application.
                                </div>
                            </div>

                            <p-selectbutton
                                [options]="presetOptions"
                                [ngModel]="selectedPreset()"
                                (ngModelChange)="onPresetChange($event)"
                                [allowEmpty]="false"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    providers: [MessageService]
})
export class Preferences implements OnInit, OnDestroy {
    private readonly layoutService = inject(LayoutService);
    private readonly location = inject(Location);
    private readonly messageService = inject(MessageService);

    private savedConfig!: LayoutConfig;

    readonly selectedTheme = signal<ThemeMode>('light');
    readonly selectedPreset = signal<PresetName>('Aura');

    readonly themeOptions = [
        { label: 'Clair', value: 'light' },
        { label: 'Sombre', value: 'dark' }
    ];

    readonly presetOptions: PresetName[] = ['Aura', 'Lara', 'Nora'];

    readonly actions = computed<SubtopbarAction[]>(() => [
        {
            label: 'Retour',
            icon: 'pi pi-arrow-left',
            severity: 'secondary',
            outlined: true,
            command: () => this.goBack()
        },
        {
            label: 'Réinitialiser',
            icon: 'pi pi-refresh',
            severity: 'secondary',
            outlined: true,
            command: () => this.resetPreferences()
        },
        {
            label: 'Enregistrer les modifications',
            icon: 'pi pi-save',
            severity: 'info',
            outlined: false,
            command: () => this.savePreferences()
        }
    ]);

    ngOnInit(): void {
        this.savedConfig = { ...this.layoutService.layoutConfig() };
        this.syncSelectedValues(this.savedConfig);
    }

    ngOnDestroy(): void {
        if (!this.isCurrentConfigSaved()) {
            this.applyConfig(this.savedConfig);
        }
    }

    onThemeChange(theme: ThemeMode): void {
        this.selectedTheme.set(theme);
        this.layoutService.setThemeMode(theme);
    }

    onPresetChange(preset: PresetName): void {
        this.selectedPreset.set(preset);
        this.layoutService.setPreset(preset);
        this.applyPreset(preset);
    }

    savePreferences(): void {
        this.savedConfig = { ...this.layoutService.layoutConfig() };
        this.layoutService.saveCurrentConfig();

        this.showSuccess('Les modifications ont été enregistrées localement avec succès.');
    }

    resetPreferences(): void {
        const defaultConfig = this.layoutService.getDefaultConfig();

        this.applyConfig(defaultConfig);
        this.syncSelectedValues(defaultConfig);

        this.showWarning('Les préférences ont été réinitialisées avec la configuration par défaut.');
    }

    goBack(): void {
        this.location.back();
    }

    private applyConfig(config: LayoutConfig): void {
        this.layoutService.layoutConfig.set({ ...config });
        this.layoutService.toggleDarkMode(config);

        if (this.isPresetName(config.preset)) {
            this.applyPreset(config.preset);
        }
    }

    private syncSelectedValues(config: LayoutConfig): void {
        this.selectedTheme.set(config.darkTheme ? 'dark' : 'light');
        this.selectedPreset.set(this.isPresetName(config.preset) ? config.preset : 'Aura');
    }

    private applyPreset(presetName: PresetName): void {
        $t()
            .preset(presets[presetName])
            .preset(this.getUnhPresetExt(presetName))
            .use({ useDefaultOptions: true });
    }

    private getUnhPresetExt(presetName: PresetName) {
        return {
            semantic: {
                primary: unhPrimary,
                colorScheme: {
                    light: {
                        primary: {
                            color: presetName === 'Nora' ? '{primary.600}' : '{primary.500}',
                            contrastColor: '#ffffff',
                            hoverColor: presetName === 'Nora' ? '{primary.700}' : '{primary.600}',
                            activeColor: presetName === 'Nora' ? '{primary.800}' : '{primary.700}'
                        }
                    },
                    dark: {
                        primary: {
                            color: presetName === 'Nora' ? '{primary.500}' : '{primary.400}',
                            contrastColor: '{surface.900}',
                            hoverColor: presetName === 'Nora' ? '{primary.400}' : '{primary.300}',
                            activeColor: presetName === 'Nora' ? '{primary.300}' : '{primary.200}'
                        }
                    }
                }
            }
        };
    }

    private isCurrentConfigSaved(): boolean {
        const currentConfig = this.layoutService.layoutConfig();

        return (
            currentConfig.darkTheme === this.savedConfig.darkTheme &&
            currentConfig.preset === this.savedConfig.preset
        );
    }

    private isPresetName(value: string): value is PresetName {
        return value === 'Aura' || value === 'Lara' || value === 'Nora';
    }

    private showSuccess(detail: string): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail,
            life: 3000
        });
    }

    private showWarning(detail: string): void {
        this.messageService.add({
            severity: 'warn',
            summary: 'Attention',
            detail,
            life: 3000
        });
    }
}
