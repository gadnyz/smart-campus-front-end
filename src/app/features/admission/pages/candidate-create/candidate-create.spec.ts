import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateCreate } from './candidate-create';

describe('CandidateCreate', () => {
    let component: CandidateCreate;
    let fixture: ComponentFixture<CandidateCreate>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CandidateCreate]
        }).compileComponents();

        fixture = TestBed.createComponent(CandidateCreate);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
