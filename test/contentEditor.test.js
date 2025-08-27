const ContentEditor = require('../src/contentEditor');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

describe('ContentEditor', () => {
  let contentEditor;
  let testRepoPath;
  let tempDir;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contenteditor-test-'));
    testRepoPath = tempDir;

    // Initialize a git repository for tests that need it
    await fs.ensureDir(path.join(testRepoPath, '.git'));

    contentEditor = new ContentEditor(testRepoPath);
  });

  afterEach(async () => {
    // Clean up temporary directory
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  describe('Constructor', () => {
    test('should create instance with repo path', () => {
      expect(contentEditor.repoPath).toBe(path.resolve(testRepoPath));
    });

    test('should normalize repository path', () => {
      const unnormalizedPath = path.join(testRepoPath, '.', 'subdir', '..');
      const editor = new ContentEditor(unnormalizedPath);
      expect(editor.repoPath).toBe(path.resolve(testRepoPath));
    });
  });

  describe('isPathSafe', () => {
    test('should allow safe paths within repository', () => {
      const safePath = path.join(testRepoPath, 'file.txt');
      expect(contentEditor.isPathSafe(safePath)).toBe(true);
    });

    test('should allow paths to repository root', () => {
      expect(contentEditor.isPathSafe(testRepoPath)).toBe(true);
    });

    test('should reject paths outside repository', () => {
      const outsidePath = path.join(testRepoPath, '..', 'outside.txt');
      expect(contentEditor.isPathSafe(outsidePath)).toBe(false);
    });

    test('should reject path traversal attempts', () => {
      const traversalPath = path.join(testRepoPath, '..', 'etc', 'passwd');
      expect(contentEditor.isPathSafe(traversalPath)).toBe(false);
    });

    test('should handle invalid paths gracefully', () => {
      expect(contentEditor.isPathSafe(null)).toBe(false);
      expect(contentEditor.isPathSafe(undefined)).toBe(false);
    });
  });

  describe('safePath', () => {
    test('should resolve safe relative paths', () => {
      const safePath = contentEditor.safePath('subdir/file.txt');
      expect(safePath).toBe(path.join(testRepoPath, 'subdir', 'file.txt'));
    });

    test('should handle root-level paths', () => {
      const safePath = contentEditor.safePath('file.txt');
      expect(safePath).toBe(path.join(testRepoPath, 'file.txt'));
    });

    test('should normalize paths with mixed separators', () => {
      const safePath = contentEditor.safePath('subdir\\file.txt');
      expect(safePath).toBe(path.join(testRepoPath, 'subdir', 'file.txt'));
    });

    test('should throw error for path traversal attempts', () => {
      expect(() => {
        contentEditor.safePath('../outside.txt');
      }).toThrow('Path traversal attempt detected: ../outside.txt');

      expect(() => {
        contentEditor.safePath('../../etc/passwd');
      }).toThrow('Path traversal attempt detected: ../../etc/passwd');
    });

    test('should throw error for paths outside repository', () => {
      expect(() => {
        contentEditor.safePath(path.join(testRepoPath, '..', 'outside.txt'));
      }).toThrow('Path traversal attempt detected');
    });
  });

  describe('editFile', () => {
    beforeEach(async () => {
      // Create test file
      const testFilePath = path.join(testRepoPath, 'test.txt');
      await fs.writeFile(testFilePath, 'Hello world\nSecret API_KEY=12345\nEmail: test@example.com');
    });

    test('should edit file with string replacement', async () => {
      const testFilePath = path.join(testRepoPath, 'test.txt');
      const replacements = [
        { pattern: 'Hello world', replacement: 'Hello universe' }
      ];

      const result = await contentEditor.editFile(testFilePath, replacements);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.appliedReplacements).toHaveLength(1);
      expect(result.appliedReplacements[0].type).toBe('string');
      expect(result.appliedReplacements[0].pattern).toBe('Hello world');

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('Hello universe');
    });

    test('should edit file with regex replacement', async () => {
      const testFilePath = path.join(testRepoPath, 'test.txt');
      const replacements = [
        { pattern: /API_KEY=\w+/g, replacement: 'API_KEY=***HIDDEN***' }
      ];

      const result = await contentEditor.editFile(testFilePath, replacements);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.appliedReplacements).toHaveLength(1);
      expect(result.appliedReplacements[0].type).toBe('regex');
      expect(result.appliedReplacements[0].matchCount).toBe(1);

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('API_KEY=***HIDDEN***');
    });

    test('should handle multiple replacements', async () => {
      const testFilePath = path.join(testRepoPath, 'test.txt');
      const replacements = [
        { pattern: 'Hello world', replacement: 'Hello universe' },
        { pattern: /test@example\.com/g, replacement: '***EMAIL***' }
      ];

      const result = await contentEditor.editFile(testFilePath, replacements);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.appliedReplacements).toHaveLength(2);

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('Hello universe');
      expect(updatedContent).toContain('***EMAIL***');
    });

    test('should return no changes when pattern not found', async () => {
      const testFilePath = path.join(testRepoPath, 'test.txt');
      const replacements = [
        { pattern: 'nonexistent pattern', replacement: 'replacement' }
      ];

      const result = await contentEditor.editFile(testFilePath, replacements);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(false);
      expect(result.appliedReplacements).toHaveLength(0);
    });

    test('should handle invalid file path', async () => {
      const result = await contentEditor.editFile('invalid<>path', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file path format');
    });

    test('should handle non-existent file', async () => {
      const nonExistentPath = path.join(testRepoPath, 'nonexistent.txt');
      const result = await contentEditor.editFile(nonExistentPath, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    test('should include context in result when provided', async () => {
      const testFilePath = path.join(testRepoPath, 'test.txt');
      const replacements = [{ pattern: 'Hello', replacement: 'Hi' }];
      const context = 'test-context';

      const result = await contentEditor.editFile(testFilePath, replacements, context);

      expect(result.context).toBe(context);
    });

    test('should handle regex with flags', async () => {
      const testFilePath = path.join(testRepoPath, 'test.txt');
      await fs.writeFile(testFilePath, 'HELLO hello HeLLo');

      const replacements = [
        { pattern: /hello/i, replacement: 'hi' }
      ];

      const result = await contentEditor.editFile(testFilePath, replacements);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toBe('hi hello HeLLo');
    });
  });

  describe('hideApiKeys', () => {
    beforeEach(async () => {
      // Create test .env file
      const envFilePath = path.join(testRepoPath, '.env');
      await fs.writeFile(envFilePath,
        'API_KEY=secret123\n' +
        'DB_PASSWORD=pass456\n' +
        'TOKEN=abc789\n' +
        'PUBLIC_VALUE=visible\n' +
        'SECRET_KEY=xyz111'
      );
    });

    test('should hide specific API keys', async () => {
      const envFilePath = path.join(testRepoPath, '.env');
      const keysToHide = ['API_KEY', 'DB_PASSWORD'];

      const result = await contentEditor.hideApiKeys(envFilePath, keysToHide);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.hiddenKeys).toContain('API_KEY');
      expect(result.hiddenKeys).toContain('DB_PASSWORD');
      expect(result.hiddenKeys.length).toBeGreaterThanOrEqual(2);

      const updatedContent = await fs.readFile(envFilePath, 'utf8');
      expect(updatedContent).toContain('API_KEY=***HIDDEN***');
      expect(updatedContent).toContain('DB_PASSWORD=***HIDDEN***');
      expect(updatedContent).toContain('TOKEN=abc789'); // Should remain unchanged
    });

    test('should hide all detected API keys when no specific keys provided', async () => {
      const envFilePath = path.join(testRepoPath, '.env');

      const result = await contentEditor.hideApiKeys(envFilePath);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.hiddenKeys.length).toBeGreaterThan(0);

      const updatedContent = await fs.readFile(envFilePath, 'utf8');
      expect(updatedContent).toContain('***HIDDEN***');
    });

    test('should use custom replacement text', async () => {
      const envFilePath = path.join(testRepoPath, '.env');
      const customReplacement = '[REDACTED]';

      const result = await contentEditor.hideApiKeys(envFilePath, ['API_KEY'], customReplacement);

      expect(result.success).toBe(true);

      const updatedContent = await fs.readFile(envFilePath, 'utf8');
      expect(updatedContent).toContain('API_KEY=[REDACTED]');
    });

    test('should handle non-existent .env file', async () => {
      const nonExistentPath = path.join(testRepoPath, 'nonexistent.env');

      const result = await contentEditor.hideApiKeys(nonExistentPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('.env file not found');
    });

    test('should handle invalid file path', async () => {
      const result = await contentEditor.hideApiKeys('invalid<>path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file path format');
    });

    test('should return no changes when no API keys found', async () => {
      const cleanFilePath = path.join(testRepoPath, 'clean.env');
      await fs.writeFile(cleanFilePath, 'PUBLIC_VAR=visible\nANOTHER_VALUE=test');

      const result = await contentEditor.hideApiKeys(cleanFilePath);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(false);
      expect(result.hiddenKeys).toHaveLength(0);
      expect(result.message).toBe('No API keys found to hide');
    });
  });

  describe('detectSensitiveData', () => {
    test('should detect email addresses', () => {
      const content = 'Contact us at test@example.com or admin@company.org';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.email).toContain('test@example.com');
      expect(result.email).toContain('admin@company.org');
      expect(result.email).toHaveLength(2);
    });

    test('should detect phone numbers', () => {
      const content = 'Call us at +1-555-123-4567 or (555) 987-6543';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.phone).toContain('+1-555-123-4567');
      expect(result.phone).toContain('(555) 987-6543');
    });

    test('should detect API keys', () => {
      const content = 'API_KEY=secret123\nDB_PASSWORD=pass456';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.apiKeys).toContain('API_KEY=secret123');
      expect(result.apiKeys).toContain('DB_PASSWORD=pass456');
    });

    test('should detect IP addresses', () => {
      const content = 'Server at 192.168.1.1 or connect to 10.0.0.1';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.ipAddress).toContain('192.168.1.1');
      expect(result.ipAddress).toContain('10.0.0.1');
    });

    test('should detect URLs', () => {
      const content = 'Visit https://example.com or http://test.org/page';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.url).toContain('https://example.com');
      expect(result.url).toContain('http://test.org/page');
    });

    test('should detect credit card numbers', () => {
      const content = 'Card: 4532-1234-5678-9012 or 378282246310005';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.creditCard).toContain('4532-1234-5678-9012');
    });

    test('should return empty object for clean content', () => {
      const content = 'This is clean text with no sensitive data';
      const result = contentEditor.detectSensitiveData(content);

      expect(Object.keys(result)).toHaveLength(0);
    });

    test('should remove duplicates from detected data', () => {
      const content = 'Email: test@example.com and test@example.com';
      const result = contentEditor.detectSensitiveData(content);

      expect(result.email).toEqual(['test@example.com']);
    });
  });

  describe('sanitizeFile', () => {
    beforeEach(async () => {
      // Create test file with sensitive data
      const testFilePath = path.join(testRepoPath, 'sensitive.txt');
      await fs.writeFile(testFilePath,
        'Contact: john.doe@example.com\n' +
        'Phone: +1-555-123-4567\n' +
        'API_KEY=secret123\n' +
        'Server: 192.168.1.1\n' +
        'Website: https://example.com\n' +
        'Card: 4532-1234-5678-9012'
      );
    });

    test('should sanitize all sensitive data types by default', async () => {
      const testFilePath = path.join(testRepoPath, 'sensitive.txt');

      const result = await contentEditor.sanitizeFile(testFilePath);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.sanitizedTypes).toContain('emails');
      expect(result.sanitizedTypes).toContain('phones');
      expect(result.sanitizedTypes).toContain('apiKeys');
    });

    test('should only sanitize specified types', async () => {
      const testFilePath = path.join(testRepoPath, 'sensitive.txt');
      const options = {
        hideEmails: true,
        hideApiKeys: true,
        hidePhones: false,
        hideIPs: false,
        hideUrls: false
      };

      const result = await contentEditor.sanitizeFile(testFilePath, options);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.sanitizedTypes).toEqual(['emails', 'apiKeys']);
    });

    test('should use custom replacement text', async () => {
      const testFilePath = path.join(testRepoPath, 'sensitive.txt');
      const options = {
        emailReplacement: '[EMAIL]',
        phoneReplacement: '[PHONE]',
        apiKeyReplacement: '[KEY]'
      };

      const result = await contentEditor.sanitizeFile(testFilePath, options);

      expect(result.success).toBe(true);

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('[EMAIL]');
      expect(updatedContent).toContain('[KEY]');
    });

    test('should handle IP addresses when requested', async () => {
      const testFilePath = path.join(testRepoPath, 'sensitive.txt');
      const options = { hideIPs: true };

      const result = await contentEditor.sanitizeFile(testFilePath, options);

      expect(result.success).toBe(true);
      expect(result.sanitizedTypes).toContain('ipAddresses');

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('***IP***');
    });

    test('should handle URLs when requested', async () => {
      const testFilePath = path.join(testRepoPath, 'sensitive.txt');
      const options = { hideUrls: true };

      const result = await contentEditor.sanitizeFile(testFilePath, options);

      expect(result.success).toBe(true);
      expect(result.sanitizedTypes).toContain('urls');

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('***URL***');
    });

    test('should handle invalid file path', async () => {
      const result = await contentEditor.sanitizeFile('invalid<>path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid file path format');
    });

    test('should handle non-existent file', async () => {
      const nonExistentPath = path.join(testRepoPath, 'nonexistent.txt');

      const result = await contentEditor.sanitizeFile(nonExistentPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    test('should return no changes for clean file', async () => {
      const cleanFilePath = path.join(testRepoPath, 'clean.txt');
      await fs.writeFile(cleanFilePath, 'This is clean text with no sensitive data');

      const result = await contentEditor.sanitizeFile(cleanFilePath);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(false);
      expect(result.message).toBe('No sensitive data found to clean');
    });
  });

  describe('findFilesByPattern', () => {
    beforeEach(async () => {
      // Create test directory structure
      await fs.ensureDir(path.join(testRepoPath, 'subdir'));
      await fs.ensureDir(path.join(testRepoPath, 'subdir', 'nested'));

      // Create test files
      await fs.writeFile(path.join(testRepoPath, 'test.txt'), 'content');
      await fs.writeFile(path.join(testRepoPath, 'config.json'), '{}');
      await fs.writeFile(path.join(testRepoPath, 'readme.md'), '# Readme');
      await fs.writeFile(path.join(testRepoPath, 'subdir', 'test.txt'), 'sub content');
      await fs.writeFile(path.join(testRepoPath, 'subdir', 'nested', 'data.json'), '{}');
    });

    test('should find files by string pattern recursively', async () => {
      const files = await contentEditor.findFilesByPattern(testRepoPath, ['test']);

      expect(files.length).toBe(2);
      expect(files.some(f => f.includes('test.txt'))).toBe(true);
      expect(files.some(f => f.includes('subdir', 'test.txt'))).toBe(true);
    });

    test('should find files by regex pattern', async () => {
      const files = await contentEditor.findFilesByPattern(testRepoPath, [/\.json$/]);

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    test('should find files with multiple patterns', async () => {
      const files = await contentEditor.findFilesByPattern(testRepoPath, ['test', /\.md$/]);

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    test('should search non-recursively when specified', async () => {
      const files = await contentEditor.findFilesByPattern(testRepoPath, ['test'], false);

      expect(files.length).toBe(1); // Only root test.txt
      expect(files[0]).toContain('test.txt');
    });

    test('should ignore hidden directories', async () => {
      await fs.ensureDir(path.join(testRepoPath, '.hidden'));
      await fs.writeFile(path.join(testRepoPath, '.hidden', 'test.txt'), 'hidden');

      const files = await contentEditor.findFilesByPattern(testRepoPath, ['test']);

      expect(files.some(f => f.includes('.hidden'))).toBe(false);
    });

    test('should handle empty directory', async () => {
      const emptyDir = path.join(testRepoPath, 'empty');
      await fs.ensureDir(emptyDir);

      const files = await contentEditor.findFilesByPattern(emptyDir, ['test']);

      expect(files).toHaveLength(0);
    });

    test('should handle non-existent directory', async () => {
      const files = await contentEditor.findFilesByPattern(path.join(testRepoPath, 'nonexistent'), ['test']);

      expect(files).toHaveLength(0);
    });

    test('should handle empty patterns array', async () => {
      const files = await contentEditor.findFilesByPattern(testRepoPath, []);

      expect(files).toHaveLength(0);
    });
  });

  describe('editCommit', () => {
    beforeEach(async () => {
      // Mock git setup
      await fs.ensureDir(path.join(testRepoPath, '.git'));

      // Create test files
      await fs.writeFile(path.join(testRepoPath, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testRepoPath, 'file2.txt'), 'content2');
    });

    test('should edit files in commit', async () => {
      // Mock getCommitFiles to return test files
      contentEditor.getCommitFiles = jest.fn().mockResolvedValue([
        { file: 'file1.txt', changes: 1, insertions: 1, deletions: 0 },
        { file: 'file2.txt', changes: 1, insertions: 1, deletions: 0 }
      ]);

      const replacements = [
        { pattern: 'content1', replacement: 'edited1' },
        { pattern: 'content2', replacement: 'edited2' }
      ];

      const result = await contentEditor.editCommit('abc123', replacements);

      expect(result.success).toBe(true);
      expect(result.hash).toBe('abc123');
      expect(result.processedFiles).toBe(2);
      expect(result.totalFiles).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    test('should handle unsafe file paths in commit', async () => {
      contentEditor.getCommitFiles = jest.fn().mockResolvedValue([
        { file: '../outside.txt', changes: 1, insertions: 1, deletions: 0 }
      ]);

      const replacements = [{ pattern: 'test', replacement: 'edited' }];

      const result = await contentEditor.editCommit('abc123', replacements);

      expect(result.success).toBe(false); // No successful edits
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Path traversal attempt detected');
    });

    test('should handle empty commit', async () => {
      contentEditor.getCommitFiles = jest.fn().mockResolvedValue([]);

      const result = await contentEditor.editCommit('abc123', []);

      expect(result.success).toBe(false);
      expect(result.processedFiles).toBe(0);
      expect(result.totalFiles).toBe(0);
    });

    test('should handle commit file retrieval error', async () => {
      contentEditor.getCommitFiles = jest.fn().mockRejectedValue(new Error('Git error'));

      const result = await contentEditor.editCommit('abc123', []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Git error');
    });

    test('should handle mixed successful and failed file edits', async () => {
      contentEditor.getCommitFiles = jest.fn().mockResolvedValue([
        { file: 'file1.txt', changes: 1, insertions: 1, deletions: 0 },
        { file: '../unsafe.txt', changes: 1, insertions: 1, deletions: 0 }
      ]);

      const replacements = [{ pattern: 'test', replacement: 'edited' }];

      const result = await contentEditor.editCommit('abc123', replacements);

      expect(result.success).toBe(true); // At least one successful edit
      expect(result.processedFiles).toBe(1);
      expect(result.totalFiles).toBe(2);
    });
  });

  describe('getCommitFiles', () => {
    test('should handle missing git repository gracefully', async () => {
      // Remove .git directory to simulate non-git repo
      await fs.remove(path.join(testRepoPath, '.git'));

      const files = await contentEditor.getCommitFiles('abc123');

      expect(Array.isArray(files)).toBe(true);
    });

    test('should handle invalid commit hash', async () => {
      // This would normally fail, but we're testing error handling
      const files = await contentEditor.getCommitFiles('invalid-hash');

      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete workflow of detecting and sanitizing sensitive data', async () => {
      const testFilePath = path.join(testRepoPath, 'integration.txt');
      const sensitiveContent =
        'Contact: admin@example.com\n' +
        'API_KEY=secret123\n' +
        'Phone: (555) 123-4567';

      await fs.writeFile(testFilePath, sensitiveContent);

      // First detect sensitive data
      const detected = contentEditor.detectSensitiveData(sensitiveContent);
      expect(Object.keys(detected)).toHaveLength(3);

      // Then sanitize the file
      const result = await contentEditor.sanitizeFile(testFilePath);
      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(result.sanitizedTypes).toHaveLength(3);

      // Verify content was sanitized
      const sanitizedContent = await fs.readFile(testFilePath, 'utf8');
      expect(sanitizedContent).toContain('***EMAIL***');
      expect(sanitizedContent).toContain('***API_KEY***');
      expect(sanitizedContent).toContain('***PHONE***');
    });

    test('should handle batch file operations', async () => {
      // Create multiple test files
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      const filePromises = files.map(file =>
        fs.writeFile(path.join(testRepoPath, file), `Content of ${file}`)
      );
      await Promise.all(filePromises);

      // Find all txt files
      const foundFiles = await contentEditor.findFilesByPattern(testRepoPath, ['.txt']);
      expect(foundFiles).toHaveLength(3);

      // Edit all files
      const replacements = [{ pattern: 'Content', replacement: 'Edited' }];
      const editPromises = foundFiles.map(file =>
        contentEditor.editFile(file, replacements)
      );
      const results = await Promise.all(editPromises);

      // Verify all files were edited successfully
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.changes).toBe(true);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle file permission errors gracefully', async () => {
      const testFilePath = path.join(testRepoPath, 'readonly.txt');
      await fs.writeFile(testFilePath, 'content');

      // Simulate permission error by making file read-only
      try {
        await fs.chmod(testFilePath, 0o444);

        const result = await contentEditor.editFile(testFilePath, [
          { pattern: 'content', replacement: 'edited' }
        ]);

        // Should handle error gracefully
        expect(typeof result.success).toBe('boolean');
      } finally {
        // Restore write permissions for cleanup
        await fs.chmod(testFilePath, 0o644);
      }
    });

    test('should handle very large files efficiently', async () => {
      const largeFilePath = path.join(testRepoPath, 'large.txt');
      const largeContent = 'test pattern\n'.repeat(10000);
      await fs.writeFile(largeFilePath, largeContent);

      const startTime = Date.now();
      const result = await contentEditor.editFile(largeFilePath, [
        { pattern: 'test pattern', replacement: 'edited pattern' }
      ]);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    test('should handle special characters in replacements', async () => {
      const testFilePath = path.join(testRepoPath, 'special.txt');
      await fs.writeFile(testFilePath, 'Normal text and $pecial text');

      const result = await contentEditor.editFile(testFilePath, [
        { pattern: /\$pecial/g, replacement: 'SPECIAL' }
      ]);

      expect(result.success).toBe(true);
      expect(result.changes).toBe(true);

      const updatedContent = await fs.readFile(testFilePath, 'utf8');
      expect(updatedContent).toContain('SPECIAL');
    });

    test('should handle unicode and multi-byte characters', async () => {
      const testFilePath = path.join(testRepoPath, 'unicode.txt');
      await fs.writeFile(testFilePath, 'Hello 世界 🌍 Email: user@测试.com');

      const result = await contentEditor.sanitizeFile(testFilePath);

      expect(result.success).toBe(true);
      // Unicode content might not be detected as sensitive, so we don't enforce changes
    });
  });
});