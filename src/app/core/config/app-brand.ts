import { environment } from '@/environments/environment';

export const appBrand = {
    appName: environment.appName,
    university: environment.univesity,
    university_website: 'horizons.org',
    footerTagline: 'Oser – Innover – Persévérer',
    logos: {
        main: 'images/icons/logo.png',
        compact: 'images/icons/logo.png',
        light: 'images/icons/logo.png',
        dark: 'images/icons/logo-dark.png'
    }
} as const;
