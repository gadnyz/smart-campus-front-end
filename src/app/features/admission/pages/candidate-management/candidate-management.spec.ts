import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateManagement } from './candidate-management';

describe('CandidateManagement', () => {
    let component: CandidateManagement;
    let fixture: ComponentFixture<CandidateManagement>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CandidateManagement]
        }).compileComponents();

        fixture = TestBed.createComponent(CandidateManagement);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
