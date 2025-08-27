/**
 * Date Manager Test Suite - Only Real Methods
 * Tests for actual DateManager.js methods
 */

const DateManager = require('../src/dateManager');
const moment = require('moment');

describe('DateManager', () => {
  let dateManager;

  beforeEach(() => {
    dateManager = new DateManager();
  });

  describe('Constructor', () => {
    test('should create instance with default options', () => {
      expect(dateManager.defaultFormat).toBe('YYYY-MM-DD');
      expect(dateManager).toBeDefined();
    });
  });

  describe('Date Validation', () => {
    test('should validate date range correctly', () => {
      expect(dateManager.validateDateRange('2023-01-01', '2023-01-31')).toBe(true);
      expect(dateManager.validateDateRange('2023-01-01', '2022-12-31')).toBe(false);
    });

    test('should reject invalid date ranges', () => {
      expect(dateManager.validateDateRange('invalid-date', '2023-01-31')).toBe(false);
      expect(dateManager.validateDateRange('2023-01-01', 'invalid-date')).toBe(false);
    });

    test('should handle null/undefined dates', () => {
      expect(dateManager.validateDateRange(null, '2023-01-31')).toBe(false);
      expect(dateManager.validateDateRange('2023-01-01', null)).toBe(false);
      expect(dateManager.validateDateRange(null, null)).toBe(false);
    });
  });

  describe('Date Range Generation', () => {
    test('should generate date range with exact count', () => {
      const dates = dateManager.generateDateRange('2023-01-01', '2023-01-05', 5);

      expect(dates).toHaveLength(5);
      expect(dates[0]).toContain('2023-01-01');
      expect(dates[dates.length - 1]).toContain('2023-01-05');
    });

    test('should generate dates in chronological order', () => {
      const dates = dateManager.generateDateRange('2023-01-01', '2023-01-05', 5);
      const parsedDates = dates.map(dateStr => moment(dateStr));

      for (let i = 1; i < parsedDates.length; i++) {
        expect(parsedDates[i].isSameOrAfter(parsedDates[i - 1])).toBe(true);
      }
    });

    test('should handle single date range', () => {
      const dates = dateManager.generateDateRange('2023-01-01', '2023-01-01', 1);

      expect(dates).toHaveLength(1);
      expect(dates[0]).toContain('2023-01-01');
    });

    test('should distribute dates evenly across range', () => {
      const dates = dateManager.generateDateRange('2023-01-01', '2023-01-05', 3);
      const parsedDates = dates.map(dateStr => moment(dateStr));
      const startDate = moment('2023-01-01');
      const endDate = moment('2023-01-05');

      expect(parsedDates[0].isSameOrAfter(startDate)).toBe(true);
      expect(parsedDates[parsedDates.length - 1].isSameOrBefore(endDate)).toBe(true);
    });

    test('should handle preserveOrder option', () => {
      const datesPreserved = dateManager.generateDateRange('2023-01-01', '2023-01-05', 3, {
        preserveOrder: true
      });
      const parsedDatesPreserved = datesPreserved.map(dateStr => moment(dateStr));

      for (let i = 1; i < parsedDatesPreserved.length; i++) {
        expect(parsedDatesPreserved[i].isSameOrAfter(parsedDatesPreserved[i - 1])).toBe(true);
      }
    });

    test('should handle large date ranges', () => {
      const dates = dateManager.generateDateRange('2020-01-01', '2025-01-01', 100);

      expect(dates).toHaveLength(100);
      expect(dates[0]).toContain('2020-01');
      expect(dates[dates.length - 1]).toContain('2025-01');
    });

    test('should handle invalid input gracefully', () => {
      expect(() => {
        dateManager.generateDateRange('invalid-date', '2023-01-05', 5);
      }).toThrow('Invalid date format. Please use YYYY-MM-DD format.');

      expect(() => {
        dateManager.generateDateRange('2023-01-01', '2023-01-05', 0);
      }).not.toThrow(); // count=0 should not throw

      expect(() => {
        dateManager.generateDateRange('2023-01-05', '2023-01-01', 5);
      }).toThrow('Start date cannot be after end date.');
    });
  });

  describe('Commit Filtering', () => {
    test('should filter commits by date range', () => {
      const commits = [
        { date: '2023-01-15', message: 'Middle commit' },
        { date: '2023-01-01', message: 'Start commit' },
        { date: '2023-01-31', message: 'End commit' }
      ];

      const filtered = dateManager.filterCommitsBetween(commits, '2023-01-01', '2023-01-31');
      expect(filtered).toHaveLength(3);
    });

    test('should handle commits on boundary dates', () => {
      const commits = [
        { date: '2023-01-01', message: 'Start Date' },
        { date: '2023-01-31', message: 'End Date' }
      ];

      const filtered = dateManager.filterCommitsBetween(commits, '2023-01-01', '2023-01-31');
      expect(filtered).toHaveLength(2);
      expect(filtered[0].message).toBe('Start Date');
      expect(filtered[1].message).toBe('End Date');
    });

    test('should handle empty commit array', () => {
      const filtered = dateManager.filterCommitsBetween([], '2023-01-01', '2023-01-31');
      expect(filtered).toHaveLength(0);
    });

    test('should handle commits without date property', () => {
      const commits = [
        { message: 'No date commit' },
        { date: '2023-01-15', message: 'With date' }
      ];

      expect(() => {
        dateManager.filterCommitsBetween(commits, '2023-01-01', '2023-01-31');
      }).not.toThrow();
    });

    test('should handle invalid date strings', () => {
      const commits = [
        { date: '2023-01-15', message: 'Valid date' }
      ];

      expect(() => {
        dateManager.filterCommitsBetween(commits, 'invalid-date', '2023-01-31');
      }).toThrow('Invalid date format. Please use YYYY-MM-DD format.');
    });
  });

  describe('Date Formatting', () => {
    test('should format date with default format', () => {
      const date = new Date('2023-01-15T14:30:00');
      const formatted = dateManager.formatDate(date);
      expect(formatted).toBe('2023-01-15');
    });

    test('should format date with custom format', () => {
      const date = new Date('2023-01-15T14:30:00');
      const formatted = dateManager.formatDate(date, 'YYYY-MM-DD HH:mm:ss');
      expect(formatted).toContain('2023-01-15');
      expect(formatted).toContain('14:30');
    });

    test('should format date from string input', () => {
      const formatted = dateManager.formatDate('2023-01-15');
      expect(formatted).toBe('2023-01-15');
    });

    test('should handle invalid date inputs', () => {
      const formatted = dateManager.formatDate('invalid-date');
      expect(formatted).toBe('Invalid date');
    });

    test('should handle null/undefined inputs', () => {
      expect(() => {
        dateManager.formatDate(null);
      }).not.toThrow();

      expect(() => {
        dateManager.formatDate(undefined);
      }).not.toThrow();
    });
  });

  describe('Date Conversion and Utilities', () => {
    test('should convert date to ISO format', () => {
      const date = new Date('2023-01-15T14:30:00');
      const iso = dateManager.formatToISO(date);
      expect(iso).toContain('2023-01-15');
      expect(iso).toContain('T');
      expect(iso).toContain('Z');
    });

    test('should convert date to Git format', () => {
      const date = new Date('2023-01-15T14:30:00');
      const gitFormat = dateManager.formatForGit(date);
      expect(gitFormat).toContain('2023-01-15');
      expect(gitFormat).toContain('+');
    });

    test('should get timestamp from date', () => {
      const date = new Date('2023-01-15T14:30:00');
      const timestamp = dateManager.getTimestamp(date);
      expect(typeof timestamp).toBe('number');
      expect(timestamp).toBeGreaterThan(0);
    });

    test('should calculate date difference', () => {
      const date1 = new Date('2023-01-10');
      const date2 = new Date('2023-01-15');

      const days = dateManager.getDateDifference(date2, date1);
      expect(days).toBe(5);
    });

    test('should get human readable date', () => {
      const date = new Date();
      const humanReadable = dateManager.getHumanReadableDate(date);
      expect(typeof humanReadable).toBe('string');
      expect(humanReadable.length).toBeGreaterThan(0);
    });
  });

  describe('Commit Date Sorting', () => {
    test('should sort commits by date in ascending order', () => {
      const commits = [
        { date: '2023-01-15', message: 'Middle' },
        { date: '2023-01-01', message: 'First' },
        { date: '2023-01-31', message: 'Last' }
      ];

      const sorted = dateManager.sortCommitsByDate(commits, 'asc');
      expect(sorted[0].message).toBe('First');
      expect(sorted[1].message).toBe('Middle');
      expect(sorted[2].message).toBe('Last');
    });

    test('should sort commits by date in descending order', () => {
      const commits = [
        { date: '2023-01-15', message: 'Middle' },
        { date: '2023-01-01', message: 'First' },
        { date: '2023-01-31', message: 'Last' }
      ];

      const sorted = dateManager.sortCommitsByDate(commits, 'desc');
      expect(sorted[0].message).toBe('Last');
      expect(sorted[1].message).toBe('Middle');
      expect(sorted[2].message).toBe('First');
    });
  });

  describe('Commit Filtering (Before/After)', () => {
    test('should filter commits before date', () => {
      const commits = [
        { date: '2023-01-15', message: 'Middle' },
        { date: '2022-12-31', message: 'Before' },
        { date: '2023-02-01', message: 'After' }
      ];

      const filtered = dateManager.filterCommitsBefore(commits, '2023-01-31');
      expect(filtered).toHaveLength(2);
      expect(filtered.some(c => c.message === 'Before')).toBe(true);
      expect(filtered.some(c => c.message === 'Middle')).toBe(true);
    });

    test('should filter commits after date', () => {
      const commits = [
        { date: '2023-01-15', message: 'Middle' },
        { date: '2022-12-31', message: 'Before' },
        { date: '2023-02-01', message: 'After' }
      ];

      const filtered = dateManager.filterCommitsAfter(commits, '2023-01-01');
      expect(filtered).toHaveLength(2);
      expect(filtered.some(c => c.message === 'Middle')).toBe(true);
      expect(filtered.some(c => c.message === 'After')).toBe(true);
    });
  });

  describe('Commit Date Analysis', () => {
    test('should analyze commit days', () => {
      const commits = [
        { date: '2023-01-15' },
        { date: '2023-01-15' },
        { date: '2023-01-16' }
      ];

      const dayStats = dateManager.analyzeCommitDays(commits);
      expect(dayStats['2023-01-15']).toBe(2);
      expect(dayStats['2023-01-16']).toBe(1);
    });

    test('should analyze commit hours', () => {
      const commits = [
        { date: '2023-01-15T10:30:00' },
        { date: '2023-01-15T10:45:00' },
        { date: '2023-01-15T14:30:00' }
      ];

      const hourStats = dateManager.analyzeCommitHours(commits);
      expect(hourStats[10]).toBe(2);
      expect(hourStats[14]).toBe(1);
    });
  });

  describe('Commit Date Normalization', () => {
    test('should normalize commit dates', () => {
      const commits = [
        { date: '2023-01-15T10:30:00', message: 'Commit 1' },
        { date: new Date('2023-01-16T14:30:00'), message: 'Commit 2' }
      ];

      const normalized = dateManager.normalizeCommitDates(commits);
      expect(normalized[0].date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(normalized[0].originalDate).toBeDefined();
      expect(normalized[1].date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(normalized[1].originalDate).toBeDefined();
    });

    test('should normalize with custom format', () => {
      const commits = [
        { date: '2023-01-15T10:30:00', message: 'Commit 1' }
      ];

      const normalized = dateManager.normalizeCommitDates(commits, 'YYYY-MM-DD');
      expect(normalized[0].date).toBe('2023-01-15');
      expect(normalized[0].originalDate).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle very large date ranges', () => {
      const dates = dateManager.generateDateRange('2020-01-01', '2050-01-01', 10);
      expect(dates).toHaveLength(10);
      expect(dates[0]).toContain('2020-01');
      expect(dates[dates.length - 1]).toContain('2050-01');
    });

    test('should handle leap years in date generation', () => {
      const dates = dateManager.generateDateRange('2020-02-28', '2020-03-01', 3);
      expect(dates).toHaveLength(3);

      const parsedDates = dates.map(dateStr => moment(dateStr));
      parsedDates.forEach(date => {
        expect(date.isValid()).toBe(true);
      });
    });

    test('should handle timezone edge cases', () => {
      const date = new Date('2023-01-15T23:59:59');
      const formatted = dateManager.formatDate(date);
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });

    test('should handle invalid arithmetic operations', () => {
      expect(() => {
        dateManager.getDateDifference('invalid', '2023-01-01');
      }).not.toThrow();

      expect(() => {
        dateManager.getDateDifference(new Date('2023-01-01'), new Date('2022-12-31'));
      }).not.toThrow();
    });

    test('should handle boundary date values', () => {
      const veryEarlyDate = new Date('1970-01-01');
      const veryLateDate = new Date('2100-12-31');

      expect(() => {
        dateManager.formatDate(veryEarlyDate);
      }).not.toThrow();

      expect(() => {
        dateManager.formatDate(veryLateDate);
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of commits efficiently', async () => {
      const largeCommits = Array.from({ length: 1000 }, (_, i) => ({
        date: `2023-01-${String(i % 28 + 1).padStart(2, '0')}`,
        message: `Commit ${i}`
      }));

      const startTime = Date.now();
      const sorted = dateManager.sortCommitsByDate(largeCommits);
      const endTime = Date.now();

      expect(sorted).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle large date range generation efficiently', async () => {
      const startTime = Date.now();
      const dates = dateManager.generateDateRange('2020-01-01', '2030-01-01', 1000);
      const endTime = Date.now();

      expect(dates).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});