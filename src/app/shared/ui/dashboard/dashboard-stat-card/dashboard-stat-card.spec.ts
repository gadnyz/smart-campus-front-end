import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardStatCard } from './dashboard-stat-card';

describe('DashboardStatCard', () => {
    let component: DashboardStatCard;
    let fixture: ComponentFixture<DashboardStatCard>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardStatCard]
        }).compileComponents();

        fixture = TestBed.createComponent(DashboardStatCard);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
