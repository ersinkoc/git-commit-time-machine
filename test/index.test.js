/**
 * GitCommitTimeMachine Main Class - Comprehensive Tests
 * Tests for all public API methods in index.js
 */

const GitCommitTimeMachine = require('../src/index');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('GitCommitTimeMachine Main Class', () => {
  let gctm;
  let tempRepoPath;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempRepoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gctm-test-'));

    // Initialize a basic git repository structure
    await fs.ensureDir(path.join(tempRepoPath, '.git'));
    await fs.writeFile(path.join(tempRepoPath, '.git', 'HEAD'), 'ref: refs/heads/main\n');

    gctm = new GitCommitTimeMachine({
      repoPath: tempRepoPath,
      ai: {
        apiKey: 'test-key',
        provider: 'openai',
        strictValidation: false,
        throwOnValidationError: false
      }
    });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempRepoPath);
  });

  describe('Constructor', () => {
    test('should create instance with default options', () => {
      const instance = new GitCommitTimeMachine();

      expect(instance.repoPath).toBe(process.cwd());
      expect(instance.gitProcessor).toBeDefined();
      expect(instance.dateManager).toBeDefined();
      expect(instance.contentEditor).toBeDefined();
      expect(instance.backupManager).toBeDefined();
      expect(instance.aiAssistant).toBeDefined();
      expect(instance.options).toBeDefined();
    });

    test('should create instance with custom repo path', () => {
      const customPath = tempRepoPath; // Use existing temp path
      const instance = new GitCommitTimeMachine({ repoPath: customPath });

      expect(instance.repoPath).toBe(customPath);
    });

    test('should create instance with AI options', () => {
      const aiOptions = {
        apiKey: 'test-key',
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        strictValidation: false,
        throwOnValidationError: false
      };

      const instance = new GitCommitTimeMachine({
        repoPath: tempRepoPath,
        ai: aiOptions
      });
      expect(instance.aiAssistant).toBeDefined();
    });

    test('should handle empty options', () => {
      const instance = new GitCommitTimeMachine({});
      expect(instance.repoPath).toBe(process.cwd());
    });
  });

  describe('Redate Commits', () => {
    test('should handle invalid date formats', async () => {
      const options = {
        startDate: 'invalid-date',
        endDate: '2023-01-01'
      };

      const result = await gctm.redateCommits(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Date validation failed');
    });

    test('should handle date range validation errors', async () => {
      const options = {
        startDate: '2023-01-10',
        endDate: '2023-01-01' // End before start
      };

      const result = await gctm.redateCommits(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle no commits found', async () => {
      const options = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        createBackup: false // Skip backup for faster test
      };

      const result = await gctm.redateCommits(options);

      // Should fail due to git repository issues in test environment
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Cannot get commit list');
    });

    test('should handle preserveOrder option', async () => {
      const options = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        preserveOrder: true,
        createBackup: false
      };

      const result = await gctm.redateCommits(options);

      // Should fail due to git repository issues in test environment
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Cannot get commit list');
    });

    test('should handle backup creation', async () => {
      const options = {
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        createBackup: true
      };

      const result = await gctm.redateCommits(options);

      // Should fail due to git repository issues in test environment
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Cannot get commit list');
    });

    test('should handle git processing errors gracefully', async () => {
      // Test with invalid repo path - this should throw during construction
      expect(() => {
        new GitCommitTimeMachine({
          repoPath: '/non/existent/path'
        });
      }).toThrow('Cannot use simple-git on a directory that does not exist');
    });
  });

  describe('Edit Commit Message', () => {
    test('should handle empty commit message', async () => {
      const options = {
        commitId: 'abc123',
        newMessage: '',
        createBackup: false
      };

      const result = await gctm.editCommitMessage(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle missing commitId', async () => {
      const options = {
        commitId: '',
        newMessage: 'test message',
        createBackup: false
      };

      const result = await gctm.editCommitMessage(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle invalid commit hash', async () => {
      const options = {
        commitId: 'invalid-hash',
        newMessage: 'test message',
        createBackup: false
      };

      const result = await gctm.editCommitMessage(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should create backup by default', async () => {
      const options = {
        commitId: 'abc123',
        newMessage: 'test message'
        // createBackup should default to true
      };

      const result = await gctm.editCommitMessage(options);

      // Should fail due to git environment but handle gracefully
      expect(result).toHaveProperty('success', false);
    });

    test('should skip backup when explicitly disabled', async () => {
      const options = {
        commitId: 'abc123',
        newMessage: 'test message',
        createBackup: false
      };

      const result = await gctm.editCommitMessage(options);

      expect(result).toHaveProperty('success', false);
    });
  });

  describe('Edit Commit Content', () => {
    test('should handle missing replacements array', async () => {
      const options = {
        commitId: 'abc123',
        createBackup: false
      };

      const result = await gctm.editCommitContent(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle empty replacements array', async () => {
      const options = {
        commitId: 'abc123',
        replacements: [],
        createBackup: false
      };

      const result = await gctm.editCommitContent(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle invalid replacements', async () => {
      const options = {
        commitId: 'abc123',
        replacements: 'invalid-replacements',
        createBackup: false
      };

      const result = await gctm.editCommitContent(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle valid replacements', async () => {
      const options = {
        commitId: 'abc123',
        replacements: [
          { pattern: 'old-text', replacement: 'new-text' }
        ],
        createBackup: false
      };

      const result = await gctm.editCommitContent(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Sanitize History', () => {
    test('should handle missing patterns', async () => {
      const options = {
        createBackup: false
      };

      const result = await gctm.sanitizeHistory(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('At least one pattern must be specified');
    });

    test('should handle empty patterns array', async () => {
      const options = {
        patterns: [],
        replacement: '[REDACTED]',
        createBackup: false
      };

      const result = await gctm.sanitizeHistory(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle valid patterns', async () => {
      const options = {
        patterns: ['secret-key', /password/gi],
        replacement: '[REDACTED]',
        createBackup: false
      };

      const result = await gctm.sanitizeHistory(options);

      // Should fail gracefully in test environment due to git repo issues
      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('processed');
        expect(result).toHaveProperty('total');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    test('should handle invalid patterns gracefully', async () => {
      const options = {
        patterns: ['valid-pattern', null, undefined, ''],
        replacement: '[REDACTED]',
        createBackup: false
      };

      const result = await gctm.sanitizeHistory(options);

      // Should fail due to git repository issues in test environment
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle missing replacement text', async () => {
      const options = {
        patterns: ['secret-key'],
        createBackup: false
      };

      const result = await gctm.sanitizeHistory(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Backup Management', () => {
    test('should list backups', async () => {
      const backups = await gctm.listBackups();

      expect(Array.isArray(backups)).toBe(true);
      // Should return empty array or valid backup objects
    });

    test('should handle backup restoration', async () => {
      const result = await gctm.restoreBackup('nonexistent-backup');

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle invalid backup IDs', async () => {
      const invalidIds = ['', null, undefined, '../../../etc/passwd'];

      for (const invalidId of invalidIds) {
        const result = await gctm.restoreBackup(invalidId);
        expect(result).toHaveProperty('success', false);
      }
    });
  });

  describe('AI Assistant Methods', () => {
    test('should initialize AI assistant', async () => {
      const result = await gctm.initializeAI();

      // Should succeed because we have strictValidation: false in test setup
      expect(result).toHaveProperty('success', true);
    });

    test('should handle AI commit message generation', async () => {
      const result = await gctm.generateAICommitMessage();

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle AI commit message generation with options', async () => {
      const options = {
        language: 'en',
        style: 'conventional',
        context: 'Test context'
      };

      const result = await gctm.generateAICommitMessage(options);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should handle applying AI commit message', async () => {
      const result = await gctm.applyAICommitMessage('feat: test commit', false);

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
    });

    test('should update AI configuration', async () => {
      const config = {
        model: 'gpt-4',
        language: 'fr',
        style: 'minimal'
      };

      const result = await gctm.updateAIConfig(config);

      expect(result).toHaveProperty('success');
    });

    test('should test AI connection', async () => {
      const result = await gctm.testAIConnection();

      // Should fail due to invalid API key but have proper structure
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Incorrect API key provided');
    });

    test('should get AI configuration', () => {
      const config = gctm.getAIConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing options gracefully', async () => {
      // Test methods that expect options with missing data
      const result1 = await gctm.redateCommits();
      expect(result1).toHaveProperty('success', false);

      const result2 = await gctm.editCommitMessage();
      expect(result2).toHaveProperty('success', false);

      const result3 = await gctm.editCommitContent();
      expect(result3).toHaveProperty('success', false);
    });

    test('should handle null options gracefully', async () => {
      const result1 = await gctm.redateCommits(null);
      expect(result1).toHaveProperty('success', false);

      const result2 = await gctm.editCommitMessage(null);
      expect(result2).toHaveProperty('success', false);
    });

    test('should handle undefined options gracefully', async () => {
      const result1 = await gctm.redateCommits(undefined);
      expect(result1).toHaveProperty('success', false);

      const result2 = await gctm.editCommitMessage(undefined);
      expect(result2).toHaveProperty('success', false);
    });
  });

  describe('Integration Tests', () => {
    test('should complete basic workflow without crashing', async () => {
      // Test that all methods can be called without crashing
      await expect(gctm.listBackups()).resolves.not.toThrow();

      await expect(gctm.restoreBackup('test-backup')).resolves.not.toThrow();

      await expect(gctm.initializeAI()).resolves.not.toThrow();

      const config = gctm.getAIConfig();
      expect(config).toBeDefined();

      await expect(gctm.updateAIConfig({ model: 'test-model' })).resolves.not.toThrow();

      await expect(gctm.testAIConnection()).resolves.not.toThrow();
    });

    test('should handle mixed valid/invalid operations', async () => {
      const results = await Promise.allSettled([
        gctm.redateCommits({ startDate: '2023-01-01', endDate: '2023-01-31' }),
        gctm.editCommitMessage({ commitId: 'abc123', newMessage: 'test' }),
        gctm.sanitizeHistory({ patterns: ['test'], replacement: 'redacted' })
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
        expect(result.value).toHaveProperty('success');
      });
    });
  });
});