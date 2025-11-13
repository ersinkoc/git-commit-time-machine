/**
 * Logger Test Suite - Comprehensive Tests for 100% Coverage
 * Tests for logging functionality including file operations and edge cases
 */

const { Logger } = require('../src/utils/logger');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Mock console methods to avoid actual console output during tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Mock console to capture output
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

describe('Logger', () => {
  let logger;
  let tempLogFile;
  let tempLogDir;

  beforeEach(async () => {
    tempLogDir = await fs.mkdtemp(path.join(os.tmpdir(), 'logger-test-'));
    tempLogFile = path.join(tempLogDir, 'test.log');

    logger = new Logger({
      level: 'debug',
      enableFileLogging: true,
      logFile: tempLogFile
    });

    // Wait for async initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    await fs.remove(tempLogDir);
  });

  describe('Constructor and Initialization', () => {
    test('should create instance with default options', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger.level).toBe('info');
      expect(defaultLogger.enableFileLogging).toBe(false);
    });

    test('should handle different log levels', () => {
      const debugLogger = new Logger({ level: 'debug', enableFileLogging: false });
      expect(debugLogger.level).toBe('debug');

      const errorLogger = new Logger({ level: 'error', enableFileLogging: false });
      expect(errorLogger.level).toBe('error');
    });

    test('should handle file logging disabled', () => {
      const noFileLogger = new Logger({ enableFileLogging: false });
      expect(noFileLogger.enableFileLogging).toBe(false);
    });

    test('should handle custom log file path', () => {
      const customLogger = new Logger({
        enableFileLogging: true,
        logFile: path.join(tempLogDir, 'custom.log')
      });
      expect(customLogger.logFile).toContain('custom.log');
    });

    test('should initialize log file synchronously', () => {
      const syncLogger = new Logger({
        level: 'info',
        enableFileLogging: true,
        logFile: tempLogFile
      });
      expect(syncLogger.logFile).toBe(tempLogFile);
    });
  });

  describe('Log Level Management', () => {
    test('should set log level dynamically', () => {
      logger.setLevel('warn');
      expect(logger.level).toBe('warn');

      logger.setLevel('info');
      expect(logger.level).toBe('info');
    });

    test('should handle invalid log levels gracefully', () => {
      const originalLevel = logger.level;
      logger.setLevel('invalid-level');
      expect(logger.level).toBe(originalLevel); // Should remain at original level
    });
  });

  describe('Core Logging Methods', () => {
    test('should log messages at different levels', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      expect(console.log).toHaveBeenCalledTimes(3); // debug, info, warn
      expect(console.error).toHaveBeenCalledTimes(1); // error
    });

    test('should filter messages based on log level', () => {
      logger.setLevel('warn');
      logger.debug('Debug message'); // Should not log
      logger.info('Info message');   // Should not log
      logger.warn('Warning message'); // Should log
      logger.error('Error message');  // Should log

      expect(console.log).toHaveBeenCalledTimes(1); // warn only
      expect(console.error).toHaveBeenCalledTimes(1); // error only
    });

    test('should handle null and undefined messages', () => {
      logger.setLevel('debug');
      console.log.mockClear(); // Clear the setLevel message
      logger.debug(null);
      logger.info(undefined);
      logger.warn('');

      expect(console.log).toHaveBeenCalledTimes(3);
    });

    test('should handle complex objects', () => {
      const complexObj = {
        id: 1,
        name: 'Test',
        array: [1, 2, 3],
        nested: { prop: 'value' }
      };

      logger.info(complexObj);
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('File Operations', () => {
    test('should write to log file', async () => {
      await logger.info('Test message for file');
      await new Promise(resolve => setTimeout(resolve, 200));

      const fileExists = await fs.pathExists(tempLogFile);
      expect(fileExists).toBe(true);
    });

    test('should clear log file', async () => {
      // Write some content first
      await logger.info('Test message');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Clear the file
      logger.clearLogFile();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check file content - should only contain the "Log file cleared" message
      const content = await fs.readFile(tempLogFile, 'utf8');
      expect(content.trim()).toContain('Log file cleared');
    });

    test('should get log file content', async () => {
      await logger.info('Test message 1');
      await logger.warn('Test message 2');
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = logger.getLogFileContent();
      expect(content).toContain('Test message 1');
      expect(content).toContain('Test message 2');
      expect(content).toContain('INFO');
      expect(content).toContain('WARN');
    });

    test('should handle get log file content when file does not exist', () => {
      const nonExistentFile = path.join(tempLogDir, 'non-existent.log');
      const fileLogger = new Logger({
        enableFileLogging: true,
        logFile: nonExistentFile
      });

      const content = fileLogger.getLogFileContent();
      expect(content).toContain('Git Commit Time Machine - Log File'); // Header is created
    });
  });

  describe('Specialized Logging Methods', () => {
    test('should log success messages', () => {
      const result = logger.success('Operation completed successfully');
      expect(result).toBeUndefined(); // Method returns undefined
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('should log title messages', () => {
      const result = logger.title('Main Title');
      expect(result).toBeUndefined();
      expect(console.log).toHaveBeenCalledTimes(3); // Top line, title, bottom line
    });

    test('should log subtitle messages', () => {
      const result = logger.subtitle('Subtitle text');
      expect(result).toBeUndefined();
      expect(console.log).toHaveBeenCalledTimes(3); // Top line, text, bottom line
    });

    test('should log new line', () => {
      const result = logger.newLine();
      expect(result).toBeUndefined();
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('List and Table Logging', () => {
    test('should log list with array of strings', () => {
      logger.list(['Item 1', 'Item 2', 'Item 3']);
      expect(console.log).toHaveBeenCalledTimes(4); // Header + 3 items
    });

    test('should log list with single string', () => {
      logger.list('Single string item');
      expect(console.log).toHaveBeenCalledTimes(2); // header + item
    });

    test('should log list with mixed data types', () => {
      logger.list(['Mixed', 123, true, null, undefined]);
      expect(console.log).toHaveBeenCalledTimes(6); // header + 5 items
    });

    test('should log table data', () => {
      const tableData = {
        headers: ['Name', 'Age', 'Status'],
        rows: [
          ['John', 30, 'Active'],
          ['Jane', 25, 'Inactive']
        ]
      };

      logger.table(tableData);
      expect(console.log).toHaveBeenCalledTimes(6); // header + 2 rows + borders
    });

    test('should handle table with non-array rows', () => {
      const invalidTable = {
        headers: ['Column1', 'Column2'],
        rows: 'invalid-rows-data'
      };

      logger.table(invalidTable);
      expect(console.log).toHaveBeenCalledTimes(5); // title + headers + separator + rows + empty line
    });

    test('should handle empty list and table', () => {
      logger.list([]);
      logger.table({ headers: [], rows: [] });
      expect(console.log).toHaveBeenCalledTimes(5); // List header + table title + headers + separator + empty line
    });
  });

  describe('Progress Indicator', () => {
    test('should log progress with all parameters', () => {
      logger.progress('Processing files...', 50, 100);
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('should handle progress with missing parameters', () => {
      logger.progress('Progress message');
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('should handle progress with only message and current', () => {
      logger.progress('Processing...', 75);
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle non-string items in list', () => {
      logger.list([
        'String item',
        123,
        true,
        null,
        undefined,
        { object: 'test' },
        ['array', 'item']
      ]);
      expect(console.log).toHaveBeenCalledTimes(8); // header + 7 items
    });

    test('should handle very long strings', () => {
      const longString = 'A'.repeat(1000);
      logger.info(longString);
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('should handle special characters', () => {
      const specialChars = 'Special chars: é à ö ü ß ñ ñ ¥ € © ® ™™';
      logger.info(specialChars);
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    test('should handle circular objects', () => {
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;

      logger.list([circularObj]);
      expect(console.log).toHaveBeenCalledTimes(2); // header + object representation
    });
  });

  describe('Performance Tests', () => {
    test('should handle rapid successive logging', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        logger.info(`Message ${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('File Logging Edge Cases', () => {
    test('should handle concurrent file operations', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(logger.info(`Concurrent message ${i}`));
      }

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 500));

      const content = await fs.readFile(tempLogFile, 'utf8');
      expect(content).toContain('Concurrent message');
    });

    test('should handle very large messages', async () => {
      const largeMessage = 'X'.repeat(10000);
      await logger.info(largeMessage);
      await new Promise(resolve => setTimeout(resolve, 200));

      const content = await fs.readFile(tempLogFile, 'utf8');
      expect(content.length).toBeGreaterThan(10000);
    });
  });

  describe('Format Message Edge Cases', () => {
    test('should handle all log levels including custom ones', () => {
      const levels = ['debug', 'info', 'warn', 'error', 'success', 'title', 'subtitle'];

      levels.forEach(level => {
        if (typeof logger[level] === 'function') {
          logger[level](`Test ${level} message`);
        }
      });

      expect(console.log).toHaveBeenCalledTimes(10); // debug(1) + info(1) + warn(1) + success(1) + title(3) + subtitle(3) = 10
    });

    test('should handle message formatting with special cases', () => {
      logger.info('Message with \n newlines');
      logger.info('Message with \t tabs');
      logger.info('Message with "quotes"');
      expect(console.log).toHaveBeenCalledTimes(3);
    });

    test('should handle date formatting', () => {
      const testDate = new Date('2023-01-01T12:00:00.000Z');
      logger.info(`Message with date: ${testDate.toISOString()}`);
      expect(console.log).toHaveBeenCalledTimes(1);
    });
  });

  describe('Logger Class Properties', () => {
    test('should have expected properties', () => {
      expect(logger).toHaveProperty('level');
      expect(logger).toHaveProperty('enableFileLogging');
      expect(logger).toHaveProperty('logFile');
    });

    test('should allow property access', () => {
      expect(typeof logger.level).toBe('string');
      expect(typeof logger.enableFileLogging).toBe('boolean');
      expect(typeof logger.logFile).toBe('string');
    });
  });
});

module.exports = { Logger };