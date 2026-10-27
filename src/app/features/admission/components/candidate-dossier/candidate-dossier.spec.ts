import { Component, DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { CandidateDocument, CandidateResponse } from '../../models/candidate.model';
import { buildDossierSections, candidateInitials, requiredDocuments } from './candidate-dossier.model';
import { CandidateDossierDocuments } from './candidate-dossier-documents';
import { DossierDocumentUrls } from './dossier-document-urls';

const pdf: CandidateDocument = { id: 'd1', document_type: 'DIPLOMA', file_url: '', file_name: 'diplome.pdf', content_type: 'application/pdf', uploaded_at: '2026-10-02T09:00:00Z' };
const photo: CandidateDocument = { id: 'd2', document_type: 'PHOTO', file_url: '', file_name: 'photo.jpg', content_type: 'image/jpeg', uploaded_at: '2026-10-02T09:00:00Z' };

const candidate = {
    id: 'c1',
    first_name: 'Grâce',
    middle_name: '',
    last_name: 'Mbuyi',
    email: 'grace@unh.edu',
    phone: '+243',
    gender: 'FEMALE',
    birth_date: '2006-05-20',
    birth_place: 'Lubumbashi',
    marital_status: 'SINGLE',
    nationality: 'Congolaise',
    origin: { province: 'Haut-Katanga' },
    tutor: {},
    emergency_contact: {},
    academic_background: { school_name: 'Institut', option: 'Sciences', percentage: 72.5, graduation_year: 2025, study_city: 'Lubumbashi', study_country: 'RDC' },
    candidature: { type: 'NEW', status: 'PENDING', submitted_at: '2026-10-02T09:14:00Z' },
    documents: [pdf, photo]
} as unknown as CandidateResponse;

describe('candidate dossier model', () => {
    it('should list the four required documents, provided or missing, photo apart', () => {
        const items = requiredDocuments(candidate);
        expect(items.map((item) => item.type)).toEqual(['ID_CARD', 'DIPLOMA', 'TRANSCRIPT', 'PAYMENT_SLIP']);
        expect(items.find((item) => item.type === 'DIPLOMA')?.document).toBe(pdf);
        expect(items.filter((item) => item.document).length).toBe(1);
    });

    it('should build the same sections for the candidate and the staff, with a dash for empty values', () => {
        const sections = buildDossierSections(candidate, { facultyLabel: 'Sciences', programLabel: 'Informatique', levelLabel: 'L1', academicYearLabel: '2026-2027' });
        expect(sections.map((section) => section.id)).toEqual(['identity', 'academic', 'schooling', 'contacts']);
        const fields = sections.flatMap((section) => section.groups.flatMap((group) => group.fields));
        expect(fields.find((field) => field.label === 'Post-nom')?.value).toBe('—');
        expect(fields.find((field) => field.label === 'Filière')?.value).toBe('Informatique');
        expect(fields.find((field) => field.label === 'Pourcentage')?.value).toBe('72.5 %');
        expect(fields.find((field) => field.label === 'Lieu d’étude')?.value).toBe('Lubumbashi, RDC');
    });

    it('should fall back to a question mark without any name', () => {
        expect(candidateInitials({ first_name: '', last_name: '' })).toBe('?');
        expect(candidateInitials(candidate)).toBe('GM');
    });
});

describe('DossierDocumentUrls', () => {
    const destroyRef = { onDestroy: () => () => undefined } as unknown as DestroyRef;

    it('should resolve every document, an empty URL for a failed one', () => {
        const urls = new DossierDocumentUrls((document) => (document.id === 'd1' ? of('https://s3/d1') : throwError(() => new Error('403'))), destroyRef);
        urls.load([pdf, photo]);
        expect(urls.urls()).toEqual({ d1: 'https://s3/d1', d2: '' });
    });

    it('should renew an URL at most twice', () => {
        let calls = 0;
        const urls = new DossierDocumentUrls(() => of(`https://s3/${++calls}`), destroyRef);
        urls.refresh(pdf).subscribe();
        urls.refresh(pdf).subscribe();
        urls.refresh(pdf).subscribe();
        expect(calls).toBe(2);
        expect(urls.url(pdf)).toBe('https://s3/2');
    });

    it('should drop a pending load when a new candidate is loaded', () => {
        const pending = new Subject<string>();
        const urls = new DossierDocumentUrls((document) => (document.id === 'd1' ? pending : of('https://s3/d2')), destroyRef);
        urls.load([pdf]);
        urls.load([photo]);
        pending.next('https://s3/old');
        pending.complete();
        expect(urls.urls()).toEqual({ d2: 'https://s3/d2' });
    });
});

@Component({
    standalone: true,
    imports: [CandidateDossierDocuments],
    template: `
        <app-candidate-dossier-documents [items]="items" [actions]="withActions ? actionsTemplate : null" missingLabel="Non fournie" />
        <ng-template #actionsTemplate let-item><button class="custom-action">{{ item.label }}</button></ng-template>
    `
})
class DocumentsHost {
    readonly items = requiredDocuments(candidate);
    withActions = false;
}

describe('CandidateDossierDocuments', () => {
    function render(withActions: boolean): HTMLElement {
        const fixture = TestBed.createComponent(DocumentsHost);
        fixture.componentInstance.withActions = withActions;
        fixture.detectChanges();
        fixture.detectChanges();
        return fixture.nativeElement as HTMLElement;
    }

    it('should count provided documents and label the missing ones', () => {
        const element = render(false);
        expect(element.querySelector('.dossier-card__count')?.textContent?.trim()).toBe('1/4 pièces');
        expect(element.querySelectorAll('.document-row__missing').length).toBe(3);
        expect(element.querySelector('.document-row__missing')?.textContent?.trim()).toBe('Non fournie');
    });

    it('should offer no page action unless the page provides some', () => {
        expect(render(false).querySelectorAll('.custom-action').length).toBe(0);
        expect(render(true).querySelectorAll('.custom-action').length).toBe(4);
    });
});
