const simpleGit = require('simple-git');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./utils/logger');
const GitHistoryRewriter = require('./gitHistoryRewriter');

/**
 * Class for interacting with Git repository
 * BUG-NEW-039 fix: Added timeout handling for git operations
 */
class GitProcessor {
  constructor(repoPath) {
    this.repoPath = repoPath;
    // BUG-NEW-039 fix: Add timeout to prevent hung operations
    this.git = simpleGit({
      baseDir: repoPath,
      timeout: {
        block: 60000 // 60 second timeout for blocking operations
      }
    });
    this.historyRewriter = new GitHistoryRewriter(repoPath);
  }

  /**
   * Checks if repository is a valid Git repository
   * @returns {Promise<boolean>} Whether it's a Git repo
   */
  async isGitRepo() {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gets commit list
   * @param {Object} options - Options
   * @param {Function} options.filter - Function to filter commits
   * @param {number} options.limit - Maximum commit count
   * @param {string} options.branch - Branch to work on
   * @returns {Promise<Array>} Commit list
   */
  async getCommits(options = {}) {
    try {
      const defaultOptions = {
        branch: 'HEAD',
        limit: 1000
      };

      const gitOptions = { ...defaultOptions, ...options };

      // Get commit information using Git log
      const log = await this.git.log({
        maxCount: gitOptions.limit
      });

      let commits = log.all.map(commit => ({
        hash: commit.hash,
        shortHash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        email: commit.author_email,
        date: new Date(commit.date),
        body: commit.body,
        diff: null // Diff information will be retrieved separately when needed
      }));

      // Apply filter if provided
      if (options.filter && typeof options.filter === 'function') {
        commits = commits.filter(options.filter);
      }

      return commits;
    } catch (error) {
      logger.error(`Error in getCommits: ${error.message}`);
      throw new Error(`Cannot get commit list: ${error.message}`);
    }
  }

  /**
   * Gets diff information for a specific commit
   * @param {string} commitHash - Commit hash
   * @returns {Promise<Object>} Diff information
   */
  async getCommitDiff(commitHash) {
    try {
      let diff;
      try {
        // Try normal diff (with parent commit)
        diff = await this.git.diff([`${commitHash}^`, commitHash]);
      } catch (error) {
        // For initial commit, use empty tree hash as parent
        diff = await this.git.diff(['4b825dc642cb6eb9a060e54bf8d69288fbee4904', commitHash]);
      }
      return {
        hash: commitHash,
        diff
      };
    } catch (error) {
      logger.error(`Cannot get diff information: ${error.message}`);
      throw new Error(`Cannot get diff information: ${error.message}`);
    }
  }

  /**
   * Gets file list for a specific commit
   * @param {string} commitHash - Commit hash
   * @returns {Promise<Array>} List of changed files
   */
  async getCommitFiles(commitHash) {
    try {
      // For initial commit, use empty tree as parent
      const parentCommit = commitHash + '^';
      let diffSummary;

      try {
        diffSummary = await this.git.diffSummary([parentCommit, commitHash]);
      } catch (error) {
        // If it's the initial commit, show all files
        diffSummary = await this.git.diffSummary(['4b825dc642cb6eb9a060e54bf8d69288fbee4904', commitHash]);
      }

      return diffSummary.files.map(file => ({
        file: file.file,
        changes: file.changes,
        insertions: file.insertions,
        deletions: file.deletions
      }));
    } catch (error) {
      logger.error(`Cannot get commit files: ${error.message}`);
      throw new Error(`Cannot get commit files: ${error.message}`);
    }
  }

  /**
   * Changes date of a specific commit (using history rewriter)
   * @param {string} commitHash - Commit hash to change
   * @param {string|Date} newDate - New date
   * @returns {Promise<Object>} Operation result
   */
  async amendCommitDate(commitHash, newDate) {
    try {
      // Convert date to ISO format
      const date = new Date(newDate);
      const isoDate = date.toISOString();

      // Use history rewriter for more reliable date changing
      const result = await this.historyRewriter.changeCommitDates([{
        hash: commitHash,
        newDate: isoDate
      }]);

      return {
        success: result.success,
        hash: commitHash,
        newDate: isoDate,
        error: result.error
      };
    } catch (error) {
      logger.error(`Cannot change commit date: ${error.message}`);
      return {
        success: false,
        hash: commitHash,
        error: error.message
      };
    }
  }

  /**
   * Changes multiple commit dates at once
   * @param {Array} commitsWithDates - Array of {hash, newDate} objects
   * @returns {Promise<Object>} Operation result
   */
  async amendMultipleCommitDates(commitsWithDates) {
    try {
      logger.info(`Changing dates for ${commitsWithDates.length} commits`);

      // Use history rewriter for batch operation
      const result = await this.historyRewriter.changeCommitDates(commitsWithDates);

      return {
        success: result.success,
        processed: result.processed || commitsWithDates.length,
        error: result.error
      };
    } catch (error) {
      logger.error(`Cannot change multiple commit dates: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Changes commit message
   * @param {string} commitHash - Commit hash to change
   * @param {string} newMessage - New commit message
   * @returns {Promise<Object>} Operation result
   */
  async amendCommitMessage(commitHash, newMessage) {
    try {
      // This only works for the latest commit
      // For historical commits, we need a different approach
      const isLatestCommit = await this.isLatestCommit(commitHash);

      if (isLatestCommit) {
        // Use git commit --amend for latest commit
        await this.git.raw(['commit', '--amend', '-m', newMessage]);

        return {
          success: true,
          hash: commitHash,
          newMessage
        };
      } else {
        // For historical commits, use GitHistoryRewriter
        logger.info(`Changing message for historical commit ${commitHash} using GitHistoryRewriter`);

        try {
          const result = await this.historyRewriter.changeCommitMessage(commitHash, newMessage);

          if (result.success) {
            return {
              success: true,
              hash: commitHash,
              newMessage,
              newHash: result.newHash,
              requiresForcePush: true
            };
          } else {
            return {
              success: false,
              hash: commitHash,
              error: result.error
            };
          }
        } catch (historyError) {
          logger.error(`Failed to rewrite commit message: ${historyError.message}`);
          return {
            success: false,
            hash: commitHash,
            error: `Failed to rewrite commit message: ${historyError.message}`
          };
        }
      }
    } catch (error) {
      logger.error(`Cannot change commit message: ${error.message}`);
      return {
        success: false,
        hash: commitHash,
        error: error.message
      };
    }
  }

  /**
   * Check if a commit is the latest commit
   * @param {string} commitHash - Commit hash
   * @returns {Promise<boolean>} Whether it's the latest commit
   */
  async isLatestCommit(commitHash) {
    try {
      const log = await this.git.log({ maxCount: 1 });
      return log.latest.hash === commitHash || log.latest.hash.startsWith(commitHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Replaces content in repository history
   * @param {Array} replacements - Replacement patterns
   * @param {string} commitHash - Specific commit to target (optional)
   * @returns {Promise<Object>} Operation result
   */
  async replaceContentInHistory(replacements, commitHash = null) {
    try {
      logger.info(`Replacing content in Git history`);

      // Use history rewriter for content replacement
      const result = await this.historyRewriter.replaceContentInHistory(replacements);

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      logger.error(`Cannot replace content in history: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reverts to a specific commit
   * @param {string} commitHash - Commit hash to revert to
   * @param {boolean} hard - Whether to do hard or soft reset
   * @returns {Promise<Object>} Operation result
   */
  async resetCommit(commitHash, hard = false) {
    try {
      const resetMode = hard ? '--hard' : '--soft';
      await this.git.reset([resetMode, commitHash]);

      return {
        success: true,
        hash: commitHash,
        mode: hard ? 'hard' : 'soft'
      };
    } catch (error) {
      logger.error(`Cannot reset commit: ${error.message}`);
      return {
        success: false,
        hash: commitHash,
        error: error.message
      };
    }
  }

  /**
   * Changes a specific file to its state in a specific commit
   * @param {string} commitHash - Reference commit
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Operation result
   */
  async checkoutFileFromCommit(commitHash, filePath) {
    try {
      await this.git.checkout([commitHash, '--', filePath]);

      return {
        success: true,
        hash: commitHash,
        file: filePath
      };
    } catch (error) {
      logger.error(`Cannot checkout file: ${error.message}`);
      return {
        success: false,
        hash: commitHash,
        file: filePath,
        error: error.message
      };
    }
  }

  /**
   * Creates temporary work area
   * @returns {Promise<string>} Work area path
   */
  async createTempWorktree() {
    try {
      const tempDir = path.join(this.repoPath, '.git', 'temp-worktree');
      await fs.ensureDir(tempDir);

      // Worktree support may not be available in older versions, use alternative method:
      return tempDir;
    } catch (error) {
      logger.error(`Cannot create temporary work area: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleans current working tree
   * @returns {Promise<Object>} Operation result
   */
  async cleanWorkingTree() {
    try {
      // Clean changes
      await this.git.clean(['-fd']);

      // Clean staged changes
      await this.git.reset(['--hard']);

      return {
        success: true,
        message: 'Working tree cleaned'
      };
    } catch (error) {
      logger.error(`Cannot clean working tree: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Checks repository status
   * BUG-NEW-011 fix: Return error object instead of throwing for API consistency
   * @returns {Promise<Object>} Repository status
   */
  async getStatus() {
    try {
      const status = await this.git.status();
      return {
        success: true,
        isClean: status.isClean(),
        currentBranch: status.current,
        staged: status.staged,
        modified: status.modified,
        created: status.created,
        deleted: status.deleted
      };
    } catch (error) {
      logger.error(`Cannot get repository status: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file content at specific commit
   * @param {string} commitHash - Commit hash
   * @param {string} filePath - File path
   * @returns {Promise<string>} File content
   */
  async getFileContentAtCommit(commitHash, filePath) {
    try {
      const content = await this.git.show([`${commitHash}:${filePath}`]);
      return content;
    } catch (error) {
      logger.error(`Cannot get file content: ${error.message}`);
      return null;
    }
  }

  /**
   * Create backup before destructive operations
   * @returns {Promise<Object>} Backup result
   */
  async createBackup() {
    try {
      const backupRef = await this.historyRewriter.createBackupBranch();
      return {
        success: true,
        backupRef
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore from backup
   * @param {string} backupRef - Backup reference
   * @returns {Promise<Object>} Restore result
   */
  async restoreFromBackup(backupRef) {
    try {
      await this.historyRewriter.restoreFromBranch(backupRef);
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Force push to remote repository
   * @param {string} remote - Remote name (default: origin)
   * @param {string} branch - Branch name (default: current branch)
   * @returns {Promise<Object>} Operation result
   */
  async forcePush(remote = 'origin', branch = null) {
    try {
      const targetBranch = branch || (await this.getCurrentBranch());

      logger.info(`Force pushing ${targetBranch} to ${remote}...`);

      const result = await this.git.push(remote, `${targetBranch}:${targetBranch}`, ['--force-with-lease']);

      logger.success(`Successfully force pushed to ${remote}/${targetBranch}`);

      return {
        success: true,
        remote,
        branch: targetBranch,
        pushed: true
      };

    } catch (error) {
      logger.error(`Force push failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        remote,
        branch: branch || (await this.getCurrentBranch())
      };
    }
  }
}

module.exports = GitProcessor;