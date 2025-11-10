const fs = require('fs-extra');
const path = require('path');
const logger = require('./utils/logger');

/**
 * Class used for editing commit contents
 */
class ContentEditor {
  constructor(repoPath) {
    this.repoPath = repoPath;
  }

  /**
   * Edits files in a specific commit
   * @param {string} commitHash - Commit hash
   * @param {Array} replacements - Patterns to replace and their replacements
   * @returns {Promise<Object>} Operation result
   */
  async editCommit(commitHash, replacements) {
    try {
      logger.info(`Editing commit content: ${commitHash}`);

      // First get the changed files in the commit
      const changedFiles = await this.getCommitFiles(commitHash);
      const results = [];

      // Apply changes for each file
      for (const file of changedFiles) {
        const filePath = path.join(this.repoPath, file.file);
        const result = await this.editFile(filePath, replacements, commitHash);
        results.push(result);
      }

      const successful = results.filter(r => r.success).length;

      return {
        success: successful > 0,
        hash: commitHash,
        processedFiles: successful,
        totalFiles: changedFiles.length,
        results
      };
    } catch (error) {
      logger.error(`Could not edit commit: ${error.message}`);
      return {
        success: false,
        hash: commitHash,
        error: error.message
      };
    }
  }

  /**
   * Edits a specific file
   * @param {string} filePath - File path
   * @param {Array} replacements - Patterns to replace and their replacements
   * @param {string} context - Operation context (for logging)
   * @returns {Promise<Object>} Operation result
   */
  async editFile(filePath, replacements, context = '') {
    try {
      // Check if file exists
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        logger.warn(`File not found: ${filePath}`);
        return {
          success: false,
          file: filePath,
          error: 'File not found'
        };
      }

      // Read file content
      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;

      // Apply changes
      let changesMade = false;
      const appliedReplacements = [];

      for (const replacement of replacements) {
        const { pattern, replacement: replacementText, options = {} } = replacement;

        if (typeof pattern === 'string') {
          // Replace as string
          if (content.includes(pattern)) {
            content = content.split(pattern).join(replacementText);
            changesMade = true;
            appliedReplacements.push({ type: 'string', pattern });
          }
        } else if (pattern instanceof RegExp) {
          // Replace with regex - create new instance to avoid state mutation
          const regex = new RegExp(pattern.source, pattern.flags || 'g');
          const matchRegex = new RegExp(pattern.source, pattern.flags || 'g');
          const matches = content.match(matchRegex);
          if (matches && matches.length > 0) {
            content = content.replace(regex, replacementText);
            changesMade = true;
            appliedReplacements.push({
              type: 'regex',
              pattern: pattern.toString(),
              matchCount: matches.length
            });
          }
        }
      }

      // Write back to file if there are changes
      if (changesMade) {
        await fs.writeFile(filePath, content, 'utf8');

        logger.info(`File edited: ${path.basename(filePath)} (${appliedReplacements.length} changes)`);

        return {
          success: true,
          file: filePath,
          changes: true,
          appliedReplacements,
          context
        };
      } else {
        logger.debug(`No changes found: ${path.basename(filePath)}`);

        return {
          success: true,
          file: filePath,
          changes: false,
          appliedReplacements: [],
          context
        };
      }
    } catch (error) {
      logger.error(`Could not edit file: ${filePath} - ${error.message}`);
      return {
        success: false,
        file: filePath,
        error: error.message
      };
    }
  }

  /**
   * Hides API keys in .env file
   * @param {string} filePath - .env file path
   * @param {Array} keysToHide - List of keys to hide
   * @param {string} replacement - Replacement text
   * @returns {Promise<Object>} Operation result
   */
  async hideApiKeys(filePath, keysToHide = [], replacement = '***HIDDEN***') {
    try {
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return {
          success: false,
          file: filePath,
          error: '.env file not found'
        };
      }

      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      const hiddenKeys = [];

      // Hide each API key
      for (const key of keysToHide) {
        const pattern = new RegExp(`(${key}=)([^\\n\\r]+)`, 'gi');
        if (pattern.test(content)) {
          content = content.replace(pattern, `$1${replacement}`);
          hiddenKeys.push(key);
        }
      }

      // Detect and hide possible API keys in general
      const generalApiKeyPattern = /([A-Z_]+_?(KEY|TOKEN|SECRET|PASSWORD|PASS|API_KEY|SECRET_KEY)=)([^\\n\\r]+)/gi;
      const generalMatches = content.match(generalApiKeyPattern);

      if (generalMatches) {
        content = content.replace(generalApiKeyPattern, `$1${replacement}`);

        // Find which keys were hidden
        generalMatches.forEach(match => {
          const keyMatch = match.match(/^([^=]+)=/);
          if (keyMatch && !keysToHide.includes(keyMatch[1])) {
            hiddenKeys.push(keyMatch[1]);
          }
        });
      }

      // Update file if there are changes
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf8');

        logger.info(`${hiddenKeys.length} API keys hidden: ${hiddenKeys.join(', ')}`);

        return {
          success: true,
          file: filePath,
          hiddenKeys,
          changes: true
        };
      } else {
        return {
          success: true,
          file: filePath,
          hiddenKeys: [],
          changes: false,
          message: 'No API keys found to hide'
        };
      }
    } catch (error) {
      logger.error(`Could not hide API keys: ${error.message}`);
      return {
        success: false,
        file: filePath,
        error: error.message
      };
    }
  }

  /**
   * Detects sensitive data patterns
   * @param {string} content - Content
   * @returns {Object} Detected sensitive data
   */
  detectSensitiveData(content) {
    const sensitivePatterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      apiKeys: /([A-Z_]+_?(KEY|TOKEN|SECRET|PASSWORD|PASS|API_KEY|SECRET_KEY)=)([^\s\n]+)/g,
      ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
      url: /(https?:\/\/[^\s]+)/g,
      creditCard: /\b(?:\d[ -]*?){13,16}\b/g
    };

    const found = {};

    Object.entries(sensitivePatterns).forEach(([type, pattern]) => {
      const matches = content.match(pattern);
      if (matches) {
        // Get unique values
        found[type] = [...new Set(matches)];
      }
    });

    return found;
  }

  /**
   * Cleans sensitive data in file
   * @param {string} filePath - File path
   * @param {Object} options - Cleaning options
   * @returns {Promise<Object>} Operation result
   */
  async sanitizeFile(filePath, options = {}) {
    const {
      hideEmails = true,
      hidePhones = true,
      hideApiKeys = true,
      hideIPs = false,
      hideUrls = false,
      emailReplacement = '***EMAIL***',
      phoneReplacement = '***PHONE***',
      apiKeyReplacement = '***API_KEY***',
      ipReplacement = '***IP***',
      urlReplacement = '***URL***'
    } = options;

    try {
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return {
          success: false,
          file: filePath,
          error: 'File not found'
        };
      }

      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      const sanitizedTypes = [];

      // Clean email addresses
      if (hideEmails) {
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        if (content.match(emailPattern)) {
          content = content.replace(emailPattern, emailReplacement);
          sanitizedTypes.push('emails');
        }
      }

      // Clean phone numbers
      if (hidePhones) {
        const phonePattern = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        if (content.match(phonePattern)) {
          content = content.replace(phonePattern, phoneReplacement);
          sanitizedTypes.push('phones');
        }
      }

      // Clean API keys
      if (hideApiKeys) {
        const apiKeyPattern = /([A-Z_]+_?(KEY|TOKEN|SECRET|PASSWORD|PASS|API_KEY|SECRET_KEY)=)([^\s\n]+)/g;
        if (content.match(apiKeyPattern)) {
          content = content.replace(apiKeyPattern, `$1${apiKeyReplacement}`);
          sanitizedTypes.push('apiKeys');
        }
      }

      // Clean IP addresses
      if (hideIPs) {
        const ipPattern = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
        if (content.match(ipPattern)) {
          content = content.replace(ipPattern, ipReplacement);
          sanitizedTypes.push('ipAddresses');
        }
      }

      // Clean URLs
      if (hideUrls) {
        const urlPattern = /(https?:\/\/[^\s]+)/g;
        if (content.match(urlPattern)) {
          content = content.replace(urlPattern, urlReplacement);
          sanitizedTypes.push('urls');
        }
      }

      // Update file if there are changes
      if (content !== originalContent) {
        await fs.writeFile(filePath, content, 'utf8');

        logger.info(`File cleaned: ${path.basename(filePath)} (${sanitizedTypes.join(', ')})`);

        return {
          success: true,
          file: filePath,
          changes: true,
          sanitizedTypes
        };
      } else {
        return {
          success: true,
          file: filePath,
          changes: false,
          message: 'No sensitive data found to clean'
        };
      }
    } catch (error) {
      logger.error(`Could not clean file: ${error.message}`);
      return {
        success: false,
        file: filePath,
        error: error.message
      };
    }
  }

  /**
   * Finds files matching a specific pattern
   * @param {string} directory - Search directory
   * @param {Array} patterns - File name patterns
   * @param {boolean} recursive - Also search subdirectories
   * @returns {Promise<Array>} File list
   */
  async findFilesByPattern(directory, patterns, recursive = true) {
    try {
      const files = [];

      if (recursive) {
        const allFiles = await fs.readdir(directory, { withFileTypes: true });

        for (const file of allFiles) {
          const fullPath = path.join(directory, file.name);

          if (file.isDirectory() && !file.name.startsWith('.')) {
            // Also scan subdirectories
            const subFiles = await this.findFilesByPattern(fullPath, patterns, recursive);
            files.push(...subFiles);
          } else if (file.isFile()) {
            // Check if matches file patterns
            for (const pattern of patterns) {
              if (file.name.includes(pattern) || file.name.match(pattern)) {
                files.push(fullPath);
                break; // Add once is enough
              }
            }
          }
        }
      } else {
        const allFiles = await fs.readdir(directory);

        for (const fileName of allFiles) {
          const fullPath = path.join(directory, fileName);
          const stat = await fs.stat(fullPath);

          if (stat.isFile()) {
            for (const pattern of patterns) {
              if (fileName.includes(pattern) || fileName.match(pattern)) {
                files.push(fullPath);
                break;
              }
            }
          }
        }
      }

      return files;
    } catch (error) {
      logger.error(`Could not search files: ${error.message}`);
      return [];
    }
  }

  /**
   * Gets changed files in a specific commit
   * @param {string} commitHash - Commit hash
   * @returns {Promise<Array>} List of changed files
   */
  async getCommitFiles(commitHash) {
    // This method can get more detailed information from GitProcessor
    // Here we make a simple implementation
    try {
      const simpleGit = require('simple-git');
      const git = simpleGit({ baseDir: this.repoPath });

      const diffSummary = await git.diffSummary([`${commitHash}^`, commitHash]);
      return diffSummary.files.map(file => ({
        file: file.file,
        changes: file.changes,
        insertions: file.insertions,
        deletions: file.deletions
      }));
    } catch (error) {
      logger.error(`Could not get commit files: ${error.message}`);
      return [];
    }
  }
}

module.exports = ContentEditor;