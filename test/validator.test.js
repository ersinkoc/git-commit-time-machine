/**
 * Validator - Comprehensive Tests
 * Tests for data validation utilities
 */

const Validator = require('../src/utils/validator');

describe('Validator', () => {
  describe('isEmpty', () => {
    test('should identify empty values', () => {
      expect(Validator.isEmpty(null)).toBe(true);
      expect(Validator.isEmpty(undefined)).toBe(true);
      expect(Validator.isEmpty('')).toBe(true);
      expect(Validator.isEmpty([])).toBe(true);
      expect(Validator.isEmpty({})).toBe(true);
    });

    test('should identify non-empty values', () => {
      expect(Validator.isEmpty('text')).toBe(false);
      expect(Validator.isEmpty([1, 2, 3])).toBe(false);
      expect(Validator.isEmpty({ key: 'value' })).toBe(false);
      expect(Validator.isEmpty(0)).toBe(false);
      expect(Validator.isEmpty(false)).toBe(false);
    });
  });

  describe('isValidString', () => {
    test('should validate strings with content', () => {
      expect(Validator.isValidString('hello')).toBe(true);
      expect(Validator.isValidString('  hello world  ')).toBe(true);
      expect(Validator.isValidString('a')).toBe(true);
    });

    test('should reject invalid strings', () => {
      expect(Validator.isValidString('')).toBe(false);
      expect(Validator.isValidString('   ')).toBe(false);
      expect(Validator.isValidString(null)).toBe(false);
      expect(Validator.isValidString(undefined)).toBe(false);
      expect(Validator.isValidString(123)).toBe(false);
      expect(Validator.isValidString([])).toBe(false);
      expect(Validator.isValidString({})).toBe(false);
    });
  });

  describe('isValidDate', () => {
    test('should validate valid dates', () => {
      expect(Validator.isValidDate('2023-01-01')).toBe(true);
      expect(Validator.isValidDate('2023-01-01T12:00:00Z')).toBe(true);
      expect(Validator.isValidDate(new Date())).toBe(true);
      expect(Validator.isValidDate('2023/01/01')).toBe(true);
    });

    test('should reject invalid dates', () => {
      expect(Validator.isValidDate('')).toBe(false);
      expect(Validator.isValidDate(null)).toBe(false);
      expect(Validator.isValidDate(undefined)).toBe(false);
      expect(Validator.isValidDate('not-a-date')).toBe(false);
      expect(Validator.isValidDate('2023-13-01')).toBe(false);
      expect(Validator.isValidDate('2023-02-30')).toBe(false);
    });
  });

  describe('isValidDateFormat', () => {
    test('should validate correct date format', () => {
      expect(Validator.isValidDateFormat('2023-01-01', 'YYYY-MM-DD')).toBe(true);
      expect(Validator.isValidDateFormat('01/01/2023', 'DD/MM/YYYY')).toBe(true);
      expect(Validator.isValidDateFormat('2023-01-01T12:30:45', 'YYYY-MM-DDTHH:mm:ss')).toBe(true);
    });

    test('should reject incorrect date format', () => {
      expect(Validator.isValidDateFormat('01/01/2023', 'YYYY-MM-DD')).toBe(false);
      expect(Validator.isValidDateFormat('2023-01-01', 'DD/MM/YYYY')).toBe(false);
      expect(Validator.isValidDateFormat('not-a-date')).toBe(false);
    });

    test('should use default format when not specified', () => {
      expect(Validator.isValidDateFormat('2023-01-01')).toBe(true);
      expect(Validator.isValidDateFormat('01/01/2023')).toBe(false);
    });
  });

  describe('isValidGitHash', () => {
    test('should validate valid git hashes', () => {
      expect(Validator.isValidGitHash('a1b2c3d')).toBe(true);
      expect(Validator.isValidGitHash('A1B2C3D')).toBe(true);
      expect(Validator.isValidGitHash('abcdef1234567890abcdef1234567890abcdef12')).toBe(true);
      expect(Validator.isValidGitHash('ABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(true);
    });

    test('should reject invalid git hashes', () => {
      expect(Validator.isValidGitHash('')).toBe(false);
      expect(Validator.isValidGitHash(null)).toBe(false);
      expect(Validator.isValidGitHash(undefined)).toBe(false);
      expect(Validator.isValidGitHash('short')).toBe(false);
      expect(Validator.isValidGitHash('g123456')).toBe(false); // invalid hex character
      expect(Validator.isValidGitHash(123)).toBe(false);
      expect(Validator.isValidGitHash([])).toBe(false);
      expect(Validator.isValidGitHash({})).toBe(false);
    });

    test('should reject hashes that are too long or too short', () => {
      expect(Validator.isValidGitHash('abcdef')).toBe(false); // 6 chars
      expect(Validator.isValidGitHash('abcdef1234567890abcdef1234567890abcdef123')).toBe(false); // 41 chars
    });
  });

  describe('isValidEmail', () => {
    test('should validate valid email addresses', () => {
      expect(Validator.isValidEmail('user@example.com')).toBe(true);
      expect(Validator.isValidEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(Validator.isValidEmail('user123@test-domain.org')).toBe(true);
      expect(Validator.isValidEmail('firstname.lastname@company.com')).toBe(true);
    });

    test('should reject invalid email addresses', () => {
      expect(Validator.isValidEmail('')).toBe(false);
      expect(Validator.isValidEmail(null)).toBe(false);
      expect(Validator.isValidEmail(undefined)).toBe(false);
      expect(Validator.isValidEmail('not-an-email')).toBe(false);
      expect(Validator.isValidEmail('@domain.com')).toBe(false);
      expect(Validator.isValidEmail('user@')).toBe(false);
      expect(Validator.isValidEmail('user@domain')).toBe(false);
      expect(Validator.isValidEmail('user domain.com')).toBe(false);
      expect(Validator.isValidEmail(123)).toBe(false);
    });
  });

  describe('isValidPath', () => {
    test('should validate valid file paths', () => {
      expect(Validator.isValidPath('/path/to/file')).toBe(true);
      expect(Validator.isValidPath('C:\\Windows\\System32')).toBe(true);
      expect(Validator.isValidPath('relative/path/file.txt')).toBe(true);
      expect(Validator.isValidPath('D:\\Data\\file.txt')).toBe(true);
      expect(Validator.isValidPath('./current/directory')).toBe(true);
      expect(Validator.isValidPath('../parent/directory')).toBe(true);
    });

    test('should reject paths with invalid characters', () => {
      expect(Validator.isValidPath('path<with>brackets')).toBe(false);
      expect(Validator.isValidPath('path"with"quotes')).toBe(false);
      expect(Validator.isValidPath('path|with|pipes')).toBe(false);
      expect(Validator.isValidPath('path?with?questions')).toBe(false);
      expect(Validator.isValidPath('path*with*asterisks')).toBe(false);
    });

    test('should handle colons correctly', () => {
      expect(Validator.isValidPath('C:\\valid\\drive')).toBe(true);
      expect(Validator.isValidPath('D:/another/drive')).toBe(true);
      expect(Validator.isValidPath('path:with:colons')).toBe(false);
      expect(Validator.isValidPath('invalid:colon:placement')).toBe(false);
    });

    test('should reject empty and invalid inputs', () => {
      expect(Validator.isValidPath('')).toBe(false);
      expect(Validator.isValidPath(null)).toBe(false);
      expect(Validator.isValidPath(undefined)).toBe(false);
      expect(Validator.isValidPath(123)).toBe(false);
    });
  });

  describe('isNumber', () => {
    test('should validate numbers', () => {
      expect(Validator.isNumber(123)).toBe(true);
      expect(Validator.isNumber(123.456)).toBe(true);
      expect(Validator.isNumber(-123)).toBe(true);
      expect(Validator.isNumber(0)).toBe(true);
      expect(Validator.isNumber('123')).toBe(true);
      expect(Validator.isNumber('123.456')).toBe(true);
      expect(Validator.isNumber('-123')).toBe(true);
    });

    test('should reject non-numbers', () => {
      expect(Validator.isNumber('')).toBe(false);
      expect(Validator.isNumber('abc')).toBe(false);
      expect(Validator.isNumber('123abc')).toBe(false);
      expect(Validator.isNumber(NaN)).toBe(false);
      expect(Validator.isNumber(null)).toBe(false);
      expect(Validator.isNumber(undefined)).toBe(false);
      expect(Validator.isNumber([])).toBe(false);
      expect(Validator.isNumber({})).toBe(false);
    });
  });

  describe('isPositiveNumber', () => {
    test('should validate positive numbers', () => {
      expect(Validator.isPositiveNumber(123)).toBe(true);
      expect(Validator.isPositiveNumber(123.456)).toBe(true);
      expect(Validator.isPositiveNumber(0.1)).toBe(true);
      expect(Validator.isPositiveNumber('123')).toBe(true);
      expect(Validator.isPositiveNumber('123.456')).toBe(true);
    });

    test('should reject non-positive numbers', () => {
      expect(Validator.isPositiveNumber(0)).toBe(false);
      expect(Validator.isPositiveNumber(-123)).toBe(false);
      expect(Validator.isPositiveNumber('-123')).toBe(false);
      expect(Validator.isPositiveNumber('abc')).toBe(false);
      expect(Validator.isPositiveNumber(null)).toBe(false);
      expect(Validator.isPositiveNumber(undefined)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    test('should validate valid URLs', () => {
      expect(Validator.isValidUrl('https://www.example.com')).toBe(true);
      expect(Validator.isValidUrl('http://example.com')).toBe(true);
      expect(Validator.isValidUrl('https://api.example.com/v1/users')).toBe(true);
      expect(Validator.isValidUrl('ftp://files.example.com')).toBe(true);
      expect(Validator.isValidUrl('ws://websocket.example.com')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(Validator.isValidUrl('')).toBe(false);
      expect(Validator.isValidUrl(null)).toBe(false);
      expect(Validator.isValidUrl(undefined)).toBe(false);
      expect(Validator.isValidUrl('not-a-url')).toBe(false);
      expect(Validator.isValidUrl('www.example.com')).toBe(false); // missing protocol
      expect(Validator.isValidUrl('example.com')).toBe(false); // missing protocol
      expect(Validator.isValidUrl('http://')).toBe(false);
    });
  });

  describe('isValidRegex', () => {
    test('should validate valid regex patterns', () => {
      expect(Validator.isValidRegex('\\d+')).toBe(true);
      expect(Validator.isValidRegex('[a-z]+')).toBe(true);
      expect(Validator.isValidRegex('^(test|example)$')).toBe(true);
      expect(Validator.isValidRegex('\\w+@\\w+\\.\\w+')).toBe(true);
      expect(Validator.isValidRegex('test')).toBe(true);
    });

    test('should reject invalid regex patterns', () => {
      expect(Validator.isValidRegex('')).toBe(false);
      expect(Validator.isValidUrl(null)).toBe(false);
      expect(Validator.isValidUrl(undefined)).toBe(false);
      expect(Validator.isValidRegex('[')).toBe(false);
      expect(Validator.isValidRegex('(')).toBe(false);
      expect(Validator.isValidRegex('\\')).toBe(false);
    });

    test('should handle RegExp objects', () => {
      expect(Validator.isValidRegex(/\\d+/)).toBe(true);
      expect(Validator.isValidRegex(/[a-z]+/i)).toBe(true);
      expect(Validator.isValidRegex(/^(test|example)$/)).toBe(true);
    });
  });

  describe('validateDateRange', () => {
    test('should validate valid date range', () => {
      const result = Validator.validateDateRange('2023-01-01', '2023-12-31');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject when start date is after end date', () => {
      const result = Validator.validateDateRange('2023-12-31', '2023-01-01');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date cannot be after end date');
    });

    test('should reject invalid dates', () => {
      const result1 = Validator.validateDateRange('invalid-date', '2023-01-01');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Start date is invalid');

      const result2 = Validator.validateDateRange('2023-01-01', 'invalid-date');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('End date is invalid');

      const result3 = Validator.validateDateRange('invalid-start', 'invalid-end');
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Start date is invalid');
      expect(result3.errors).toContain('End date is invalid');
    });
  });

  describe('validateCommitOptions', () => {
    test('should validate valid commit options', () => {
      const options = {
        commitId: 'a1b2c3d',
        newMessage: 'Fix bug in authentication'
      };
      const result = Validator.validateCommitOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid commit options object', () => {
      const result1 = Validator.validateCommitOptions(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Options object must be specified');

      const result2 = Validator.validateCommitOptions('string');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Options object must be specified');
    });

    test('should reject invalid commit hash', () => {
      const options = {
        commitId: 'invalid-hash',
        newMessage: 'Valid message'
      };
      const result = Validator.validateCommitOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Valid commit hash must be specified');
    });

    test('should reject empty commit message', () => {
      const options = {
        commitId: 'a1b2c3d',
        newMessage: '   ' // empty after trim
      };
      const result = Validator.validateCommitOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Commit message cannot be empty');
    });

    test('should reject invalid date range', () => {
      const options = {
        startDate: '2023-12-31',
        endDate: '2023-01-01'
      };
      const result = Validator.validateCommitOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start date cannot be after end date');
    });

    test('should reject invalid limit', () => {
      const options = {
        limit: -5
      };
      const result = Validator.validateCommitOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Limit must be a positive number');
    });
  });

  describe('validateReplacements', () => {
    test('should validate valid replacements', () => {
      const replacements = [
        { pattern: 'old-text', replacement: 'new-text' },
        { pattern: /\\d+/, replacement: 'NUM' },
        { pattern: 'test', replacement: 'replacement' }
      ];
      const result = Validator.validateReplacements(replacements);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject non-array replacements', () => {
      const result1 = Validator.validateReplacements('not-array');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Replacement patterns must be an array');

      const result2 = Validator.validateReplacements(null);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Replacement patterns must be an array');
    });

    test('should reject empty replacements array', () => {
      const result = Validator.validateReplacements([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one replacement pattern must be specified');
    });

    test('should reject replacements missing pattern', () => {
      const replacements = [
        { replacement: 'text' },
        { pattern: 'valid', replacement: 'replacement' }
      ];
      const result = Validator.validateReplacements(replacements);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('1. replacement pattern must specify pattern');
    });

    test('should reject replacements missing replacement', () => {
      const replacements = [
        { pattern: 'text' },
        { pattern: 'valid', replacement: 'replacement' }
      ];
      const result = Validator.validateReplacements(replacements);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('1. replacement pattern must specify replacement');
    });

    test('should reject empty string patterns', () => {
      const replacements = [
        { pattern: '', replacement: 'text' }
      ];
      const result = Validator.validateReplacements(replacements);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('1. replacement pattern cannot be empty');
    });

    test('should reject invalid regex patterns', () => {
      // Test that isValidRegex properly validates regex patterns
      expect(Validator.isValidRegex('[')).toBe(false);
      expect(Validator.isValidRegex('(')).toBe(false);
      expect(Validator.isValidRegex('\\')).toBe(false);
    });
  });

  describe('validateEnvKeys', () => {
    test('should validate valid .env keys', () => {
      const keys = ['API_KEY', 'DB_PASSWORD', 'NODE_ENV', 'APP_VERSION_2'];
      const result = Validator.validateEnvKeys(keys);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject non-array keys', () => {
      const result1 = Validator.validateEnvKeys('not-array');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Keys must be an array');

      const result2 = Validator.validateEnvKeys(null);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Keys must be an array');
    });

    test('should reject invalid .env key formats', () => {
      const keys = ['invalid-key', 'ANOTHER INVALID', '123_STARTS_WITH_NUMBER', 'has-dash'];
      const result = Validator.validateEnvKeys(keys);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors[0]).toContain('1. key (invalid-key) is not a valid .env key');
      expect(result.errors[1]).toContain('2. key (ANOTHER INVALID) is not a valid .env key');
      expect(result.errors[2]).toContain('3. key (123_STARTS_WITH_NUMBER) is not a valid .env key');
      expect(result.errors[3]).toContain('4. key (has-dash) is not a valid .env key');
    });

    test('should reject empty keys', () => {
      const keys = ['VALID_KEY', '', 'ANOTHER_VALID'];
      const result = Validator.validateEnvKeys(keys);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('2. key cannot be empty');
    });
  });

  describe('validateSanitizeOptions', () => {
    test('should validate valid sanitize options', () => {
      const options = {
        patterns: ['email', /\\d+/],
        replacement: '[REDACTED]'
      };
      const result = Validator.validateSanitizeOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid options object', () => {
      const result1 = Validator.validateSanitizeOptions(null);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Cleanup options must be specified');

      const result2 = Validator.validateSanitizeOptions('string');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Cleanup options must be specified');
    });

    test('should reject missing patterns', () => {
      const options = {
        replacement: '[REDACTED]'
      };
      const result = Validator.validateSanitizeOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one pattern must be specified');
    });

    test('should reject empty patterns array', () => {
      const options = {
        patterns: [],
        replacement: '[REDACTED]'
      };
      const result = Validator.validateSanitizeOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one pattern must be specified');
    });

    test('should reject empty replacement', () => {
      const options = {
        patterns: ['test'],
        replacement: ''
      };
      const result = Validator.validateSanitizeOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Replacement text cannot be empty');
    });

    test('should reject invalid patterns', () => {
      // Since we can't create invalid RegExp objects without throwing,
      // we test the isValidRegex method directly instead
      expect(Validator.isValidRegex('[invalid')).toBe(false);
      expect(Validator.isValidRegex('(unclosed')).toBe(false);
    });
  });

  describe('validateBackupOptions', () => {
    test('should validate valid backup options', () => {
      const options = {
        backupId: 'backup-2023-01-01',
        maxAge: 30,
        keepCount: 10
      };
      const result = Validator.validateBackupOptions(options);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject empty backup ID', () => {
      const options = {
        backupId: '   ', // empty after trim
        maxAge: 30
      };
      const result = Validator.validateBackupOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Backup ID cannot be empty');
    });

    test('should reject negative max age', () => {
      const options = {
        maxAge: -5
      };
      const result = Validator.validateBackupOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Maximum age must be a positive number');
    });

    test('should reject non-positive keep count', () => {
      const options = {
        keepCount: 0 // zero is not positive
      };
      const result = Validator.validateBackupOptions(options);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Number of backups to keep must be a positive number');
    });
  });

  describe('validateRepoPath', () => {
    test('should validate valid repository path', () => {
      const result1 = Validator.validateRepoPath('/path/to/repo');
      expect(result1.isValid).toBe(true);

      const result2 = Validator.validateRepoPath('C:\\Users\\Project');
      expect(result2.isValid).toBe(true);
    });

    test('should reject empty repository path', () => {
      const result1 = Validator.validateRepoPath('');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Repository path cannot be empty');

      const result2 = Validator.validateRepoPath(null);
      expect(result2.isValid).toBe(false);

      const result3 = Validator.validateRepoPath(undefined);
      expect(result3.isValid).toBe(false);
    });

    test('should reject invalid repository path', () => {
      const result1 = Validator.validateRepoPath('invalid<path');
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Invalid repository path');

      const result2 = Validator.validateRepoPath('path:with:colons');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Invalid repository path');
    });
  });

  describe('isValidJSON', () => {
    test('should validate valid JSON strings', () => {
      expect(Validator.isValidJSON('{"key": "value"}')).toBe(true);
      expect(Validator.isValidJSON('[1, 2, 3]')).toBe(true);
      expect(Validator.isValidJSON('"string"')).toBe(true);
      expect(Validator.isValidJSON('123')).toBe(true);
      expect(Validator.isValidJSON('true')).toBe(true);
      expect(Validator.isValidJSON('null')).toBe(true);
    });

    test('should validate non-string data', () => {
      expect(Validator.isValidJSON({ key: 'value' })).toBe(true);
      expect(Validator.isValidJSON([1, 2, 3])).toBe(true);
      expect(Validator.isValidJSON(123)).toBe(true);
      expect(Validator.isValidJSON(true)).toBe(true);
    });

    test('should reject invalid JSON', () => {
      expect(Validator.isValidJSON('{key: value}')).toBe(false); // missing quotes
      expect(Validator.isValidJSON('{key: "value",}')).toBe(false); // trailing comma
      expect(Validator.isValidJSON('not json')).toBe(false);
      expect(Validator.isValidJSON('undefined')).toBe(false);
    });
  });

  describe('validateObject', () => {
    test('should validate valid object against schema', () => {
      const obj = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        isActive: true,
        tags: ['developer', 'javascript']
      };

      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
        email: { type: 'string', required: false },
        isActive: { type: 'boolean', required: false },
        tags: { type: 'array', required: false }
      };

      const result = Validator.validateObject(obj, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject non-object input', () => {
      const schema = { name: { type: 'string', required: true } };

      const result1 = Validator.validateObject(null, schema);
      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Valid object must be specified');

      const result2 = Validator.validateObject('string', schema);
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Valid object must be specified');

      const result3 = Validator.validateObject(123, schema);
      expect(result3.isValid).toBe(false);
      expect(result3.errors).toContain('Valid object must be specified');
    });

    test('should reject missing required fields', () => {
      const obj = { name: 'John' }; // missing required age
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true }
      };

      const result = Validator.validateObject(obj, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('age field is required');
    });

    test('should reject incorrect field types', () => {
      const obj = {
        name: 123, // should be string
        age: '30', // should be number
        isActive: 'true' // should be boolean
      };

      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: true },
        isActive: { type: 'boolean', required: true }
      };

      const result = Validator.validateObject(obj, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('name field must be string');
      expect(result.errors).toContain('age field must be number');
      expect(result.errors).toContain('isActive field must be boolean');
    });

    test('should handle optional fields', () => {
      const obj = { name: 'John' };
      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false } // optional
      };

      const result = Validator.validateObject(obj, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should allow undefined for optional fields but validate present values', () => {
      const obj = {
        name: 'John',
        age: undefined,
        email: undefined
      };

      const schema = {
        name: { type: 'string', required: true },
        age: { type: 'number', required: false },
        email: { type: 'string', required: false }
      };

      const result = Validator.validateObject(obj, schema);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should validate array and object types', () => {
      const obj = {
        tags: 'not-array', // should be array
        metadata: 'not-object' // should be object
      };

      const schema = {
        tags: { type: 'array', required: true },
        metadata: { type: 'object', required: true }
      };

      const result = Validator.validateObject(obj, schema);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('tags field must be array');
      expect(result.errors).toContain('metadata field must be object');
    });
  });

  describe('Integration Tests', () => {
    test('should validate complex real-world scenarios', () => {
      // Test commit options with date range
      const commitOptions = {
        commitId: 'a1b2c3d4e5f6',
        newMessage: 'Fix authentication bug',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        limit: 10
      };

      const commitResult = Validator.validateCommitOptions(commitOptions);
      expect(commitResult.isValid).toBe(true);

      // Test replacements with mixed patterns
      const replacements = [
        { pattern: 'old-api-key', replacement: '***' },
        { pattern: /\\b\\d{4}-\\d{2}-\\d{2}\\b/, replacement: '[DATE]' },
        { pattern: 'user@example.com', replacement: '[EMAIL]' }
      ];

      const replacementsResult = Validator.validateReplacements(replacements);
      expect(replacementsResult.isValid).toBe(true);

      // Test backup options
      const backupOptions = {
        backupId: 'backup-2023-01-01T12-00-00-abc123',
        maxAge: 30,
        keepCount: 5
      };

      const backupResult = Validator.validateBackupOptions(backupOptions);
      expect(backupResult.isValid).toBe(true);
    });

    test('should handle edge cases and invalid combinations', () => {
      // Test invalid commit options
      const invalidCommitOptions = {
        commitId: 'invalid-hash',
        newMessage: '',
        startDate: '2023-12-31',
        endDate: '2023-01-01',
        limit: -5
      };

      const invalidCommitResult = Validator.validateCommitOptions(invalidCommitOptions);
      expect(invalidCommitResult.isValid).toBe(false);
      expect(invalidCommitResult.errors.length).toBeGreaterThan(2); // multiple errors

      // Test invalid replacements
      const invalidReplacements = [
        { replacement: 'missing-pattern' },
        { pattern: '', replacement: '' },
        { pattern: '[invalid', replacement: 'invalid-regex' }
      ];

      const invalidReplacementsResult = Validator.validateReplacements(invalidReplacements);
      expect(invalidReplacementsResult.isValid).toBe(false);
      expect(invalidReplacementsResult.errors.length).toBe(4); // multiple errors
    });
  });
});