import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateDetail } from './candidate-detail';

describe('CandidateDetail', () => {
    let component: CandidateDetail;
    let fixture: ComponentFixture<CandidateDetail>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CandidateDetail]
        }).compileComponents();

        fixture = TestBed.createComponent(CandidateDetail);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
