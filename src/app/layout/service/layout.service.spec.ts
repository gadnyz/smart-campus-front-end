import { TestBed } from '@angular/core/testing';
import { LayoutConfig, LayoutService } from './layout.service';

describe('LayoutService (non-functional — theme compatibility)', () => {
    let service: LayoutService;

    const darkConfig: LayoutConfig = {
        preset: 'Aura',
        primary: 'unh',
        surface: 'slate',
        darkTheme: true,
        menuMode: 'static'
    };

    const lightConfig: LayoutConfig = {
        ...darkConfig,
        darkTheme: false
    };

    beforeEach(() => {
        localStorage.removeItem('smart-campus-layout-config');
        document.documentElement.classList.remove('app-dark');

        TestBed.configureTestingModule({});
        service = TestBed.inject(LayoutService);
    });

    afterEach(() => {
        localStorage.removeItem('smart-campus-layout-config');
        document.documentElement.classList.remove('app-dark');
    });

    it('should start in light mode without app-dark on the document element', () => {
        expect(service.isDarkTheme()).toBeFalse();
        expect(document.documentElement.classList.contains('app-dark')).toBeFalse();
    });

    it('should add app-dark when dark theme is applied', () => {
        service.layoutConfig.set(darkConfig);
        service.toggleDarkMode(darkConfig);

        expect(service.isDarkTheme()).toBeTrue();
        expect(document.documentElement.classList.contains('app-dark')).toBeTrue();
        expect(service.theme()).toBe('dark');
    });

    it('should remove app-dark when light theme is applied', () => {
        service.toggleDarkMode(darkConfig);
        service.layoutConfig.set(lightConfig);
        service.toggleDarkMode(lightConfig);

        expect(service.isDarkTheme()).toBeFalse();
        expect(document.documentElement.classList.contains('app-dark')).toBeFalse();
        expect(service.theme()).toBe('light');
    });

    it('should persist theme preference in localStorage', () => {
        service.layoutConfig.set(darkConfig);
        service.saveCurrentConfig();

        const stored = JSON.parse(localStorage.getItem('smart-campus-layout-config') ?? '{}');
        expect(stored.darkTheme).toBeTrue();
    });
});
