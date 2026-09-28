import { ROOM_TYPE_OPTIONS, RoomType, roomTypeLabel } from './room.model';

describe('room.model', () => {
    it('should expose exactly the four room types declared by the backend', () => {
        const expected: RoomType[] = ['LABORATORY', 'NORMAL', 'OFFICE', 'ONLINE'];
        expect(ROOM_TYPE_OPTIONS.map((option) => option.value).sort()).toEqual(expected.sort());
    });

    it('should label each known room type in French', () => {
        expect(roomTypeLabel('NORMAL')).toBe('Standard');
        expect(roomTypeLabel('ONLINE')).toBe('En ligne');
        expect(roomTypeLabel('OFFICE')).toBe('Bureau');
        expect(roomTypeLabel('LABORATORY')).toBe('Laboratoire');
    });

    it('should fall back to the raw value for an unknown type', () => {
        expect(roomTypeLabel('UNKNOWN')).toBe('UNKNOWN');
    });

    it('should fall back to a dash when the type is missing', () => {
        expect(roomTypeLabel(null)).toBe('—');
        expect(roomTypeLabel(undefined)).toBe('—');
    });
});
