import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
    selector: 'app-notfound',
    standalone: true,
    imports: [RouterModule, ButtonModule],
    template: `
        <div class="flex items-center justify-center min-h-screen overflow-hidden px-4">
            <div class="flex flex-col items-center justify-center text-center max-w-lg">
                <span class="text-primary font-bold text-6xl lg:text-7xl leading-none mb-4">404</span>

                <h1 class="text-surface-900 dark:text-surface-0 font-bold text-2xl lg:text-4xl mb-3">
                    Page introuvable
                </h1>

                <p class="text-surface-600 dark:text-surface-200 mb-2 text-base lg:text-lg">
                    La page que vous recherchez n’existe pas ou a été déplacée.
                </p>

                <p class="text-surface-500 dark:text-surface-400 mb-8 text-sm lg:text-base">
                    Vérifiez l’adresse saisie, ou retournez à l’accueil pour continuer.
                </p>

                <p-button label="Retour à l’accueil" icon="pi pi-home" routerLink="/" />
            </div>
        </div>
    `
})
export class Notfound {}