import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AppFloatingConfigurator } from '../../layout/component/app.floatingconfigurator';

/**
 * Page d'erreur générique. Nommée `ErrorPage` et non `Error` : ce nom masquait l'objet global
 * `Error` dans le module et faisait échouer le lanceur de tests.
 */
@Component({
    selector: 'app-error',
    imports: [ButtonModule, RippleModule, RouterModule, AppFloatingConfigurator],
    standalone: true,
    template: ` <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, rgba(233, 30, 99, 0.4) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
                        <div class="gap-4 flex flex-col items-center">
                            <div class="flex justify-center items-center border-2 border-pink-500 rounded-full" style="height: 3.2rem; width: 3.2rem">
                                <i class="pi pi-fw pi-exclamation-circle text-2xl! text-pink-500"></i>
                            </div>
                            <h1 class="text-surface-900 dark:text-surface-0 font-bold text-5xl mb-2">Une erreur est survenue</h1>
                            <span class="text-muted-color mb-8">La ressource demandée n’est pas disponible.</span>
                            <div class="col-span-12 mt-4 text-center">
                                <p-button label="Retour au tableau de bord" icon="pi pi-home" routerLink="/" severity="danger" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
})
export class ErrorPage {}
