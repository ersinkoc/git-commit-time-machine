const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

/**
 * Logging class
 */
class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.enableFileLogging = options.enableFileLogging !== false;
    this.logFile = options.logFile || '.gctm-logs.txt';

    // Log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Current level
    this.currentLevel = this.levels[this.logLevel] || this.levels.info;

    // Create log file synchronously to avoid async in constructor
    if (this.enableFileLogging) {
      this.initializeLogFileSync();
    }
  }

  /**
   * Initializes log file synchronously (for constructor)
   */
  initializeLogFileSync() {
    try {
      const logDir = path.dirname(this.logFile);
      fs.ensureDirSync(logDir);

      // Add header
      if (!fs.pathExistsSync(this.logFile)) {
        const header = `# Git Commit Time Machine - Log File\n# Created: ${new Date().toISOString()}\n\n`;
        fs.appendFileSync(this.logFile, header);
      }
    } catch (error) {
      console.warn('Could not create log file:', error.message);
    }
  }

  /**
   * Initializes log file (async version for manual initialization)
   */
  async initializeLogFile() {
    try {
      const logDir = path.dirname(this.logFile);
      await fs.ensureDir(logDir);

      // Add header
      if (!(await fs.pathExists(this.logFile))) {
        const header = `# Git Commit Time Machine - Log File\n# Created: ${new Date().toISOString()}\n\n`;
        await fs.appendFile(this.logFile, header);
      }
    } catch (error) {
      console.warn('Could not create log file:', error.message);
    }
  }

  /**
   * Writes to log file synchronously (prevents race conditions)
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  writeToFileSync(level, message) {
    if (!this.enableFileLogging) return;

    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      // Silently fail to avoid infinite loop if logger fails
    }
  }

  /**
   * Writes to log file (async version - kept for backward compatibility)
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  async writeToFile(level, message) {
    if (!this.enableFileLogging) return;

    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
      await fs.appendFile(this.logFile, logEntry);
    } catch (error) {
      console.warn('Could not write to log file:', error.message);
    }
  }

  /**
   * Formats message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @returns {string} Formatted message
   */
  formatMessage(level, message) {
    const timestamp = new Date().toLocaleTimeString();

    switch (level) {
      case 'error':
        return `${chalk.red('[ERROR]')} ${chalk.gray(timestamp)} ${message}`;
      case 'warn':
        return `${chalk.yellow('[WARN]')} ${chalk.gray(timestamp)} ${message}`;
      case 'info':
        return `${chalk.blue('[INFO]')} ${chalk.gray(timestamp)} ${message}`;
      case 'debug':
        return `${chalk.gray('[DEBUG]')} ${chalk.gray(timestamp)} ${message}`;
      default:
        return `[${level.toUpperCase()}] ${timestamp} ${message}`;
    }
  }

  /**
   * Logs message
   * @param {string} level - Log level
   * @param {string} message - Message
   */
  log(level, message) {
    // Level check
    if (this.levels[level] > this.currentLevel) {
      return;
    }

    // Write to console
    const formattedMessage = this.formatMessage(level, message);
    console.log(formattedMessage);

    // Write to file synchronously (prevents race conditions and data loss)
    this.writeToFileSync(level, message);
  }

  /**
   * Error log
   * @param {string} message - Error message
   */
  error(message) {
    this.log('error', message);
  }

  /**
   * Warning log
   * @param {string} message - Warning message
   */
  warn(message) {
    this.log('warn', message);
  }

  /**
   * Info log
   * @param {string} message - Info message
   */
  info(message) {
    this.log('info', message);
  }

  /**
   * Debug log
   * @param {string} message - Debug message
   */
  debug(message) {
    this.log('debug', message);
  }

  /**
   * Success message
   * @param {string} message - Message
   */
  success(message) {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `${chalk.green('[SUCCESS]')} ${chalk.gray(timestamp)} ${message}`;
    console.log(formattedMessage);
    this.writeToFileSync('info', `SUCCESS: ${message}`);
  }

  /**
   * Title message
   * @param {string} title - Title
   */
  title(title) {
    const line = '='.repeat(50);
    console.log(chalk.cyan(line));
    console.log(chalk.cyan(title));
    console.log(chalk.cyan(line));
    this.writeToFileSync('info', `TITLE: ${title}`);
  }

  /**
   * Subtitle message
   * @param {string} title - Subtitle
   */
  subtitle(title) {
    const line = '-'.repeat(30);
    console.log(chalk.magenta(line));
    console.log(chalk.magenta(title));
    console.log(chalk.magenta(line));
    this.writeToFileSync('info', `SUBTITLE: ${title}`);
  }

  /**
   * List logging
   * @param {Array} items - List items
   * @param {string} title - List title
   */
  list(items, title = 'List') {
    console.log(chalk.blue(`${title}:`));

    items.forEach((item, index) => {
      if (typeof item === 'string') {
        console.log(chalk.gray(`  ${index + 1}. ${item}`));
      } else {
        console.log(chalk.gray(`  ${index + 1}. ${JSON.stringify(item, null, 2)}`));
      }
    });

    this.writeToFileSync('info', `${title}: ${JSON.stringify(items)}`);
  }

  /**
   * Progress indicator
   * @param {number} current - Current value
   * @param {number} total - Total value
   * @param {string} message - Message
   */
  progress(current, total, message) {
    const percentage = Math.round((current / total) * 100);
    const barLength = 20;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    console.log(
      `${chalk.blue('PROGRESS')} ${chalk.gray(`[${bar}]`)} ${chalk.green(percentage + '%')} ` +
      `(${current}/${total}) ${chalk.gray(message)}`
    );

    this.writeToFileSync('info', `PROGRESS: ${percentage}% (${current}/${total}) ${message}`);
  }

  /**
   * Table logging
   * @param {Array} headers - Column headers
   * @param {Array} rows - Rows
   * @param {string} title - Table title
   */
  table(headers, rows, title = 'Table') {
    console.log(chalk.blue(title + ':'));

    // Write headers
    const headerRow = headers.map(h => chalk.bold(h)).join(' | ');
    console.log(chalk.cyan(headerRow));

    // Separator line
    const separator = headers.map(() => '-'.repeat(15)).join('-+-');
    console.log(chalk.gray(separator));

    // Write rows
    rows.forEach(row => {
      const rowStr = Array.isArray(row) ? row.join(' | ') : JSON.stringify(row);
      console.log('  ' + rowStr);
    });

    console.log('');

    this.writeToFileSync('info', `${title}: ${JSON.stringify({ headers, rows })}`);
  }

  /**
   * Add empty line
   */
  newLine() {
    console.log('');
  }

  /**
   * Change log level
   * @param {string} level - New log level
   */
  setLevel(level) {
    if (level in this.levels) {
      this.logLevel = level;
      this.currentLevel = this.levels[level];
      this.info(`Log level changed to: ${level}`);
    }
  }

  /**
   * Clear log file
   */
  async clearLogFile() {
    if (!this.enableFileLogging) return;

    try {
      await fs.remove(this.logFile);
      await this.initializeLogFile();
      this.info('Log file cleared');
    } catch (error) {
      this.warn('Could not clear log file: ' + error.message);
    }
  }

  /**
   * Gets log file content
   * @returns {Promise<string>} Log file content
   */
  async getLogFileContent() {
    if (!this.enableFileLogging) return '';

    try {
      if (await fs.pathExists(this.logFile)) {
        return await fs.readFile(this.logFile, 'utf8');
      }
    } catch (error) {
      this.warn('Could not read log file: ' + error.message);
    }

    return '';
  }
}

// Default logger instance
const logger = new Logger();

module.exports = logger;