import { Injectable, computed, effect, signal } from '@angular/core';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | undefined | null;
    darkTheme: boolean;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private readonly storageKey = 'smart-campus-layout-config';

    private readonly defaultConfig: LayoutConfig = {
        preset: 'Aura',
        primary: 'unh',
        surface: 'slate',
        darkTheme: false,
        menuMode: 'static'
    };

    layoutConfig = signal<LayoutConfig>(this.loadConfig());

    layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    theme = computed(() => (this.layoutConfig().darkTheme ? 'dark' : 'light'));

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isDarkTheme = computed(() => this.layoutConfig().darkTheme);

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        effect(() => {
            const config = this.layoutConfig();

            this.saveConfig(config);

            if (!this.initialized) {
                this.initialized = true;
                this.toggleDarkMode(config);
                return;
            }

            this.handleDarkModeTransition(config);
            this.saveConfig(config);
        });
    }

    setThemeMode(mode: 'light' | 'dark'): void {
        this.layoutConfig.update((state) => ({
            ...state,
            darkTheme: mode === 'dark'
        }));
    }

    setPreset(preset: string): void {
        this.layoutConfig.update((state) => ({
            ...state,
            preset
        }));
    }

    setPrimary(primary: string): void {
        this.layoutConfig.update((state) => ({
            ...state,
            primary
        }));
    }

    setSurface(surface: string | undefined | null): void {
        this.layoutConfig.update((state) => ({
            ...state,
            surface
        }));
    }

    setMenuMode(menuMode: string): void {
        this.layoutConfig.update((state) => ({
            ...state,
            menuMode
        }));
    }

    private loadConfig(): LayoutConfig {
        if (typeof localStorage === 'undefined') {
            return this.defaultConfig;
        }

        const storedConfig = localStorage.getItem(this.storageKey);

        if (!storedConfig) {
            return this.defaultConfig;
        }

        try {
            return {
                ...this.defaultConfig,
                ...JSON.parse(storedConfig)
            };
        } catch {
            localStorage.removeItem(this.storageKey);
            return this.defaultConfig;
        }
    }

    private saveConfig(config: LayoutConfig): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(this.storageKey, JSON.stringify(config));
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.toggleDarkMode(config);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        document.startViewTransition(() => {
            this.toggleDarkMode(config);
        });
    }

    toggleDarkMode(config?: LayoutConfig): void {
        const currentConfig = config || this.layoutConfig();

        if (currentConfig.darkTheme) {
            document.documentElement.classList.add('app-dark');
        } else {
            document.documentElement.classList.remove('app-dark');
        }
    }

    onMenuToggle(): void {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({
                ...prev,
                overlayMenuActive: !this.layoutState().overlayMenuActive
            }));
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({
                ...prev,
                staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive
            }));
        } else {
            this.layoutState.update((prev) => ({
                ...prev,
                mobileMenuActive: !this.layoutState().mobileMenuActive
            }));
        }
    }

    showConfigSidebar(): void {
        this.layoutState.update((prev) => ({
            ...prev,
            configSidebarVisible: true
        }));
    }

    hideConfigSidebar(): void {
        this.layoutState.update((prev) => ({
            ...prev,
            configSidebarVisible: false
        }));
    }

    isDesktop(): boolean {
        return window.innerWidth > 991;
    }

    isMobile(): boolean {
        return !this.isDesktop();
    }

    saveCurrentConfig(): void {
        this.saveConfig(this.layoutConfig());
    }

    getDefaultConfig(): LayoutConfig {
        return { ...this.defaultConfig };
    }
}
