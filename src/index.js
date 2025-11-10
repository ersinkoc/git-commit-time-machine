const GitProcessor = require('./gitProcessor');
const DateManager = require('./dateManager');
const ContentEditor = require('./contentEditor');
const BackupManager = require('./backupManager');
const AICommitAssistant = require('./aiCommitAssistant');
const logger = require('./utils/logger');

/**
 * Git Commit Time Machine Main Class
 */
class GitCommitTimeMachine {
  constructor(options = {}) {
    this.repoPath = options.repoPath || process.cwd();
    this.gitProcessor = new GitProcessor(this.repoPath);
    this.dateManager = new DateManager();
    this.contentEditor = new ContentEditor(this.repoPath);
    this.backupManager = new BackupManager(this.repoPath);
    this.aiAssistant = new AICommitAssistant(options.ai || {});
    this.options = options;
  }

  /**
   * Redates commits within a specified date range
   * @param {Object} options - Redating options
   * @param {string} options.startDate - Start date (YYYY-MM-DD format)
   * @param {string} options.endDate - End date (YYYY-MM-DD format)
   * @param {Function} options.filter - Function to filter commits
   * @param {boolean} options.createBackup - Create backup before operation
   * @param {boolean} options.preserveOrder - Preserve commit order
   * @returns {Promise<Object>} Operation results
   */
  async redateCommits(options) {
    try {
      logger.info('Redating commits...');

      // BUG-028 fix: Default createBackup to true for destructive operations
      const createBackup = options.createBackup !== false; // Default true unless explicitly set to false

      // Validate date formats before proceeding (BUG-020 fix)
      const Validator = require('./utils/validator');
      const dateValidation = Validator.validateDateRange(options.startDate, options.endDate);
      if (!dateValidation.isValid) {
        const errorMsg = `Date validation failed: ${dateValidation.errors.join(', ')}`;
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      if (createBackup) {
        await this.backupManager.createBackup();
        logger.info('Backup created');
      }

      const commits = await this.gitProcessor.getCommits({
        filter: options.filter
      });

      if (commits.length === 0) {
        logger.warn('No commits found to process');
        return { success: true, message: 'No commits found to process', processed: 0 };
      }

      logger.info(`Found ${commits.length} commits`);

      // Generate new dates within the date range
      const newDates = this.dateManager.generateDateRange(
        options.startDate,
        options.endDate,
        commits.length,
        { preserveOrder: options.preserveOrder }
      );

      // Prepare commit-date mapping
      const commitsWithDates = commits.map((commit, index) => ({
        hash: commit.hash,
        newDate: newDates[index]
      }));

      // Use batch date changing for better performance
      logger.info(`Changing dates for ${commitsWithDates.length} commits...`);

      const result = await this.gitProcessor.amendMultipleCommitDates(commitsWithDates);

      if (result.success) {
        logger.info(`Operation completed: ${result.processed}/${commits.length} commits successfully redated`);
        return {
          success: true,
          processed: result.processed,
          total: commits.length
        };
      } else {
        logger.error(`Date changing failed: ${result.error}`);
        return {
          success: false,
          error: result.error,
          total: commits.length
        };
      }

    } catch (error) {
      logger.error(`Redating operation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edits a commit message
   * @param {Object} options - Message editing options
   * @param {string} options.commitId - Commit ID to edit
   * @param {string} options.newMessage - New commit message
   * @param {boolean} options.createBackup - Create backup before operation
   * @returns {Promise<Object>} Operation result
   */
  async editCommitMessage(options) {
    try {
      logger.info(`Editing commit message: ${options.commitId}`);

      // BUG-028 fix: Default createBackup to true for destructive operations
      const createBackup = options.createBackup !== false;

      if (createBackup) {
        await this.backupManager.createBackup();
        logger.info('Backup created');
      }

      const result = await this.gitProcessor.amendCommitMessage(
        options.commitId,
        options.newMessage
      );

      if (result.success) {
        logger.info('Commit message successfully edited');
      } else {
        logger.error(`Failed to edit commit message: ${result.error}`);
      }

      return result;

    } catch (error) {
      logger.error(`Message editing operation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edits commit content
   * @param {Object} options - Content editing options
   * @param {string} options.commitId - Commit ID to edit
   * @param {Array} options.replacements - Patterns and their replacements
   * @param {boolean} options.createBackup - Create backup before operation
   * @returns {Promise<Object>} Operation result
   */
  async editCommitContent(options) {
    try {
      logger.info(`Editing commit content: ${options.commitId}`);

      // BUG-028 fix: Default createBackup to true for destructive operations
      const createBackup = options.createBackup !== false;

      if (createBackup) {
        await this.backupManager.createBackup();
        logger.info('Backup created');
      }

      // Use the new GitProcessor method for content replacement
      const result = await this.gitProcessor.replaceContentInHistory(
        options.replacements,
        options.commitId
      );

      if (result.success) {
        logger.info('Commit content successfully edited');
      } else {
        logger.error(`Failed to edit commit content: ${result.error}`);
      }

      return result;

    } catch (error) {
      logger.error(`Content editing operation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sanitizes repository history from sensitive data
   * @param {Object} options - Sanitization options
   * @param {Array} options.patterns - Patterns to search for (regex or string)
   * @param {string} options.replacement - Text to replace with
   * @param {Function} options.filter - Filter commits to process
   * @param {boolean} options.createBackup - Create backup before operation
   * @returns {Promise<Object>} Operation results
   */
  async sanitizeHistory(options) {
    try {
      logger.info('Sanitizing history from sensitive data...');

      // BUG-027 fix: Validate patterns before processing
      const Validator = require('./utils/validator');
      if (!options.patterns || !Array.isArray(options.patterns) || options.patterns.length === 0) {
        const errorMsg = 'At least one pattern must be specified for sanitization';
        logger.error(errorMsg);
        return { success: false, error: errorMsg };
      }

      // BUG-028 fix: Default createBackup to true for destructive operations
      const createBackup = options.createBackup !== false;

      if (createBackup) {
        await this.backupManager.createBackup();
        logger.info('Backup created');
      }

      const commits = await this.gitProcessor.getCommits({
        filter: options.filter
      });

      if (commits.length === 0) {
        logger.warn('No commits found to process');
        return { success: true, message: 'No commits found to process', processed: 0 };
      }

      logger.info(`Scanning ${commits.length} commits`);

      const results = [];
      for (const commit of commits) {
        try {
          logger.info(`Scanning commit: ${commit.hash.substring(0, 7)}`);

          const replacements = options.patterns.map(pattern => ({
            pattern,
            replacement: options.replacement
          }));

          // Validate replacements array
          const validation = Validator.validateReplacements(replacements);
          if (!validation.isValid) {
            logger.warn(`Invalid replacements for commit ${commit.hash}: ${validation.errors.join(', ')}`);
            continue;
          }

          const result = await this.contentEditor.editCommit(
            commit.hash,
            replacements
          );

          results.push(result);
        } catch (error) {
          logger.error(`Error scanning commit ${commit.hash}: ${error.message}`);
          results.push({ success: false, error: error.message, hash: commit.hash });
        }
      }

      const successful = results.filter(r => r.success).length;
      logger.info(`Sanitization completed: ${successful}/${commits.length} commits successfully edited`);

      return {
        success: true,
        processed: successful,
        total: commits.length,
        results
      };

    } catch (error) {
      logger.error(`Sanitization operation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lists available backups
   * @returns {Promise<Array>} List of backups
   */
  async listBackups() {
    try {
      return await this.backupManager.listBackups();
    } catch (error) {
      logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Restores a specific backup
   * @param {string} backupId - Backup ID to restore
   * @returns {Promise<Object>} Operation result
   */
  async restoreBackup(backupId) {
    try {
      logger.info(`Restoring backup: ${backupId}`);
      const result = await this.backupManager.restoreBackup(backupId);

      if (result.success) {
        logger.info('Backup successfully restored');
      } else {
        logger.error(`Failed to restore backup: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error(`Backup restoration failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize AI assistant
   * @returns {Promise<Object>} Initialization result
   */
  async initializeAI() {
    try {
      const result = await this.aiAssistant.initialize();
      if (result.success) {
        logger.info('AI assistant initialized successfully');
      } else {
        logger.warn('AI assistant initialization failed');
      }
      return result;
    } catch (error) {
      logger.error(`Failed to initialize AI assistant: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate AI-powered commit message
   * @param {Object} options - Generation options
   * @param {string} options.language - Target language (en, tr, es, fr, de)
   * @param {string} options.style - Message style (conventional, descriptive, minimal, humorous)
   * @param {string} options.context - Additional context
   * @param {string} options.currentMessage - Current message to improve
   * @returns {Promise<Object>} Generated commit message
   */
  async generateAICommitMessage(options = {}) {
    try {
      logger.info('Generating AI commit message...');

      // Get current repository status
      const status = await this.gitProcessor.getStatus();

      // Get changed files and diff
      const changedFiles = [...status.staged, ...status.modified, ...status.created];
      let diff = '';

      try {
        diff = await this.gitProcessor.getCommitDiff('HEAD');
      } catch (error) {
        // For new repos or no commits
        logger.warn('Could not get diff (new repository?)');
      }

      // Generate AI commit message
      const result = await this.aiAssistant.generateCommitMessage({
        changedFiles,
        diff: (typeof diff === 'object' ? diff.diff : diff) || '',
        currentMessage: options.currentMessage || '',
        language: options.language || this.aiAssistant.language,
        style: options.style || this.aiAssistant.style,
        context: options.context || ''
      });

      if (result.success) {
        logger.success(`Generated ${result.suggestions.length} AI commit message suggestions`);
        return {
          success: true,
          suggestions: result.suggestions,
          changedFiles,
          hasStagedChanges: status.staged.length > 0,
          hasUnstagedChanges: status.modified.length > 0
        };
      } else {
        logger.error(`AI generation failed: ${result.error}`);
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      logger.error(`Failed to generate AI commit message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply AI-generated commit message
   * @param {string} message - Commit message to apply
   * @param {boolean} createBackup - Whether to create backup
   * @returns {Promise<Object>} Operation result
   */
  async applyAICommitMessage(message, createBackup = true) {
    try {
      logger.info(`Applying AI commit message: ${message}`);

      if (createBackup) {
        await this.backupManager.createBackup();
        logger.info('Backup created');
      }

      // Stage all changes if needed
      const status = await this.gitProcessor.getStatus();
      if (status.modified.length > 0 || status.created.length > 0) {
        logger.info('Staging all changes...');
        // This would require adding git add functionality to GitProcessor
        logger.warn('Manual staging required - please run "git add ." before committing');
      }

      // Create commit with AI message
      const result = await this.gitProcessor.amendCommitMessage('HEAD', message);

      if (result.success) {
        logger.success('AI commit message applied successfully');
        return { success: true, message };
      } else {
        logger.error(`Failed to apply AI commit message: ${result.error}`);
        return { success: false, error: result.error };
      }

    } catch (error) {
      logger.error(`Failed to apply AI commit message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update AI assistant configuration
   * @param {Object} config - New configuration
   * @returns {Promise<Object>} Update result
   */
  async updateAIConfig(config) {
    try {
      const result = await this.aiAssistant.updateConfig(config);
      if (result.success) {
        logger.info('AI configuration updated');
      }
      return result;
    } catch (error) {
      logger.error(`Failed to update AI config: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test AI assistant connection
   * @returns {Promise<Object>} Test result
   */
  async testAIConnection() {
    try {
      logger.info('Testing AI connection...');
      const result = await this.aiAssistant.testConnection();

      if (result.success) {
        logger.success('AI connection test successful');
      } else {
        logger.error(`AI connection test failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      logger.error(`AI connection test error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get AI assistant configuration
   * @returns {Object} Current AI configuration
   */
  getAIConfig() {
    return this.aiAssistant.getConfig();
  }
}

module.exports = GitCommitTimeMachine;