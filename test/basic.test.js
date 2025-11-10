/**
 * Git Commit Time Machine - Basic Tests
 */

const GitCommitTimeMachine = require('../src/index');
const DateManager = require('../src/dateManager');
const ContentEditor = require('../src/contentEditor');
const Validator = require('../src/utils/validator');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('GitCommitTimeMachine', () => {
  let gctm;
  let testRepoPath;

  beforeEach(async () => {
    // Create temporary test directory
    testRepoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gctm-test-'));

    // Create test repo
    const simpleGit = require('simple-git');
    const git = simpleGit({ baseDir: testRepoPath });
    await git.init();
    await git.addConfig('user.name', 'Test User');
    await git.addConfig('user.email', 'test@example.com');

    // Create test files
    await fs.writeFile(path.join(testRepoPath, 'test1.txt'), 'Test content 1');
    await git.add(['test1.txt']);
    await git.commit('Initial commit');

    await fs.writeFile(path.join(testRepoPath, 'test2.txt'), 'Test content 2');
    await git.add(['test2.txt']);
    await git.commit('Second commit');

    // Create GCTM instance
    gctm = new GitCommitTimeMachine({ repoPath: testRepoPath });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.remove(testRepoPath);
  });

  describe('Constructor', () => {
    test('should create instance with default options', () => {
      const instance = new GitCommitTimeMachine();
      expect(instance.repoPath).toBe(process.cwd());
    });

    test('should create instance with custom repo path', () => {
      const instance = new GitCommitTimeMachine({ repoPath: testRepoPath });
      expect(instance.repoPath).toBe(testRepoPath);
    });
  });

  describe('GitProcessor', () => {
    test('should be a valid git repo', async () => {
      const isGitRepo = await gctm.gitProcessor.isGitRepo();
      expect(isGitRepo).toBe(true);
    });

    test('should get commits', async () => {
      const commits = await gctm.gitProcessor.getCommits();
      expect(commits).toHaveLength(2);
      expect(commits[0]).toHaveProperty('hash');
      expect(commits[0]).toHaveProperty('message');
    });

    test('should get commits with limit', async () => {
      const commits = await gctm.gitProcessor.getCommits({ limit: 1 });
      expect(commits).toHaveLength(1);
    });

    test('should get commit files', async () => {
      const files = await gctm.gitProcessor.getCommitFiles('HEAD');
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('DateManager', () => {
    let dateManager;

    beforeEach(() => {
      dateManager = new DateManager();
    });

    test('should validate date range', () => {
      const valid = dateManager.validateDateRange('2023-01-01', '2023-01-31');
      expect(valid).toBe(true);

      const invalid = dateManager.validateDateRange('2023-01-31', '2023-01-01');
      expect(invalid).toBe(false);
    });

    test('should generate date range', () => {
      const dates = dateManager.generateDateRange('2023-01-01', '2023-01-05', 5);
      expect(dates).toHaveLength(5);

      // Check that dates are in correct order
      const sortedDates = [...dates].sort();
      expect(dates).toEqual(sortedDates);
    });

    test('should filter commits by date', () => {
      const commits = [
        { date: new Date('2023-01-01'), message: 'Commit 1' },
        { date: new Date('2023-01-15'), message: 'Commit 2' },
        { date: new Date('2023-02-01'), message: 'Commit 3' }
      ];

      const januaryCommits = dateManager.filterCommitsBetween(commits, '2023-01-01', '2023-01-31');
      expect(januaryCommits).toHaveLength(2);
    });

    test('should format date', () => {
      const formatted = dateManager.formatDate('2023-01-01', 'DD/MM/YYYY');
      expect(formatted).toBe('01/01/2023');
    });
  });

  describe('ContentEditor', () => {
    let contentEditor;
    let testFilePath;

    beforeEach(async () => {
      contentEditor = new ContentEditor(testRepoPath);
      testFilePath = path.join(testRepoPath, 'test-content.txt');

      await fs.writeFile(testFilePath, `
API_KEY=secret123
DATABASE_URL=postgresql://user:pass@localhost/db
EMAIL=admin@example.com
`);
    });

    afterEach(async () => {
      await fs.remove(testFilePath);
    });

    test('should edit file with string replacement', async () => {
      const result = await contentEditor.editFile(testFilePath, [
        { pattern: 'secret123', replacement: '***HIDDEN***' }
      ]);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);

      const content = await fs.readFile(testFilePath, 'utf8');
      expect(content).toContain('***HIDDEN***');
      expect(content).not.toContain('secret123');
    });

    test('should edit file with regex replacement', async () => {
      const result = await contentEditor.editFile(testFilePath, [
        {
          pattern: /API_KEY=.*/g,
          replacement: 'API_KEY=***HIDDEN***'
        }
      ]);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);

      const content = await fs.readFile(testFilePath, 'utf8');
      expect(content).toContain('API_KEY=***HIDDEN***');
    });

    test('should detect sensitive data', () => {
      const content = `
Email: user@example.com
Phone: +1-555-123-4567
API_KEY=secret123
URL: https://example.com
`;

      const sensitive = contentEditor.detectSensitiveData(content);
      expect(sensitive.email).toHaveLength(1);
      expect(sensitive.phone).toHaveLength(1);
      expect(sensitive.apiKeys).toHaveLength(1);
      expect(sensitive.url).toHaveLength(1);
    });

    test('should sanitize file', async () => {
      const result = await contentEditor.sanitizeFile(testFilePath, {
        hideEmails: true,
        hideApiKeys: true
      });

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);

      const content = await fs.readFile(testFilePath, 'utf8');
      expect(content).toContain('***EMAIL***');
      expect(content).toContain('***API_KEY***');
    });
  });

  describe('BackupManager', () => {
    test('should create backup', async () => {
      const result = await gctm.backupManager.createBackup({
        description: 'Test backup'
      });

      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    test('should list backups', async () => {
      // First create a backup
      await gctm.backupManager.createBackup({
        description: 'Test backup for listing'
      });

      const backups = await gctm.listBackups();
      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBeGreaterThan(0);

      const hasTestBackup = backups.some(backup =>
        backup.description && backup.description.includes('Test backup')
      );
      expect(hasTestBackup).toBe(true);
    });

    test('should delete backup', async () => {
      const backupResult = await gctm.backupManager.createBackup();
      const backupId = backupResult.backupId;

      const deleteResult = await gctm.backupManager.deleteBackup(backupId);
      expect(deleteResult.success).toBe(true);

      const backups = await gctm.listBackups();
      const hasDeletedBackup = backups.some(backup => backup.id === backupId);
      expect(hasDeletedBackup).toBe(false);
    });
  });

  describe('Validator', () => {
    test('should validate date format', () => {
      expect(Validator.isValidDateFormat('2023-01-01')).toBe(true);
      expect(Validator.isValidDateFormat('01/01/2023')).toBe(false);
      expect(Validator.isValidDateFormat('invalid-date')).toBe(false);
    });

    test('should validate git hash', () => {
      expect(Validator.isValidGitHash('a1b2c3d')).toBe(true);
      expect(Validator.isValidGitHash('a1b2c3d4e5f6')).toBe(true);
      expect(Validator.isValidGitHash('invalid')).toBe(false);
    });

    test('should validate email', () => {
      expect(Validator.isValidEmail('user@example.com')).toBe(true);
      expect(Validator.isValidEmail('invalid-email')).toBe(false);
    });

    test('should validate date range', () => {
      const valid = Validator.validateDateRange('2023-01-01', '2023-01-31');
      expect(valid.isValid).toBe(true);
      expect(valid.errors).toHaveLength(0);

      const invalid = Validator.validateDateRange('2023-01-31', '2023-01-01');
      expect(invalid.isValid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThan(0);
    });

    test('should validate commit options', () => {
      const valid = Validator.validateCommitOptions({
        commitId: 'a1b2c3d',
        newMessage: 'New commit message'
      });
      expect(valid.isValid).toBe(true);

      const invalid = Validator.validateCommitOptions({
        commitId: 'invalid-hash'
      });
      expect(invalid.isValid).toBe(false);
    });

    test('should validate replacements', () => {
      const valid = Validator.validateReplacements([
        { pattern: 'search', replacement: 'replace' }
      ]);
      expect(valid.isValid).toBe(true);

      const invalid = Validator.validateReplacements([
        { pattern: '', replacement: 'replace' }
      ]);
      expect(invalid.isValid).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should complete full workflow', async () => {
      // 1. Create backup
      const backupResult = await gctm.backupManager.createBackup();
      expect(backupResult.success).toBe(true);

      // 2. Get commits
      const commits = await gctm.gitProcessor.getCommits();
      expect(commits.length).toBeGreaterThan(0);

      // 3. Create test file
      const testFile = path.join(testRepoPath, 'integration-test.txt');
      await fs.writeFile(testFile, 'API_KEY=secret123');

      // 4. Sanitize file
      const sanitizeResult = await gctm.contentEditor.sanitizeFile(testFile);
      expect(sanitizeResult.success).toBe(true);

      // 5. Clean up
      await fs.remove(testFile);
    });
  });
});