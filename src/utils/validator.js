const moment = require('moment');

/**
 * Data validation helper class
 */
class Validator {
  /**
   * Checks if a value is empty
   * @param {any} value - Value to check
   * @returns {boolean} Whether empty
   */
  static isEmpty(value) {
    return value === null || value === undefined || value === '' ||
           (Array.isArray(value) && value.length === 0) ||
           (typeof value === 'object' && Object.keys(value).length === 0);
  }

  /**
   * Checks if a string is valid
   * @param {any} value - Value to check
   * @returns {boolean} Whether valid string
   */
  static isValidString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Checks if a date is valid
   * @param {string|Date} date - Kontrol edilecek tarih
   * @returns {boolean} Whether valid date
   */
  static isValidDate(date) {
    if (!date) return false;

    const dateObj = moment(date);
    return dateObj.isValid();
  }

  /**
   * Validates date format
   * @param {string} date - Kontrol edilecek tarih
   * @param {string} format - Beklenen format
   * @returns {boolean} Whether format is correct
   */
  static isValidDateFormat(date, format = 'YYYY-MM-DD') {
    if (!date) return false;

    const dateObj = moment(date, format, true);
    return dateObj.isValid();
  }

  /**
   * Validates Git commit hash
   * @param {string} hash - Kontrol edilecek hash
   * @returns {boolean} Whether valid hash
   */
  static isValidGitHash(hash) {
    if (!hash || typeof hash !== 'string') return false;

    // Short hash (7 characters) or full hash (40 characters)
    return /^[a-f0-9]{7,40}$/i.test(hash);
  }

  /**
   * Validates email address
   * @param {string} email - Kontrol edilecek e-posta
   * @returns {boolean} Whether valid email
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;

    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Validates file path
   * @param {string} path - Kontrol edilecek dosya yolu
   * @returns {boolean} Whether valid file path
   */
  static isValidPath(path) {
    if (!path || typeof path !== 'string') return false;

    // Enhanced path validation that handles Windows paths
    // Allow colons only for drive letters (C:\) and exclude invalid characters
    const invalidCharsPattern = /[<>"|?*]/;
    const hasInvalidChars = invalidCharsPattern.test(path);

    // Allow colons only for drive letters at the beginning of the path
    const colonPattern = /:/g;
    const colonMatches = path.match(colonPattern) || [];
    const hasValidDriveColon = /^[A-Za-z]:/.test(path) && colonMatches.length === 1;
    const hasInvalidColon = colonMatches.length > 0 && !hasValidDriveColon;

    return !hasInvalidChars && !hasInvalidColon && path.length > 0;
  }

  /**
   * Validates number
   * @param {any} value - Value to check
   * @returns {boolean} Whether number
   */
  static isNumber(value) {
    return !isNaN(value) && !isNaN(parseFloat(value));
  }

  /**
   * Validates positive number
   * @param {any} value - Value to check
   * @returns {boolean} Whether positive number
   */
  static isPositiveNumber(value) {
    return this.isNumber(value) && parseFloat(value) > 0;
  }

  /**
   * Validates URL
   * @param {string} url - Kontrol edilecek URL
   * @returns {boolean} Whether valid URL
   */
  static isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates regex pattern
   * @param {any} pattern - Kontrol edilecek desen
   * @returns {boolean} Whether valid regex
   */
  static isValidRegex(pattern) {
    if (!pattern) return false;

    try {
      new RegExp(pattern);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object} Validation result
   */
  static validateDateRange(startDate, endDate) {
    const errors = [];

    if (!this.isValidDate(startDate)) {
      errors.push('Start date is invalid');
    }

    if (!this.isValidDate(endDate)) {
      errors.push('End date is invalid');
    }

    if (this.isValidDate(startDate) && this.isValidDate(endDate)) {
      const start = moment(startDate);
      const end = moment(endDate);

      if (start.isAfter(end)) {
        errors.push('Start date cannot be after end date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates commit options
   * @param {Object} options - Options object
   * @returns {Object} Validation result
   */
  static validateCommitOptions(options) {
    const errors = [];

    if (!options || typeof options !== 'object') {
      errors.push('Options object must be specified');
      return { isValid: false, errors };
    }

    if (options.commitId && !this.isValidGitHash(options.commitId)) {
      errors.push('Valid commit hash must be specified');
    }

    if (options.newMessage && !this.isValidString(options.newMessage)) {
      errors.push('Commit message cannot be empty');
    }

    if (options.startDate && !this.isValidDate(options.startDate)) {
      errors.push('Start date is invalid');
    }

    if (options.endDate && !this.isValidDate(options.endDate)) {
      errors.push('End date is invalid');
    }

    if (options.startDate && options.endDate) {
      const dateValidation = this.validateDateRange(options.startDate, options.endDate);
      if (!dateValidation.isValid) {
        errors.push(...dateValidation.errors);
      }
    }

    if (options.limit && !this.isPositiveNumber(options.limit)) {
      errors.push('Limit must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates replacement patterns
   * @param {Array} replacements - Replacement patterns
   * @returns {Object} Validation result
   */
  static validateReplacements(replacements) {
    const errors = [];

    if (!Array.isArray(replacements)) {
      errors.push('Replacement patterns must be an array');
      return { isValid: false, errors };
    }

    if (replacements.length === 0) {
      errors.push('At least one replacement pattern must be specified');
      return { isValid: false, errors };
    }

    replacements.forEach((replacement, index) => {
      if (!replacement.pattern) {
        errors.push(`${index + 1}. replacement pattern must specify pattern`);
      }

      if (replacement.replacement === undefined) {
        errors.push(`${index + 1}. replacement pattern must specify replacement`);
      }

      if (typeof replacement.pattern === 'string' && !this.isValidString(replacement.pattern)) {
        errors.push(`${index + 1}. replacement pattern cannot be empty`);
      }

      if (replacement.pattern instanceof RegExp && !this.isValidRegex(replacement.pattern)) {
        errors.push(`${index + 1}. replacement pattern has invalid regex`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   Validates .env file keys
   * @param {Array} keys - Anahtarlar dizisi
   * @returns {Object} Validation result
   */
  static validateEnvKeys(keys) {
    const errors = [];

    if (!Array.isArray(keys)) {
      errors.push('Keys must be an array');
      return { isValid: false, errors };
    }

    const envKeyRegex = /^[A-Z][A-Z0-9_]*$/;

    keys.forEach((key, index) => {
      if (!this.isValidString(key)) {
        errors.push(`${index + 1}. key cannot be empty`);
      } else if (!envKeyRegex.test(key)) {
        errors.push(`${index + 1}. key (${key}) is not a valid .env key`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates cleanup options
   * @param {Object} options - Cleanup options
   * @returns {Object} Validation result
   */
  static validateSanitizeOptions(options) {
    const errors = [];

    if (!options || typeof options !== 'object') {
      errors.push('Cleanup options must be specified');
      return { isValid: false, errors };
    }

    if (!options.patterns || !Array.isArray(options.patterns) || options.patterns.length === 0) {
      errors.push('At least one pattern must be specified');
    }

    if (options.patterns) {
      options.patterns.forEach((pattern, index) => {
        if (typeof pattern === 'string' && !this.isValidString(pattern)) {
          errors.push(`${index + 1}. pattern cannot be empty`);
        } else if (pattern instanceof RegExp && !this.isValidRegex(pattern)) {
          errors.push(`${index + 1}. pattern has invalid regex`);
        }
      });
    }

    if (!this.isValidString(options.replacement)) {
      errors.push('Replacement text cannot be empty');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates backup options
   * @param {Object} options - Backup options
   * @returns {Object} Validation result
   */
  static validateBackupOptions(options) {
    const errors = [];

    if (options.backupId && !this.isValidString(options.backupId)) {
      errors.push('Backup ID cannot be empty');
    }

    if (options.maxAge && !this.isPositiveNumber(options.maxAge)) {
      errors.push('Maximum age must be a positive number');
    }

    if (options.keepCount !== undefined && !this.isPositiveNumber(options.keepCount)) {
      errors.push('Number of backups to keep must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates Git repository path
   * @param {string} repoPath - Repo yolu
   * @returns {Object} Validation result
   */
  static validateRepoPath(repoPath) {
    const errors = [];

    if (!this.isValidString(repoPath)) {
      errors.push('Repository path cannot be empty');
    }

    if (!this.isValidPath(repoPath)) {
      errors.push('Invalid repository path');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates JSON data
   * @param {any} data - Kontrol edilecek veri
   * @returns {boolean} Whether valid JSON
   */
  static isValidJSON(data) {
    try {
      if (typeof data === 'string') {
        JSON.parse(data);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validates generic object
   * @param {any} obj - Kontrol edilecek nesne
   * @param {Object} schema - Expected schema
   * @returns {Object} Validation result
   */
  static validateObject(obj, schema) {
    const errors = [];

    if (!obj || typeof obj !== 'object') {
      errors.push('Valid object must be specified');
      return { isValid: false, errors };
    }

    Object.keys(schema).forEach(key => {
      const expectedType = schema[key];
      const actualValue = obj[key];

      if (expectedType.required && (actualValue === undefined || actualValue === null)) {
        errors.push(`${key} field is required`);
      } else if (actualValue !== undefined && expectedType.type) {
        if (expectedType.type === 'string' && typeof actualValue !== 'string') {
          errors.push(`${key} field must be string`);
        } else if (expectedType.type === 'number' && !this.isNumber(actualValue)) {
          errors.push(`${key} field must be number`);
        } else if (expectedType.type === 'boolean' && typeof actualValue !== 'boolean') {
          errors.push(`${key} field must be boolean`);
        } else if (expectedType.type === 'array' && !Array.isArray(actualValue)) {
          errors.push(`${key} field must be array`);
        } else if (expectedType.type === 'object' && typeof actualValue !== 'object') {
          errors.push(`${key} field must be object`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Validator;