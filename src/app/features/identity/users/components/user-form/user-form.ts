import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, InputTextModule, SelectModule, TextareaModule, CheckboxModule, ButtonModule, CardModule],
    template: `
        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 xl:col-span-8">
                <div class="card">
                    <div class="font-semibold text-xl mb-6">Informations générales</div>

                    <form [formGroup]="form" class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-6">
                            <label for="firstName" class="block text-sm font-medium mb-2">Prénom</label>
                            <input pInputText id="firstName" formControlName="firstName" class="w-full" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="lastName" class="block text-sm font-medium mb-2">Nom</label>
                            <input pInputText id="lastName" formControlName="lastName" class="w-full" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="email" class="block text-sm font-medium mb-2">Email institutionnel</label>
                            <input pInputText id="email" formControlName="email" class="w-full" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="phone" class="block text-sm font-medium mb-2">Téléphone</label>
                            <input pInputText id="phone" formControlName="phone" class="w-full" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="businessProfile" class="block text-sm font-medium mb-2">Profil métier</label>
                            <p-select id="businessProfile" formControlName="businessProfile" [options]="businessProfiles" optionLabel="label" optionValue="value" placeholder="Sélectionner un profil" class="w-full" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="role" class="block text-sm font-medium mb-2">Rôle</label>
                            <p-select id="role" formControlName="role" [options]="roles" optionLabel="label" optionValue="value" placeholder="Sélectionner un rôle" class="w-full" />
                        </div>

                        <div class="col-span-12 md:col-span-6">
                            <label for="status" class="block text-sm font-medium mb-2">Statut</label>
                            <p-select id="status" formControlName="status" [options]="statuses" optionLabel="label" optionValue="value" placeholder="Sélectionner un statut" class="w-full" />
                        </div>

                        <div class="col-span-12">
                            <label for="notes" class="block text-sm font-medium mb-2">Observations</label>
                            <textarea pTextarea id="notes" formControlName="notes" rows="4" class="w-full"></textarea>
                        </div>
                    </form>
                </div>
            </div>

            <div class="col-span-12 xl:col-span-4">
                <div class="card">
                    <div class="font-semibold text-xl mb-6">Paramètres d’accès</div>

                    <div class="flex flex-col gap-4">
                        <div class="flex items-center gap-2">
                            <p-checkbox inputId="mustChangePassword" formControlName="mustChangePassword" [binary]="true" />
                            <label for="mustChangePassword">Forcer le changement de mot de passe</label>
                        </div>

                        <div class="flex items-center gap-2">
                            <p-checkbox inputId="sendActivationEmail" formControlName="sendActivationEmail" [binary]="true" />
                            <label for="sendActivationEmail">Envoyer l’email d’activation</label>
                        </div>

                        <div class="flex items-center gap-2">
                            <p-checkbox inputId="isActive" formControlName="isActive" [binary]="true" />
                            <label for="isActive">Compte actif</label>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 mt-6">
                        <button pButton type="button" label="Annuler" severity="secondary" [outlined]="true"></button>
                        <button pButton type="button" label="{{ submitLabel() }}" icon="pi pi-save"></button>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class UserForm {
    submitLabel = input('Enregistrer');

    private fb = new FormBuilder();

    form = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        phone: [''],
        businessProfile: [null, Validators.required],
        role: [null, Validators.required],
        status: ['active', Validators.required],
        notes: [''],
        mustChangePassword: [true],
        sendActivationEmail: [true],
        isActive: [true]
    });

    businessProfiles = [
        { label: 'Assistant d’enseignement', value: 'assistant-enseignement' },
        { label: 'SAF', value: 'saf' },
        { label: 'Responsable de filière', value: 'responsable-filiere' },
        { label: 'Comptable', value: 'comptable' }
    ];

    roles = [
        { label: 'Administrateur', value: 'admin' },
        { label: 'Gestionnaire', value: 'manager' },
        { label: 'Validateur', value: 'validator' },
        { label: 'Opérateur', value: 'operator' }
    ];

    statuses = [
        { label: 'Actif', value: 'active' },
        { label: 'En attente', value: 'pending' },
        { label: 'Suspendu', value: 'suspended' },
        { label: 'Inactif', value: 'inactive' }
    ];
}
