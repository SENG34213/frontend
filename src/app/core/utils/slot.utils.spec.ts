import {
  formatDateToYMD,
  formatTimeString,
  getCleanTimeId,
  convertToIsoInstant,
  getSlotStartTimestamp,
  getSlotEndTimestamp,
  isWithinCutoffHours,
  calculateDurationHours,
  RESCHEDULE_CUTOFF_HOURS
} from './slot.utils';

describe('slot.utils', () => {
  describe('formatDateToYMD', () => {
    it('should format date to YYYY-MM-DD given a valid Date object', () => {
      // Arrange
      const date = new Date(2026, 9, 25); // Oct 25, 2026

      // Act
      const result = formatDateToYMD(date);

      // Assert
      expect(result).toBe('2026-10-25');
    });
  });

  describe('formatTimeString', () => {
    it('should format 24-hour time string to 12-hour AM/PM given HH:mm', () => {
      // Arrange & Act & Assert
      expect(formatTimeString('10:00')).toBe('10:00 AM');
      expect(formatTimeString('13:30')).toBe('01:30 PM');
      expect(formatTimeString('00:15')).toBe('12:15 AM');
      expect(formatTimeString('12:00')).toBe('12:00 PM');
    });

    it('should format ISO timestamp to Sri Lanka local time given an ISO string', () => {
      // Arrange
      // 08:30 UTC is 14:00 (02:00 PM) in Asia/Colombo (+05:30)
      const iso = '2026-10-25T08:30:00Z';

      // Act
      const result = formatTimeString(iso);

      // Assert
      expect(result).toBe('02:00 PM');
    });

    it('should return already formatted AM/PM string given 12h time string', () => {
      // Arrange & Act & Assert
      expect(formatTimeString('10:00 AM')).toBe('10:00 AM');
    });

    it('should return empty string given empty input', () => {
      expect(formatTimeString('')).toBe('');
    });
  });

  describe('getCleanTimeId', () => {
    it('should strip special characters given an ISO or formatted time', () => {
      expect(getCleanTimeId('10:00:00Z')).toBe('100000Z');
      expect(getCleanTimeId('12:00 PM')).toBe('1200PM');
    });
  });

  describe('convertToIsoInstant', () => {
    it('should convert local date and 24h time to ISO instant string given YYYY-MM-DD and HH:mm', () => {
      // Arrange
      const date = '2026-10-25';
      const time = '14:00'; // 14:00 +05:30 is 08:30 UTC

      // Act
      const result = convertToIsoInstant(date, time);

      // Assert
      expect(result).toBe('2026-10-25T08:30:00.000Z');
    });

    it('should preserve and parse valid ISO string given time already in ISO format', () => {
      // Arrange
      const iso = '2026-10-25T08:30:00Z';

      // Act
      const result = convertToIsoInstant('2026-10-25', iso);

      // Assert
      expect(result).toBe('2026-10-25T08:30:00.000Z');
    });
  });

  describe('getSlotStartTimestamp and getSlotEndTimestamp', () => {
    it('should calculate timestamps correctly given date and time strings', () => {
      // Arrange
      const date = '2026-10-25';
      const start = '14:00';
      const end = '16:00';

      // Act
      const startMs = getSlotStartTimestamp(date, start);
      const endMs = getSlotEndTimestamp(date, end);

      // Assert
      expect(endMs - startMs).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse ISO strings directly given ISO formatted strings', () => {
      // Arrange
      const iso = '2026-10-25T08:30:00Z';

      // Act & Assert
      expect(getSlotStartTimestamp('2026-10-25', iso)).toBe(new Date(iso).getTime());
      expect(getSlotEndTimestamp('2026-10-25', iso)).toBe(new Date(iso).getTime());
    });
  });

  describe('isWithinCutoffHours', () => {
    it('should return true given start time is within 2 hours of current time', () => {
      // Arrange
      const now = new Date('2026-10-20T10:00:00Z');
      const startIn1Hour = new Date('2026-10-20T11:00:00Z');

      // Act & Assert
      expect(isWithinCutoffHours(startIn1Hour, RESCHEDULE_CUTOFF_HOURS, now)).toBeTrue();
    });

    it('should return false given start time is more than 2 hours from current time', () => {
      // Arrange
      const now = new Date('2026-10-20T10:00:00Z');
      const startIn3Hours = new Date('2026-10-20T13:00:00Z');

      // Act & Assert
      expect(isWithinCutoffHours(startIn3Hours, RESCHEDULE_CUTOFF_HOURS, now)).toBeFalse();
    });

    it('should return false given invalid or zero time', () => {
      expect(isWithinCutoffHours('')).toBeFalse();
    });
  });

  describe('calculateDurationHours', () => {
    it('should return 2 given start at 14:00 and end at 16:00', () => {
      // Arrange
      const start = '14:00';
      const end = '16:00';
      const date = '2026-10-25';

      // Act
      const duration = calculateDurationHours(start, end, date);

      // Assert
      expect(duration).toBe(2);
    });

    it('should return 1 given start and end span 1 hour', () => {
      // Arrange
      const start = '10:00';
      const end = '11:00';

      // Act
      const duration = calculateDurationHours(start, end);

      // Assert
      expect(duration).toBe(1);
    });
  });
});
