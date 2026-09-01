import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardStat, DashboardStatCard } from './dashboard-stat-card';

describe('DashboardStatCard', () => {
    let component: DashboardStatCard;
    let fixture: ComponentFixture<DashboardStatCard>;

    const stat: DashboardStat = {
        label: 'Utilisateurs',
        value: 0,
        icon: 'pi pi-users',
        iconContainerClass: 'bg-blue-100',
        iconClass: 'text-blue-500',
        listRoute: '/settings/identity/users'
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DashboardStatCard],
            providers: [provideRouter([])]
        }).compileComponents();

        fixture = TestBed.createComponent(DashboardStatCard);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('stat', stat);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should be clickable when a listRoute is provided', () => {
        expect(component.isClickable()).toBeTrue();
    });
});
