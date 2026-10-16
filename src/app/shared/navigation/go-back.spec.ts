import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { goBack, hasInAppHistory } from './go-back';

describe('goBack', () => {
    function location(state: unknown): jasmine.SpyObj<Location> {
        const spy = jasmine.createSpyObj<Location>('Location', ['getState', 'back']);
        spy.getState.and.returnValue(state);
        return spy;
    }

    function router(): jasmine.SpyObj<Router> {
        const spy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        spy.navigate.and.resolveTo(true);
        return spy;
    }

    it('should go back when the previous entry is a screen of the application', () => {
        const loc = location({ navigationId: 3 });
        const nav = router();

        goBack(nav, loc, ['/scheduling/timetable']);

        expect(loc.back).toHaveBeenCalled();
        expect(nav.navigate).not.toHaveBeenCalled();
    });

    it('should open the fallback on a deep link, a new tab or a reload', () => {
        for (const state of [{ navigationId: 1 }, null, {}]) {
            const loc = location(state);
            const nav = router();

            goBack(nav, loc, ['/scheduling/timetable']);

            expect(loc.back).not.toHaveBeenCalled();
            expect(nav.navigate).toHaveBeenCalledWith(['/scheduling/timetable']);
        }
    });

    it('should read the router navigation id', () => {
        expect(hasInAppHistory(location({ navigationId: 2 }))).toBeTrue();
        expect(hasInAppHistory(location({ navigationId: 1 }))).toBeFalse();
    });
});
