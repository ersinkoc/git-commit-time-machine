const { execSync, spawn, spawnSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./utils/logger');

/**
 * Git History Rewriter - Practical approach to modify Git history
 * SECURITY: All git commands use spawnSync with argument arrays to prevent command injection
 */
class GitHistoryRewriter {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.originalBranch = null;
    this.GIT_TIMEOUT = 60000; // 60 second timeout for git operations
  }

  /**
   * Validate commit hash format to prevent injection attacks
   * @param {string} hash - Commit hash to validate
   * @returns {boolean} Whether hash is valid
   */
  isValidHash(hash) {
    return /^[a-f0-9]{7,40}$/i.test(hash);
  }

  /**
   * Validate branch name to prevent injection attacks
   * @param {string} branchName - Branch name to validate
   * @returns {boolean} Whether branch name is valid
   */
  isValidBranchName(branchName) {
    // Branch names can contain alphanumeric, dash, underscore, slash, and dot
    // but cannot start with dot, slash, or contain special shell characters
    return /^[a-zA-Z0-9_][\w\-\/\.]*$/.test(branchName) &&
           !branchName.includes('..') &&
           !branchName.includes('//') &&
           branchName.length > 0 &&
           branchName.length < 256;
  }

  /**
   * Execute git command safely with timeout
   * @param {Array} args - Git command arguments
   * @param {Object} options - Additional options
   * @returns {Object} Result with stdout, stderr, status
   */
  executeGitCommand(args, options = {}) {
    const result = spawnSync('git', args, {
      cwd: this.repoPath,
      encoding: 'utf8',
      timeout: options.timeout || this.GIT_TIMEOUT,
      env: options.env || process.env,
      ...options
    });

    if (result.error) {
      throw new Error(`Git command failed: ${result.error.message}`);
    }

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      status: result.status
    };
  }

  /**
   * Change commit dates using interactive rebase
   * @param {Array} commitsWithNewDates - Array of {hash, newDate} objects
   * @returns {Promise<Object>} Operation result
   */
  async changeCommitDates(commitsWithNewDates) {
    try {
      logger.info('Starting Git history rewrite for date changes...');

      // Create backup branch
      const backupBranch = await this.createBackupBranch();

      try {
        // Get current state
        this.originalBranch = await this.getCurrentBranch();

        // Process commits from oldest to newest (create copy to avoid mutating input)
        const sortedCommits = [...commitsWithNewDates].reverse(); // Reverse copy to process oldest first

        let processedCount = 0;

        for (const commitData of sortedCommits) {
          try {
            await this.rewriteSingleCommitDate(commitData);
            processedCount++;
          } catch (error) {
            logger.warn(`Failed to rewrite commit ${commitData.hash}: ${error.message}`);
          }
        }

        logger.success(`Successfully changed dates for ${processedCount} commits`);
        return { success: true, processed: processedCount };

      } catch (error) {
        // Restore from backup if something went wrong
        await this.restoreFromBranch(backupBranch);
        throw error;
      }

    } catch (error) {
      logger.error(`Failed to rewrite Git history: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Rewrite a single commit's date
   * @param {Object} commitData - {hash, newDate} object
   */
  async rewriteSingleCommitDate(commitData) {
    const { hash, newDate } = commitData;

    // SECURITY: Validate commit hash format to prevent injection
    if (!this.isValidHash(hash)) {
      throw new Error(`Invalid commit hash format: ${hash}`);
    }

    // Reset to the commit before the target - using spawnSync to prevent command injection
    try {
      const result = this.executeGitCommand(['reset', '--hard', hash]);

      if (result.status !== 0) {
        throw new Error(result.stderr || 'Reset failed');
      }
    } catch (error) {
      throw new Error(`Cannot reset to commit ${hash}: ${error.message}`);
    }

    // Set environment variables for new date
    const env = {
      ...process.env,
      GIT_AUTHOR_DATE: newDate,
      GIT_COMMITTER_DATE: newDate
    };

    // Amend the commit with new date - using spawnSync to prevent command injection
    try {
      const result = this.executeGitCommand(['commit', '--amend', '--no-edit'], { env });

      if (result.status !== 0) {
        throw new Error(result.stderr || 'Amend failed');
      }
    } catch (error) {
      throw new Error(`Cannot amend commit ${hash}: ${error.message}`);
    }
  }

  /**
   * Replace content in Git history using filter approach
   * @param {Array} replacements - Array of {pattern, replacement} objects
   * @returns {Promise<Object>} Operation result
   */
  async replaceContentInHistory(replacements) {
    try {
      logger.info('Starting content replacement in Git history...');

      // Create backup branch
      const backupBranch = await this.createBackupBranch();

      try {
        this.originalBranch = await this.getCurrentBranch();

        // Create a temp working directory
        const tempDir = await this.createTempWorkingDirectory();

        // Get all commits to process
        const commits = await this.getAllCommitHashes();

        let processedCount = 0;

        // Process each commit
        for (const commitHash of commits) {
          try {
            const success = await this.processCommitForContentReplacement(commitHash, replacements, tempDir);
            if (success) processedCount++;
          } catch (error) {
            logger.warn(`Failed to process commit ${commitHash}: ${error.message}`);
          }
        }

        // Clean up temp directory
        await fs.remove(tempDir);

        logger.success(`Successfully processed ${processedCount} commits for content replacement`);
        return { success: true, processed: processedCount };

      } catch (error) {
        // Restore from backup if something went wrong
        await this.restoreFromBranch(backupBranch);
        throw error;
      }

    } catch (error) {
      logger.error(`Failed to replace content: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process a single commit for content replacement
   * @param {string} commitHash - Commit hash
   * @param {Array} replacements - Replacement patterns
   * @param {string} tempDir - Temporary directory
   * @returns {Promise<boolean>} Success status
   */
  async processCommitForContentReplacement(commitHash, replacements, tempDir) {
    try {
      // SECURITY: Validate commit hash
      if (!this.isValidHash(commitHash)) {
        throw new Error(`Invalid commit hash: ${commitHash}`);
      }

      // Reset to the commit - using safe git execution
      const resetResult = this.executeGitCommand(['reset', '--hard', commitHash]);
      if (resetResult.status !== 0) {
        throw new Error(resetResult.stderr || 'Reset failed');
      }

      // Find files to modify
      const modifiedFiles = await this.findFilesWithPatterns(replacements);

      let fileModified = false;

      // Modify each file
      for (const filePath of modifiedFiles) {
        const fullPath = path.join(this.repoPath, filePath);

        if (await fs.pathExists(fullPath)) {
          const content = await fs.readFile(fullPath, 'utf8');
          let modifiedContent = content;

          // Apply all replacements
          for (const replacement of replacements) {
            if (typeof replacement.pattern === 'string') {
              modifiedContent = modifiedContent.split(replacement.pattern).join(replacement.replacement);
            } else if (replacement.pattern instanceof RegExp) {
              modifiedContent = modifiedContent.replace(replacement.pattern, replacement.replacement);
            }
          }

          // Write back if content changed
          if (modifiedContent !== content) {
            await fs.writeFile(fullPath, modifiedContent, 'utf8');
            fileModified = true;
          }
        }
      }

      // Amend commit if any files were modified
      if (fileModified) {
        const addResult = this.executeGitCommand(['add', '.']);
        if (addResult.status !== 0) {
          throw new Error(addResult.stderr || 'Git add failed');
        }

        const commitResult = this.executeGitCommand(['commit', '--amend', '--no-edit']);
        if (commitResult.status !== 0) {
          throw new Error(commitResult.stderr || 'Git commit amend failed');
        }

        return true;
      }

      return false;

    } catch (error) {
      logger.warn(`Error processing commit ${commitHash}: ${error.message}`);
      return false;
    }
  }

  /**
   * Find files that contain the patterns to replace
   * @param {Array} replacements - Replacement patterns
   * @returns {Promise<Array>} List of files to modify
   */
  async findFilesWithPatterns(replacements) {
    const files = new Set();

    for (const replacement of replacements) {
      const pattern = typeof replacement.pattern === 'string'
        ? replacement.pattern
        : replacement.pattern.source;

      try {
        // Use spawnSync with args array to prevent command injection
        const result = spawnSync('git', ['grep', '-l', pattern], {
          cwd: this.repoPath,
          encoding: 'utf8',
          shell: false, // Prevent shell interpretation
          timeout: this.GIT_TIMEOUT
        });

        // git grep exits with code 1 if no matches (not an error)
        if (result.status === 0 && result.stdout) {
          result.stdout.split('\n').forEach(file => {
            if (file.trim()) files.add(file.trim());
          });
        }

      } catch (error) {
        // Handle actual errors
        logger.warn(`Error searching for pattern: ${error.message}`);
      }
    }

    return Array.from(files);
  }

  /**
   * Get all commit hashes from current branch
   * @returns {Promise<Array>} Array of commit hashes
   */
  async getAllCommitHashes() {
    try {
      const result = this.executeGitCommand(['rev-list', 'HEAD']);

      if (result.status !== 0) {
        throw new Error(result.stderr || 'Failed to get commit list');
      }

      return result.stdout.trim().split('\n').filter(hash => hash && this.isValidHash(hash));
    } catch (error) {
      throw new Error(`Cannot get commit list: ${error.message}`);
    }
  }

  /**
   * Create temporary working directory
   * @returns {Promise<string>} Temporary directory path
   */
  async createTempWorkingDirectory() {
    const tempDir = path.join(this.repoPath, '.gctm-temp-' + Date.now());
    await fs.ensureDir(tempDir);
    return tempDir;
  }

  /**
   * Create backup branch
   * @returns {Promise<string>} Backup branch name
   */
  async createBackupBranch() {
    const backupBranch = 'gctm-backup-' + Date.now();

    // SECURITY: Validate branch name
    if (!this.isValidBranchName(backupBranch)) {
      throw new Error(`Invalid backup branch name: ${backupBranch}`);
    }

    try {
      const result = this.executeGitCommand(['branch', backupBranch]);

      if (result.status !== 0) {
        throw new Error(result.stderr || 'Failed to create backup branch');
      }

      logger.info(`Created backup branch: ${backupBranch}`);
      return backupBranch;
    } catch (error) {
      throw new Error(`Failed to create backup branch: ${error.message}`);
    }
  }

  /**
   * Get current branch name
   * @returns {Promise<string>} Current branch name
   */
  async getCurrentBranch() {
    try {
      const result = this.executeGitCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
      return result.stdout.trim() || 'HEAD';
    } catch (error) {
      return 'HEAD'; // Fallback for detached HEAD
    }
  }

  /**
   * Restore from backup branch
   * @param {string} backupBranch - Backup branch name
   */
  async restoreFromBranch(backupBranch) {
    try {
      // SECURITY: Validate branch name
      if (!this.isValidBranchName(backupBranch)) {
        throw new Error(`Invalid backup branch name: ${backupBranch}`);
      }

      const result = this.executeGitCommand(['reset', '--hard', backupBranch]);

      if (result.status !== 0) {
        throw new Error(result.stderr || 'Failed to restore from backup');
      }

      logger.info(`Restored from backup branch: ${backupBranch}`);
    } catch (error) {
      logger.error(`Failed to restore from backup: ${error.message}`);
    }
  }

  /**
   * Clean up backup branches
   * @param {Array} backupBranches - Array of backup branch names
   */
  async cleanupBackupBranches(backupBranches) {
    for (const branch of backupBranches) {
      try {
        // SECURITY: Validate branch name
        if (!this.isValidBranchName(branch)) {
          logger.warn(`Skipping cleanup of invalid branch name: ${branch}`);
          continue;
        }

        this.executeGitCommand(['branch', '-D', branch]);
      } catch (error) {
        // Ignore cleanup errors
        logger.debug(`Failed to cleanup branch ${branch}: ${error.message}`);
      }
    }
  }
}

module.exports = GitHistoryRewriter;
