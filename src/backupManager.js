const fs = require('fs-extra');
const path = require('path');
const simpleGit = require('simple-git');
const logger = require('./utils/logger');

/**
 * Backup management class
 * SECURITY: Includes validation to prevent path traversal attacks
 */
class BackupManager {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.backupDir = path.join(repoPath, '.gctm-backups');
    this.git = simpleGit({ baseDir: repoPath });
  }

  /**
   * Validate backup ID format to prevent path traversal
   * @param {string} backupId - Backup ID to validate
   * @returns {boolean} Whether backup ID is valid
   */
  isValidBackupId(backupId) {
    // Backup IDs should be alphanumeric with hyphens only (e.g., backup-2025-01-01T12-00-00-abc123)
    // Prevent path traversal attempts like "../../../etc/passwd"
    if (!backupId || typeof backupId !== 'string') {
      return false;
    }

    // Check format: starts with "backup-", contains only safe characters
    const safePattern = /^backup-[\w-]+$/;
    return safePattern.test(backupId) &&
           !backupId.includes('..') &&
           !backupId.includes('/') &&
           !backupId.includes('\\') &&
           backupId.length > 7 && // At least "backup-" + something
           backupId.length < 256; // Reasonable max length
  }

  /**
   * Creates backup directory
   */
  async ensureBackupDir() {
    await fs.ensureDir(this.backupDir);
  }

  /**
   * Generates a unique backup ID
   * @returns {string} Backup ID
   */
  generateBackupId() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const random = Math.random().toString(36).substring(2, 8);
    return `backup-${timestamp}-${random}`;
  }

  /**
   * Creates backup of current repository state
   * @param {Object} options - Backup options
   * @param {string} options.description - Backup description
   * @param {boolean} options.includeUncommitted - Include uncommitted changes
   * @returns {Promise<Object>} Backup information
   */
  async createBackup(options = {}) {
    try {
      await this.ensureBackupDir();

      const backupId = options.backupId || this.generateBackupId();
      const backupPath = path.join(this.backupDir, backupId);
      const metadataPath = path.join(this.backupDir, `${backupId}.json`);

      logger.info(`Creating backup: ${backupId}`);

      // Create backup directory
      await fs.ensureDir(backupPath);

      // Save repository state
      const repoStatus = await this.git.status();
      const currentBranch = repoStatus.current || 'HEAD';
      const currentCommit = await this.git.revparse(['HEAD']);

      // Store current state
      const backupMetadata = {
        id: backupId,
        createdAt: new Date().toISOString(),
        description: options.description || 'Auto backup',
        repoPath: this.repoPath,
        currentBranch,
        currentCommit: currentCommit.trim(),
        status: {
          isClean: repoStatus.isClean(),
          staged: repoStatus.staged,
          modified: repoStatus.modified,
          created: repoStatus.created,
          deleted: repoStatus.deleted
        },
        options
      };

      // Also backup uncommitted changes
      if (options.includeUncommitted && !repoStatus.isClean()) {
        logger.info('Backing up uncommitted changes...');

        // Save staged changes
        if (repoStatus.staged.length > 0) {
          const stagedPatch = await this.git.diff(['--cached']);
          await fs.writeFile(path.join(backupPath, 'staged.patch'), stagedPatch);
          backupMetadata.hasStagedChanges = true;
        }

        // Save working directory changes
        if (repoStatus.modified.length > 0 || repoStatus.created.length > 0 || repoStatus.deleted.length > 0) {
          const workingPatch = await this.git.diff();
          await fs.writeFile(path.join(backupPath, 'working.patch'), workingPatch);
          backupMetadata.hasWorkingChanges = true;
        }

        // Create stash
        try {
          await this.git.stash(['push', '-m', `GCTM Backup: ${backupId}`]);
          // Store the exact stash reference for reliable restoration
          const stashList = await this.git.stash(['list']);
          const stashLines = stashList.split('\n').filter(line => line.trim());
          if (stashLines.length > 0) {
            // The most recent stash is always stash@{0}
            const stashMatch = stashLines[0].match(/^(stash@\{\d+\})/);
            if (stashMatch) {
              backupMetadata.stashRef = stashMatch[1];
              backupMetadata.hasStash = true;
            } else {
              // Could not extract stash reference
              backupMetadata.hasStash = false;
            }
          } else {
            // No stashes found in list
            backupMetadata.hasStash = false;
          }
        } catch (error) {
          logger.warn('Could not create stash:', error.message);
          backupMetadata.hasStash = false;
        }
      }

      // Save all log
      const log = await this.git.log();
      await fs.writeFile(
        path.join(backupPath, 'commit-log.json'),
        JSON.stringify(log.all, null, 2)
      );

      // Save metadata file
      await fs.writeFile(metadataPath, JSON.stringify(backupMetadata, null, 2));

      logger.info(`Backup completed: ${backupId}`);

      return {
        success: true,
        backupId,
        backupPath,
        metadata: backupMetadata
      };
    } catch (error) {
      logger.error(`Could not create backup: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lists available backups
   * @returns {Promise<Array>} Backup list
   */
  async listBackups() {
    try {
      await this.ensureBackupDir();

      const files = await fs.readdir(this.backupDir);
      const metadataFiles = files.filter(file => file.endsWith('.json'));

      const backups = [];
      for (const file of metadataFiles) {
        try {
          const metadataPath = path.join(this.backupDir, file);
          const metadata = await fs.readJson(metadataPath);
          backups.push(metadata);
        } catch (error) {
          logger.warn(`Could not read backup metadata: ${file}`);
        }
      }

      // Sort by date (newest first)
      backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return backups;
    } catch (error) {
      logger.error(`Could not list backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Restores a specific backup
   * @param {string} backupId - Backup ID to restore
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} Operation result
   */
  async restoreBackup(backupId, options = {}) {
    try {
      // SECURITY: Validate backup ID to prevent path traversal
      if (!this.isValidBackupId(backupId)) {
        return {
          success: false,
          error: `Invalid backup ID format: ${backupId}`
        };
      }

      await this.ensureBackupDir();

      const backupPath = path.join(this.backupDir, backupId);
      const metadataPath = path.join(this.backupDir, `${backupId}.json`);

      // Check if backup exists
      const exists = await fs.pathExists(backupPath);
      const metadataExists = await fs.pathExists(metadataPath);

      if (!exists || !metadataExists) {
        return {
          success: false,
          error: `Backup not found: ${backupId}`
        };
      }

      // Read metadata
      const metadata = await fs.readJson(metadataPath);

      logger.info(`Restoring backup: ${backupId}`);

      // BUG-016 fix: Check for uncommitted changes before dangerous operations
      // BUG-NEW-011 fix: Check success status from getStatus
      // BUG-NEW-031 fix: Explicit boolean check for success status
      if (!options.skipClean && !options.force) {
        const status = await this.git.status();
        // BUG-NEW-031 fix: Explicitly check status.success === true, not just !== false
        if (status && status.success === true && !status.isClean()) {
          const uncommittedFiles = [
            ...status.modified,
            ...status.created,
            ...status.deleted,
            ...status.staged
          ];
          logger.warn(`Warning: ${uncommittedFiles.length} uncommitted changes detected`);
          logger.warn('These changes will be lost during restore. Use {force: true} to proceed anyway.');
          return {
            success: false,
            error: `Uncommitted changes detected: ${uncommittedFiles.slice(0, 5).join(', ')}${uncommittedFiles.length > 5 ? '...' : ''}. Commit or stash changes first, or use {force: true} option.`
          };
        }
      }

      // Clean current state first
      if (!options.skipClean) {
        await this.git.clean(['-fd']);
        await this.git.reset(['--hard']);
      }

      // Return to specified commit
      if (metadata.currentCommit) {
        await this.git.checkout([metadata.currentCommit]);
      }

      // Return to branch (if different)
      if (metadata.currentBranch && metadata.currentBranch !== 'HEAD') {
        try {
          await this.git.checkout([metadata.currentBranch]);
          await this.git.reset(['--hard', metadata.currentCommit]);
        } catch (error) {
          logger.warn(`Could not return to branch: ${metadata.currentBranch}`);
        }
      }

      // BUG-NEW-006 fix: Track stash restoration status
      let stashRestored = false;
      let stashRestoreError = null;

      // Restore uncommitted changes
      if (metadata.hasStash) {
        try {
          const stashList = await this.git.stash(['list']);
          const stashLines = stashList.split('\n').filter(line => line.trim());

          let stashToRestore = null;

          // Method 1: Try to find by exact stash reference (most reliable)
          if (metadata.stashRef) {
            const exactMatch = stashLines.find(line => line.startsWith(metadata.stashRef));
            if (exactMatch) {
              stashToRestore = metadata.stashRef;
              logger.debug(`Found stash by exact reference: ${stashToRestore}`);
            }
          }

          // Method 2: Fallback to searching by backup ID in message
          if (!stashToRestore) {
            const messageMatch = stashLines.find(line => line.includes(`GCTM Backup: ${backupId}`));
            if (messageMatch) {
              const stashMatch = messageMatch.match(/^(stash@\{\d+\})/);
              if (stashMatch) {
                stashToRestore = stashMatch[1];
                logger.debug(`Found stash by message search: ${stashToRestore}`);
              }
            }
          }

          if (stashToRestore) {
            // BUG-NEW-007 fix: Detect and handle stash conflicts
            try {
              await this.git.stash(['pop', stashToRestore]);
              logger.info('Uncommitted changes restored from stash');
              stashRestored = true;
            } catch (popError) {
              // Check if error is due to conflicts
              if (popError.message && (popError.message.includes('CONFLICT') || popError.message.includes('conflict'))) {
                stashRestoreError = `Stash restoration encountered merge conflicts.\n` +
                  `Please resolve conflicts manually:\n` +
                  `  1. Fix conflicts in affected files\n` +
                  `  2. Run: git add <resolved-files>\n` +
                  `  3. Run: git stash drop ${stashToRestore}\n` +
                  `Stash ref for manual recovery: ${stashToRestore}`;
                logger.error('Stash restoration failed due to conflicts');
                logger.info(stashRestoreError);
              } else {
                stashRestoreError = `Could not restore stash: ${popError.message}`;
                logger.warn(stashRestoreError);
              }
            }
          } else {
            stashRestoreError = `Could not find stash for backup: ${backupId}`;
            logger.warn(stashRestoreError);
          }
        } catch (error) {
          stashRestoreError = `Could not restore stash: ${error.message}`;
          logger.warn(stashRestoreError);
        }
      }

      // Apply patch files (alternative method)
      if (!metadata.hasStash) {
        const stagedPatchPath = path.join(backupPath, 'staged.patch');
        const workingPatchPath = path.join(backupPath, 'working.patch');

        if (await fs.pathExists(stagedPatchPath)) {
          try {
            await this.git.apply(['--cached', stagedPatchPath]);
            logger.info('Staged changes restored');
          } catch (error) {
            logger.warn('Could not restore staged changes:', error.message);
          }
        }

        if (await fs.pathExists(workingPatchPath)) {
          try {
            await this.git.apply([workingPatchPath]);
            logger.info('Working directory changes restored');
          } catch (error) {
            logger.warn('Could not restore working directory changes:', error.message);
          }
        }
      }

      // BUG-NEW-006 fix: Report warnings for partial restoration
      const warnings = [];
      if (metadata.hasStash && !stashRestored && stashRestoreError) {
        warnings.push(stashRestoreError);
      }

      logger.info(`Backup successfully restored: ${backupId}${warnings.length > 0 ? ' (with warnings)' : ''}`);

      return {
        success: true,
        backupId,
        restoredTo: metadata.currentCommit,
        warnings: warnings.length > 0 ? warnings : undefined,
        branch: metadata.currentBranch
      };
    } catch (error) {
      logger.error(`Could not restore backup: ${error.message}`);
      return {
        success: false,
        backupId,
        error: error.message
      };
    }
  }

  /**
   * Deletes a backup
   * @param {string} backupId - Backup ID to delete
   * @returns {Promise<Object>} Operation result
   */
  async deleteBackup(backupId) {
    try {
      // SECURITY: Validate backup ID to prevent path traversal
      if (!this.isValidBackupId(backupId)) {
        return {
          success: false,
          error: `Invalid backup ID format: ${backupId}`
        };
      }

      await this.ensureBackupDir();

      const backupPath = path.join(this.backupDir, backupId);
      const metadataPath = path.join(this.backupDir, `${backupId}.json`);

      // Check if backup exists
      const exists = await fs.pathExists(backupPath);
      const metadataExists = await fs.pathExists(metadataPath);

      if (!exists && !metadataExists) {
        return {
          success: false,
          error: `Backup not found: ${backupId}`
        };
      }

      // Delete backup files
      if (exists) {
        await fs.remove(backupPath);
      }

      if (metadataExists) {
        await fs.remove(metadataPath);
      }

      logger.info(`Backup deleted: ${backupId}`);

      return {
        success: true,
        backupId
      };
    } catch (error) {
      logger.error(`Could not delete backup: ${error.message}`);
      return {
        success: false,
        backupId,
        error: error.message
      };
    }
  }

  /**
   * Cleans old backups
   * @param {Object} options - Cleanup options
   * @param {number} options.keepCount - Number of backups to keep
   * @param {number} options.maxAge - Maximum age (in days)
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOldBackups(options = {}) {
    try {
      const { keepCount = 10, maxAge = 30 } = options;

      const backups = await this.listBackups();
      if (backups.length <= keepCount) {
        return {
          success: true,
          message: 'No backups to clean up',
          deleted: 0
        };
      }

      const now = new Date();
      const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // days -> milliseconds

      let deletedCount = 0;
      const backupsToDelete = [];

      // Clean by age
      for (let i = 0; i < backups.length; i++) {
        const backup = backups[i];
        const backupAge = now - new Date(backup.createdAt);

        if (i >= keepCount || backupAge > maxAgeMs) {
          backupsToDelete.push(backup.id);
        }
      }

      // Delete backups
      for (const backupId of backupsToDelete) {
        const result = await this.deleteBackup(backupId);
        if (result.success) {
          deletedCount++;
        }
      }

      logger.info(`${deletedCount} old backups cleaned`);

      return {
        success: true,
        deleted: deletedCount,
        remaining: backups.length - deletedCount
      };
    } catch (error) {
      logger.error(`Could not clean up backups: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Gets backup details
   * @param {string} backupId - Backup ID
   * @returns {Promise<Object>} Backup details
   */
  async getBackupDetails(backupId) {
    try {
      // SECURITY: Validate backup ID to prevent path traversal
      if (!this.isValidBackupId(backupId)) {
        return {
          success: false,
          error: `Invalid backup ID format: ${backupId}`
        };
      }

      const metadataPath = path.join(this.backupDir, `${backupId}.json`);
      const exists = await fs.pathExists(metadataPath);

      if (!exists) {
        return {
          success: false,
          error: `Backup not found: ${backupId}`
        };
      }

      const metadata = await fs.readJson(metadataPath);
      const backupPath = path.join(this.backupDir, backupId);

      // Add additional information
      const backupSize = await this.getDirectorySize(backupPath);
      metadata.size = backupSize;

      return {
        success: true,
        backup: metadata
      };
    } catch (error) {
      logger.error(`Could not get backup details: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculates directory size
   * @param {string} dirPath - Directory path
   * @returns {Promise<number>} Size (in bytes)
   */
  async getDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = BackupManager;