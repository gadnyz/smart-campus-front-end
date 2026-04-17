import { environment } from '@/environments/environment';

export const appBrand = {
    appName: environment.appName,
    footerTagline: 'Oser – Innover – Persévérer',
    logos: {
        main: 'assets/images/icons/logo.png',
        compact: 'assets/images/icons/logo.png',
        light: 'assets/images/icons/logo.png',
        dark: 'assets/images/icons/logo-dark'
    }
} as const;
