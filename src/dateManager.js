const moment = require('moment');
const logger = require('./utils/logger');

/**
 * Class used for date management
 */
class DateManager {
  constructor() {
    this.defaultFormat = 'YYYY-MM-DD';
  }

  /**
   * Validates date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {boolean} Whether valid date range
   */
  validateDateRange(startDate, endDate) {
    const start = moment(startDate, this.defaultFormat);
    const end = moment(endDate, this.defaultFormat);

    if (!start.isValid() || !end.isValid()) {
      return false;
    }

    return start.isSameOrBefore(end);
  }

  /**
   * Generates specified number of dates between start and end dates
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {number} count - Number of dates to generate
   * @param {Object} options - Options
   * @param {boolean} options.preserveOrder - Generate ordered dates
   * @param {boolean} options.randomize - Generate random dates
   * @param {string} options.timeFormat - Time format
   * @returns {Array<string>} Date list
   */
  generateDateRange(startDate, endDate, count, options = {}) {
    const {
      preserveOrder = true,
      randomize = false,
      timeFormat = 'YYYY-MM-DD HH:mm:ss'
    } = options;

    const start = moment(startDate, this.defaultFormat);
    const end = moment(endDate, this.defaultFormat);

    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
    }

    if (start.isAfter(end)) {
      throw new Error('Start date cannot be after end date.');
    }

    const totalMinutes = end.diff(start, 'minutes');
    const dates = [];

    if (preserveOrder) {
      // Generate ordered dates
      for (let i = 0; i < count; i++) {
        const progress = i / Math.max(count - 1, 1);
        const minutes = Math.floor(totalMinutes * progress);

        let targetDate = moment(start).add(minutes, 'minutes');

        // Add random variation (optional)
        if (randomize) {
          const variation = Math.floor(Math.random() * 60) - 30; // -30 to +30 minutes
          targetDate = targetDate.add(variation, 'minutes');
        }

        dates.push(targetDate.format(timeFormat));
      }
    } else {
      // Generate random dates
      for (let i = 0; i < count; i++) {
        const randomMinutes = Math.floor(Math.random() * totalMinutes);
        const targetDate = moment(start).add(randomMinutes, 'minutes');
        dates.push(targetDate.format(timeFormat));
      }
    }

    return dates;
  }

  /**
   * Filters commits before a specific date
   * @param {Array} commits - Commit list
   * @param {string} beforeDate - Commits before this date
   * @returns {Array} Filtered commit list
   */
  filterCommitsBefore(commits, beforeDate) {
    const before = moment(beforeDate, this.defaultFormat);

    if (!before.isValid()) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
    }

    return commits.filter(commit => {
      const commitDate = moment(commit.date);
      return commitDate.isBefore(before);
    });
  }

  /**
   * Filters commits after a specific date
   * @param {Array} commits - Commit list
   * @param {string} afterDate - Commits after this date
   * @returns {Array} Filtered commit list
   */
  filterCommitsAfter(commits, afterDate) {
    const after = moment(afterDate, this.defaultFormat);

    if (!after.isValid()) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
    }

    return commits.filter(commit => {
      const commitDate = moment(commit.date);
      return commitDate.isAfter(after);
    });
  }

  /**
   * Filters commits within a specific date range
   * @param {Array} commits - Commit list
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Array} Filtered commit list
   */
  filterCommitsBetween(commits, startDate, endDate) {
    const start = moment(startDate, this.defaultFormat);
    const end = moment(endDate, this.defaultFormat);

    if (!start.isValid() || !end.isValid()) {
      throw new Error('Invalid date format. Please use YYYY-MM-DD format.');
    }

    return commits.filter(commit => {
      const commitDate = moment(commit.date);
      return commitDate.isBetween(start, end, undefined, '[]'); // [] inclusive
    });
  }

  /**
   * Sorts commit list by time
   * @param {Array} commits - Commit list
   * @param {string} order - 'asc' or 'desc'
   * @returns {Array} Sorted commit list
   */
  sortCommitsByDate(commits, order = 'asc') {
    const sortedCommits = [...commits].sort((a, b) => {
      const dateA = moment(a.date);
      const dateB = moment(b.date);

      if (order === 'asc') {
        return dateA.diff(dateB);
      } else {
        return dateB.diff(dateA);
      }
    });

    return sortedCommits;
  }

  /**
   * Normalizes commit dates (brings to specific format)
   * @param {Array} commits - Commit list
   * @param {string} format - Target format
   * @returns {Array} Normalized commit list
   */
  normalizeCommitDates(commits, format = 'YYYY-MM-DD HH:mm:ss') {
    return commits.map(commit => ({
      ...commit,
      date: moment(commit.date).format(format),
      originalDate: commit.date
    }));
  }

  /**
   * Converts date to different formats
   * @param {string|Date} date - Date to convert
   * @param {string} format - Target format
   * @returns {string} Formatted date
   */
  formatDate(date, format = this.defaultFormat) {
    return moment(date).format(format);
  }

  /**
   * Converts date to ISO format
   * @param {string|Date} date - Date to convert
   * @returns {string} Date in ISO format
   */
  formatToISO(date) {
    return moment(date).toISOString();
  }

  /**
   * Converts to Git-compatible date format
   * @param {string|Date} date - Date to convert
   * @returns {string} Date in Git format
   */
  formatForGit(date) {
    return moment(date).format('YYYY-MM-DD HH:mm:ss ZZ');
  }

  /**
   * Creates timestamp
   * @param {string|Date} date - Date
   * @returns {number} Unix timestamp
   */
  getTimestamp(date) {
    return moment(date).unix();
  }

  /**
   * Calculates difference between two dates
   * @param {string|Date} date1 - First date
   * @param {string|Date} date2 - Second date
   * @param {string} unit - Unit ('days', 'hours', 'minutes', 'seconds')
   * @returns {number} Date difference
   */
  getDateDifference(date1, date2, unit = 'days') {
    return moment(date1).diff(moment(date2), unit);
  }

  /**
   * Analyzes commit days (which days commits were made)
   * @param {Array} commits - Commit list
   * @returns {Object} Commit count by day
   */
  analyzeCommitDays(commits) {
    const dayStats = {};

    commits.forEach(commit => {
      const day = moment(commit.date).format('YYYY-MM-DD');
      dayStats[day] = (dayStats[day] || 0) + 1;
    });

    return dayStats;
  }

  /**
   * Analyzes commit hours (which hours commits were made)
   * @param {Array} commits - Commit list
   * @returns {Object} Commit count by hour
   */
  analyzeCommitHours(commits) {
    const hourStats = {};

    commits.forEach(commit => {
      const hour = moment(commit.date).hour();
      hourStats[hour] = (hourStats[hour] || 0) + 1;
    });

    return hourStats;
  }

  /**
   * Makes date information human-readable
   * @param {string|Date} date - Date
   * @returns {string} Readable date
   */
  getHumanReadableDate(date) {
    return moment(date).fromNow();
  }
}

module.exports = DateManager;