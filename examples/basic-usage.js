/**
 * Git Commit Time Machine - Basic Usage Example
 */

const GitCommitTimeMachine = require('../src/index');
const fs = require('fs-extra');
const path = require('path');

async function basicUsageExample() {
  console.log('🚀 Git Commit Time Machine - Basic Usage Example\n');

  // Create Git Commit Time Machine instance
  const gctm = new GitCommitTimeMachine({
    repoPath: process.cwd() // Use repository in current directory
  });

  try {
    // 1. Create backup
    console.log('1️⃣ Creating backup...');
    const backupResult = await gctm.backupManager.createBackup({
      description: 'Backup before basic usage example',
      includeUncommitted: true
    });

    if (backupResult.success) {
      console.log(`✅ Backup created: ${backupResult.backupId}`);
    } else {
      console.error('❌ Failed to create backup:', backupResult.error);
      return;
    }

    // 2. Get last 5 commits
    console.log('\n2️⃣ Getting last 5 commits...');
    const commits = await gctm.gitProcessor.getCommits({ limit: 5 });

    if (commits.length === 0) {
      console.log('❌ No commits found to process');
      return;
    }

    console.log(`✅ Found ${commits.length} commits`);
    commits.forEach((commit, index) => {
      console.log(`   ${index + 1}. ${commit.shortHash} - ${commit.message} (${commit.date})`);
    });

    // 3. Redate commits (to past dates)
    console.log('\n3️⃣ Redating commit timestamps...');
    const redateResult = await gctm.redateCommits({
      startDate: '2023-01-01',
      endDate: '2023-01-05',
      preserveOrder: true,
      createBackup: false // Already created backup
    });

    if (redateResult.success) {
      console.log(`✅ ${redateResult.processed} commits successfully redated`);
    } else {
      console.error('❌ Redating failed:', redateResult.error);
    }

    // 4. Create example file with sensitive data
    console.log('\n4️⃣ Creating example file...');
    const exampleFile = 'example-config.js';
    const exampleContent = `
// Example Configuration File
const config = {
  database: {
    host: "localhost",
    port: 5432,
    user: "admin",
    password: "supersecretpassword123",
    apiKey: "sk-1234567890abcdef"
  },
  api: {
    endpoint: "https://api.example.com",
    key: "ak_test_abcdef123456",
    secret: "secret_key_xyz789"
  },
  email: {
    from: "admin@example.com",
    smtp: {
      host: "smtp.example.com",
      user: "noreply@example.com",
      pass: "emailpassword456"
    }
  }
};

module.exports = config;
`;

    await fs.writeFile(exampleFile, exampleContent, 'utf8');
    console.log(`✅ ${exampleFile} file created`);

    // 5. Detect sensitive data
    console.log('\n5️⃣ Detecting sensitive data...');
    const sensitiveData = gctm.contentEditor.detectSensitiveData(exampleContent);

    console.log('Detected sensitive data:');
    Object.entries(sensitiveData).forEach(([type, items]) => {
      console.log(`   ${type}: ${items.length} items`);
      items.forEach(item => {
        console.log(`     - ${item.substring(0, 50)}${item.length > 50 ? '...' : ''}`);
      });
    });

    // 6. Sanitize sensitive data
    console.log('\n6️⃣ Sanitizing sensitive data...');
    const sanitizeResult = await gctm.contentEditor.sanitizeFile(exampleFile, {
      hideEmails: true,
      hideApiKeys: true,
      emailReplacement: '***EMAIL***',
      apiKeyReplacement: '***API_KEY***'
    });

    if (sanitizeResult.success && sanitizeResult.changes) {
      console.log(`✅ File sanitized: ${sanitizeResult.sanitizedTypes.join(', ')}`);

      // Show sanitized content
      const cleanedContent = await fs.readFile(exampleFile, 'utf8');
      console.log('\nSanitized file content (first 10 lines):');
      const lines = cleanedContent.split('\n').slice(0, 10);
      lines.forEach((line, index) => {
        console.log(`   ${index + 1}: ${line}`);
      });
    }

    // 7. List backups
    console.log('\n7️⃣ Listing available backups...');
    const backups = await gctm.listBackups();

    if (backups.length > 0) {
      console.log(`✅ Found ${backups.length} backups:`);
      backups.forEach((backup, index) => {
        const date = new Date(backup.createdAt).toLocaleDateString();
        console.log(`   ${index + 1}. ${backup.id} - ${backup.description || 'No description'} (${date})`);
      });
    } else {
      console.log('ℹ️ No available backups found');
    }

    // 8. Cleanup
    console.log('\n8️⃣ Performing cleanup...');
    await fs.remove(exampleFile);
    console.log(`✅ ${exampleFile} file deleted`);

    console.log('\n🎉 Example completed successfully!');

  } catch (error) {
    console.error('\n❌ Error occurred while running example:', error.message);
    console.error(error.stack);
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample();
}

module.exports = basicUsageExample;