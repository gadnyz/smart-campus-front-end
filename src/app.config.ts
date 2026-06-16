import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withEnabledBlockingInitialNavigation, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@/app/core/auth/interceptors/auth.interceptor';
import { definePreset } from '@primeuix/themes';

import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { appRoutes } from './app.routes';

const UNHPreset = definePreset(Aura, {
    semantic: {
        primary: {
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
        },
        colorScheme: {
            light: {
                primary: {
                    color: '{primary.500}',
                    contrastColor: '#ffffff',
                    hoverColor: '{primary.600}',
                    activeColor: '{primary.700}'
                }
            },
            dark: {
                primary: {
                    color: '{primary.400}',
                    contrastColor: '{surface.900}',
                    hoverColor: '{primary.300}',
                    activeColor: '{primary.200}'
                }
            }
        }
    }
});

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(appRoutes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }), withEnabledBlockingInitialNavigation()),
        provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
        provideZonelessChangeDetection(),
        providePrimeNG({ theme: { preset: UNHPreset, options: { darkModeSelector: '.app-dark' } } })
    ]
};
