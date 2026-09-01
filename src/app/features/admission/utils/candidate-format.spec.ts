import { resolveCandidateDocumentKind } from './candidate-format';

describe('resolveCandidateDocumentKind', () => {
    it('should always treat PHOTO as image even when file name ends with .pdf', () => {
        expect(
            resolveCandidateDocumentKind({
                document_type: 'PHOTO',
                content_type: 'application/pdf',
                file_name: 'photo.pdf',
                file_url: 'students/1/admissions/photo.pdf'
            })
        ).toBe('image');
    });

    it('should infer pdf from metadata for ID_CARD', () => {
        expect(
            resolveCandidateDocumentKind({
                document_type: 'ID_CARD',
                content_type: 'application/pdf',
                file_name: 'id-card.pdf',
                file_url: 'students/1/admissions/id-card.pdf'
            })
        ).toBe('pdf');
    });

    it('should default ID_CARD to image when metadata is inconclusive', () => {
        expect(
            resolveCandidateDocumentKind({
                document_type: 'ID_CARD',
                file_name: 'id-card',
                file_url: 'students/1/admissions/id-card'
            })
        ).toBe('image');
    });

    it('should default PAYMENT_SLIP to pdf when metadata is inconclusive', () => {
        expect(
            resolveCandidateDocumentKind({
                document_type: 'PAYMENT_SLIP',
                file_name: 'payment',
                file_url: 'students/1/admissions/payment'
            })
        ).toBe('pdf');
    });

    it('should infer image from png extension for supporting documents', () => {
        expect(
            resolveCandidateDocumentKind({
                document_type: 'PAYMENT_SLIP',
                file_name: 'payment.png',
                file_url: 'students/1/admissions/payment.png'
            })
        ).toBe('image');
    });
});
