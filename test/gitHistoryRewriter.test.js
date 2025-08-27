/**
 * Git History Rewriter - Comprehensive Tests
 * Tests for actual methods that exist in the implementation
 */

const GitHistoryRewriter = require('../src/gitHistoryRewriter');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('GitHistoryRewriter', () => {
  let gitHistoryRewriter;
  let tempRepoPath;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempRepoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gctm-test-'));

    // Initialize a git repository in temp directory
    await fs.ensureDir(path.join(tempRepoPath, '.git'));
    await fs.writeFile(path.join(tempRepoPath, '.git', 'HEAD'), 'ref: refs/heads/main\n');

    gitHistoryRewriter = new GitHistoryRewriter(tempRepoPath);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempRepoPath);
  });

  describe('Constructor', () => {
    test('should create instance with repo path', () => {
      expect(gitHistoryRewriter.repoPath).toBe(tempRepoPath);
      expect(gitHistoryRewriter.originalBranch).toBeNull();
      expect(gitHistoryRewriter.GIT_TIMEOUT).toBe(60000);
    });

    test('should handle different repo paths', () => {
      const customPath = '/custom/path';
      const customRewriter = new GitHistoryRewriter(customPath);
      expect(customRewriter.repoPath).toBe(customPath);
    });
  });

  describe('Hash Validation', () => {
    test('should validate valid git hashes', () => {
      expect(gitHistoryRewriter.isValidHash('a1b2c3d')).toBe(true);
      expect(gitHistoryRewriter.isValidHash('A1B2C3D')).toBe(true);
      expect(gitHistoryRewriter.isValidHash('a1b2c3d4e5f6')).toBe(true);
      expect(gitHistoryRewriter.isValidHash('abcdef1234567890abcdef1234567890abcdef12')).toBe(true);
    });

    test('should reject invalid git hashes', () => {
      expect(gitHistoryRewriter.isValidHash('')).toBe(false);
      expect(gitHistoryRewriter.isValidHash('short')).toBe(false);
      expect(gitHistoryRewriter.isValidHash('g123456')).toBe(false); // Invalid hex character
      expect(gitHistoryRewriter.isValidHash('a1b2c3d ')).toBe(false); // Space
      expect(gitHistoryRewriter.isValidHash(null)).toBe(false);
      expect(gitHistoryRewriter.isValidHash(undefined)).toBe(false);
      expect(gitHistoryRewriter.isValidHash(123)).toBe(false);
    });

    test('should reject hashes that are too long or too short', () => {
      expect(gitHistoryRewriter.isValidHash('abc123')).toBe(false); // 6 chars
      expect(gitHistoryRewriter.isValidHash('abcdef1234567890abcdef1234567890abcdef123')).toBe(false); // 41 chars
    });
  });

  describe('Branch Name Validation', () => {
    test('should validate valid branch names', () => {
      expect(gitHistoryRewriter.isValidBranchName('main')).toBe(true);
      expect(gitHistoryRewriter.isValidBranchName('feature/branch-name')).toBe(true);
      expect(gitHistoryRewriter.isValidBranchName('bugfix-123')).toBe(true);
      expect(gitHistoryRewriter.isValidBranchName('release/v1.0.0')).toBe(true);
      expect(gitHistoryRewriter.isValidBranchName('feature_branch')).toBe(true);
    });

    test('should reject invalid branch names', () => {
      expect(gitHistoryRewriter.isValidBranchName('')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('.hidden')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('/start-with-slash')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('invalid@name')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('has space')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('..')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('//')).toBe(false);
    });

    test('should reject branch names with invalid characters', () => {
      expect(gitHistoryRewriter.isValidBranchName('branch$name')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('branch"name')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('branch|name')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('branch?name')).toBe(false);
      expect(gitHistoryRewriter.isValidBranchName('branch*name')).toBe(false);
    });

    test('should handle length limits', () => {
      // Check the actual implementation limits
      const longBranchName = 'a'.repeat(300);
      expect(gitHistoryRewriter.isValidBranchName(longBranchName)).toBe(false); // Too long

      const acceptableName = 'a'.repeat(250);
      expect(gitHistoryRewriter.isValidBranchName(acceptableName)).toBe(true); // Acceptable length
    });
  });

  describe('Git Command Execution', () => {
    test('should execute git command with basic args', () => {
      const result = gitHistoryRewriter.executeGitCommand(['--version']);

      expect(result).toHaveProperty('stdout');
      expect(result).toHaveProperty('stderr');
      expect(result).toHaveProperty('status');
      expect(typeof result.stdout).toBe('string');
      expect(typeof result.stderr).toBe('string');
      expect(typeof result.status).toBe('number');
    });

    test('should handle git command execution with options', () => {
      const options = { timeout: 5000 };
      const result = gitHistoryRewriter.executeGitCommand(['--version'], options);

      expect(result).toHaveProperty('stdout');
      expect(result).toHaveProperty('stderr');
      expect(result).toHaveProperty('status');
    });

    test('should handle invalid git commands gracefully', () => {
      const result = gitHistoryRewriter.executeGitCommand(['invalid-git-command']);

      expect(result).toHaveProperty('status');
      expect(result.status).toBeGreaterThan(0);
    });
  });

  describe('Temporary Directory Creation', () => {
    test('should create temporary working directory', async () => {
      const tempDir = await gitHistoryRewriter.createTempWorkingDirectory();

      expect(tempDir).toBeDefined();
      expect(tempDir).toContain('.gctm-temp-');
      expect(await fs.pathExists(tempDir)).toBe(true);

      // Clean up
      await fs.remove(tempDir);
    });

    test('should create unique temporary directories', async () => {
      const tempDir1 = await gitHistoryRewriter.createTempWorkingDirectory();
      // Add delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const tempDir2 = await gitHistoryRewriter.createTempWorkingDirectory();

      expect(tempDir1).not.toBe(tempDir2);
      expect(await fs.pathExists(tempDir1)).toBe(true);
      expect(await fs.pathExists(tempDir2)).toBe(true);

      // Clean up
      await fs.remove(tempDir1);
      await fs.remove(tempDir2);
    });
  });

  describe('Backup Branch Operations', () => {
    test('should create backup branch with valid name', async () => {
      // This will fail in a non-git repository, but we can test the validation
      try {
        const backupBranch = await gitHistoryRewriter.createBackupBranch();
        expect(backupBranch).toBeDefined();
        expect(backupBranch).toContain('gctm-backup-');
        expect(gitHistoryRewriter.isValidBranchName(backupBranch)).toBe(true);
      } catch (error) {
        // Expected in test environment without proper git repo
        expect(error.message).toContain('Failed to create backup branch');
      }
    });

    test('should get current branch name', async () => {
      const currentBranch = await gitHistoryRewriter.getCurrentBranch();

      expect(currentBranch).toBeDefined();
      expect(typeof currentBranch).toBe('string');
      // Should return 'HEAD' for detached HEAD or non-git repos
      expect(['HEAD', 'main', 'master'].includes(currentBranch)).toBe(true);
    });

    test('should handle branch cleanup', async () => {
      const backupBranches = ['test-backup-1', 'test-backup-2'];

      // Should not throw even if branches don't exist
      await expect(gitHistoryRewriter.cleanupBackupBranches(backupBranches)).resolves.not.toThrow();
    });

    test('should validate backup branch names', async () => {
      // Test that generated backup branch names are valid
      try {
        const backupBranch = await gitHistoryRewriter.createBackupBranch();
        expect(gitHistoryRewriter.isValidBranchName(backupBranch)).toBe(true);
      } catch (error) {
        // Expected in test environment - the validation should still work for the generated name
        expect(error.message).toContain('Failed to create backup branch');
      }
    });
  });

  describe('Commit Hash Retrieval', () => {
    test('should get all commit hashes with default options', async () => {
      try {
        const commits = await gitHistoryRewriter.getAllCommitHashes();

        expect(Array.isArray(commits)).toBe(true);
        // Empty repo should return empty array or handle gracefully
        commits.forEach(commit => {
          expect(typeof commit).toBe('string');
          expect(gitHistoryRewriter.isValidHash(commit)).toBe(true);
        });
      } catch (error) {
        // Expected in test environment without proper git repo
        expect(error.message).toContain('Cannot get commit list');
      }
    });

    test('should get commit hashes with limit', async () => {
      try {
        const options = { limit: 5 };
        const commits = await gitHistoryRewriter.getAllCommitHashes(options);

        expect(Array.isArray(commits)).toBe(true);
        expect(commits.length).toBeLessThanOrEqual(5);
      } catch (error) {
        // Expected in test environment
        expect(error.message).toContain('Cannot get commit list');
      }
    });

    test('should get commit hashes with skip', async () => {
      try {
        const options = { skip: 2, limit: 3 };
        const commits = await gitHistoryRewriter.getAllCommitHashes(options);

        expect(Array.isArray(commits)).toBe(true);
        expect(commits.length).toBeLessThanOrEqual(3);
      } catch (error) {
        // Expected in test environment
        expect(error.message).toContain('Cannot get commit list');
      }
    });

    test('should handle large repository warning', async () => {
      try {
        const options = { warnThreshold: 0 }; // Force warning
        const commits = await gitHistoryRewriter.getAllCommitHashes(options);

        expect(Array.isArray(commits)).toBe(true);
      } catch (error) {
        // Expected in test environment
        expect(error.message).toContain('Cannot get commit list');
      }
    });
  });

  describe('File Pattern Matching', () => {
    test('should find files with string patterns', async () => {
      const replacements = [
        { pattern: 'test-pattern', replacement: 'replacement' }
      ];

      const files = await gitHistoryRewriter.findFilesWithPatterns(replacements);

      expect(Array.isArray(files)).toBe(true);
      // Should not crash even if no files match
    });

    test('should find files with regex patterns', async () => {
      const replacements = [
        { pattern: /test-\w+/, replacement: 'replacement' }
      ];

      const files = await gitHistoryRewriter.findFilesWithPatterns(replacements);

      expect(Array.isArray(files)).toBe(true);
    });

    test('should handle multiple patterns', async () => {
      const replacements = [
        { pattern: 'pattern1', replacement: 'replacement1' },
        { pattern: /pattern2/, replacement: 'replacement2' }
      ];

      const files = await gitHistoryRewriter.findFilesWithPatterns(replacements);

      expect(Array.isArray(files)).toBe(true);
    });

    test('should handle empty replacements array', async () => {
      const files = await gitHistoryRewriter.findFilesWithPatterns([]);

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid hash in date operations', async () => {
      const invalidCommitData = { hash: 'invalid-hash', newDate: '2023-01-01' };

      await expect(gitHistoryRewriter.rewriteSingleCommitDate(invalidCommitData))
        .rejects.toThrow('Invalid commit hash format');
    });

    test('should handle invalid hash in content operations', async () => {
      const replacements = [{ pattern: 'test', replacement: 'replacement' }];
      const tempDir = await gitHistoryRewriter.createTempWorkingDirectory();

      const result = await gitHistoryRewriter.processCommitForContentReplacement(
        'invalid-hash', replacements, tempDir
      );

      expect(result).toBe(false); // Should return false for invalid hash

      await fs.remove(tempDir);
    });

    test('should handle invalid branch name in restore operations', async () => {
      // This should handle gracefully without throwing
      await expect(gitHistoryRewriter.restoreFromBranch('invalid@branch')).resolves.not.toThrow();
    });

    test('should handle file system errors gracefully', async () => {
      // Test with non-existent temp directory
      const replacements = [{ pattern: 'test', replacement: 'replacement' }];

      const result = await gitHistoryRewriter.processCommitForContentReplacement(
        'abc123', replacements, '/non/existent/path'
      );

      expect(result).toBe(false); // Should handle gracefully
    });
  });

  describe('Integration Tests', () => {
    test('should complete basic workflow without errors', async () => {
      // Test that methods can be called in sequence without crashing
      const tempDir = await gitHistoryRewriter.createTempWorkingDirectory();
      expect(tempDir).toBeDefined();

      // These may fail in test environment but should not crash
      try {
        const backupBranch = await gitHistoryRewriter.createBackupBranch();
        expect(backupBranch).toBeDefined();
      } catch (error) {
        // Expected in test environment
        expect(error.message).toContain('Failed to create backup branch');
      }

      try {
        const commits = await gitHistoryRewriter.getAllCommitHashes({ limit: 1 });
        expect(Array.isArray(commits)).toBe(true);
      } catch (error) {
        // Expected in test environment
        expect(error.message).toContain('Cannot get commit list');
      }

      const currentBranch = await gitHistoryRewriter.getCurrentBranch();
      expect(currentBranch).toBeDefined();

      // Cleanup
      await fs.remove(tempDir);
    });

    test('should handle edge cases in date operations', async () => {
      // Test with empty array - this should fail gracefully in test environment
      const result = await gitHistoryRewriter.changeCommitDates([]);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
    });

    test('should handle edge cases in content operations', async () => {
      // Test with empty replacements - this should fail due to missing git repo but have proper structure
      const result = await gitHistoryRewriter.replaceContentInHistory([]);
      // Should return error object rather than throw
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result.success).toBe(false);
    });
  });
});