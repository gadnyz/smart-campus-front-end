import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { forgetPassword } from './forget-password';

describe('forgetPassword', () => {
    let component: forgetPassword;
    let fixture: ComponentFixture<forgetPassword>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [forgetPassword],
            providers: [provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(forgetPassword);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
