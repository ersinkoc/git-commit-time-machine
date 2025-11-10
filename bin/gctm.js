#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const GitCommitTimeMachine = require('../src/index');
const logger = require('../src/utils/logger');
const Validator = require('../src/utils/validator');
const packageJson = require('../package.json');

const program = new Command();

// Version and description
program
  .name('gctm')
  .description('Git Commit Time Machine - Tool for managing Git commit history')
  .version(packageJson.version);

/**
 * Helper function: Show error and exit
 * @param {string} message - Error message
 */
function showErrorAndExit(message) {
  logger.error(message);
  process.exit(1);
}

/**
 * Helper function: Show success and exit
 * @param {string} message - Success message
 */
function showSuccessAndExit(message) {
  logger.success(message);
  process.exit(0);
}

/**
 * Date-related commands
 */
program
  .command('redate')
  .description('Redates commit timestamps')
  .option('-s, --start <date>', 'Start date (YYYY-MM-DD format)')
  .option('-e, --end <date>', 'End date (YYYY-MM-DD format)')
  .option('-c, --commit <hash>', 'Target a specific commit')
  .option('-b, --backup', 'Create backup before operation')
  .option('-o, --preserve-order', 'Preserve commit order')
  .option('-r, --randomize', 'Generate random dates')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let redateOptions = {};

      // Interactive mode
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'startDate',
            message: 'Start date (YYYY-MM-DD):',
            validate: (input) => {
              return Validator.isValidDate(input) || 'Please enter a valid date (YYYY-MM-DD)';
            }
          },
          {
            type: 'input',
            name: 'endDate',
            message: 'End date (YYYY-MM-DD):',
            validate: (input) => {
              return Validator.isValidDate(input) || 'Please enter a valid date (YYYY-MM-DD)';
            }
          },
          {
            type: 'confirm',
            name: 'createBackup',
            message: 'Create backup before operation?',
            default: true
          },
          {
            type: 'confirm',
            name: 'preserveOrder',
            message: 'Preserve commit order?',
            default: true
          }
        ]);

        redateOptions = answers;
      } else {
        // Command line mode
        if (!options.start || !options.end) {
          showErrorAndExit('Start and end dates must be specified');
        }

        const validation = Validator.validateDateRange(options.start, options.end);
        if (!validation.isValid) {
          showErrorAndExit(validation.errors.join(', '));
        }

        // BUG-NEW-002 fix: Default backup to true (consistent with main API)
        redateOptions = {
          startDate: options.start,
          endDate: options.end,
          createBackup: options.backup !== false,
          preserveOrder: options.preserveOrder !== false
        };
      }

      // Create GCTM instance
      const gctm = new GitCommitTimeMachine();

      logger.title('Redate Git Commits');
      logger.info(`Start: ${redateOptions.startDate}`);
      logger.info(`End: ${redateOptions.endDate}`);

      // Perform operation
      const result = await gctm.redateCommits(redateOptions);

      if (result.success) {
        showSuccessAndExit(`${result.processed} commits successfully redated`);
      } else {
        showErrorAndExit(`Operation failed: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * Commit message editing command
 */
program
  .command('edit-message')
  .description('Edits commit message')
  .option('-c, --commit <hash>', 'Commit hash to edit')
  .option('-m, --message <text>', 'New commit message')
  .option('-b, --backup', 'Create backup before operation')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let editOptions = {};

      // Interactive mode
      if (options.interactive) {
        const gctm = new GitCommitTimeMachine();
        const commits = await gctm.gitProcessor.getCommits({ limit: 20 });

        if (commits.length === 0) {
          showErrorAndExit('No commits found to edit');
        }

        const commitChoices = commits.map(commit => ({
          name: `${commit.shortHash} - ${commit.message.substring(0, 50)}...`,
          value: commit.hash
        }));

        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'commitId',
            message: 'Select commit to edit:',
            choices: commitChoices
          },
          {
            type: 'input',
            name: 'newMessage',
            message: 'New commit message:',
            validate: (input) => {
              return input.trim().length > 0 || 'Commit message cannot be empty';
            }
          },
          {
            type: 'confirm',
            name: 'createBackup',
            message: 'Create backup before operation?',
            default: true
          }
        ]);

        editOptions = answers;
      } else {
        // Command line mode
        if (!options.commit || !options.message) {
          showErrorAndExit('Commit hash and new message must be specified');
        }

        if (!Validator.isValidGitHash(options.commit)) {
          showErrorAndExit('Please specify a valid commit hash');
        }

        // BUG-NEW-002 fix: Default backup to true
        editOptions = {
          commitId: options.commit,
          newMessage: options.message,
          createBackup: options.backup !== false
        };
      }

      // Create GCTM instance
      const gctm = new GitCommitTimeMachine();

      logger.title('Edit Commit Message');
      logger.info(`Commit: ${editOptions.commitId}`);

      // Perform operation
      const result = await gctm.editCommitMessage(editOptions);

      if (result.success) {
        showSuccessAndExit('Commit message successfully edited');
      } else {
        showErrorAndExit(`Operation failed: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * Content editing command
 */
program
  .command('edit-content')
  .description('Edits commit content')
  .option('-c, --commit <hash>', 'Commit hash to edit')
  .option('-p, --pattern <regex>', 'Pattern to search for (regex)')
  .option('-r, --replacement <text>', 'Replacement text')
  .option('-b, --backup', 'Create backup before operation')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let editOptions = {};

      // Interactive mode
      if (options.interactive) {
        const gctm = new GitCommitTimeMachine();
        const commits = await gctm.gitProcessor.getCommits({ limit: 20 });

        if (commits.length === 0) {
          showErrorAndExit('No commits found to edit');
        }

        const commitChoices = commits.map(commit => ({
          name: `${commit.shortHash} - ${commit.message.substring(0, 50)}...`,
          value: commit.hash
        }));

        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'commitId',
            message: 'Select commit to edit:',
            choices: commitChoices
          },
          {
            type: 'input',
            name: 'pattern',
            message: 'Pattern to search for (regex or string):',
            validate: (input) => {
              return input.trim().length > 0 || 'Pattern cannot be empty';
            }
          },
          {
            type: 'input',
            name: 'replacement',
            message: 'Replacement text:',
            default: '***REDACTED***'
          },
          {
            type: 'confirm',
            name: 'createBackup',
            message: 'Create backup before operation?',
            default: true
          }
        ]);

        editOptions = {
          ...answers,
          replacements: [{
            pattern: answers.pattern,
            replacement: answers.replacement
          }]
        };
      } else {
        // Command line mode
        if (!options.commit || !options.pattern || !options.replacement) {
          showErrorAndExit('Commit hash, pattern and replacement text must be specified');
        }

        if (!Validator.isValidGitHash(options.commit)) {
          showErrorAndExit('Please specify a valid commit hash');
        }

        // BUG-NEW-002 fix: Default backup to true
        editOptions = {
          commitId: options.commit,
          replacements: [{
            pattern: options.pattern,
            replacement: options.replacement
          }],
          createBackup: options.backup !== false
        };
      }

      // Create GCTM instance
      const gctm = new GitCommitTimeMachine();

      logger.title('Edit Commit Content');
      logger.info(`Commit: ${editOptions.commitId}`);

      // Perform operation
      const result = await gctm.editCommitContent(editOptions);

      if (result.success) {
        showSuccessAndExit(`${result.processedFiles} files successfully edited`);
      } else {
        showErrorAndExit(`Operation failed: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * History sanitization command
 */
program
  .command('sanitize')
  .description('Sanitizes repository history from sensitive data')
  .option('-p, --patterns <patterns>', 'Patterns to search for (comma-separated)')
  .option('-r, --replacement <text>', 'Replacement text', '***REDACTED***')
  .option('-b, --backup', 'Create backup before operation')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      let sanitizeOptions = {};

      // Interactive mode
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedPatterns',
            message: 'Select patterns to sanitize:',
            choices: [
              { name: 'Email addresses', value: 'email', checked: true },
              { name: 'API keys', value: 'apiKeys', checked: true },
              { name: 'Passwords', value: 'passwords', checked: true },
              { name: 'IP addresses', value: 'ips', checked: false },
              { name: 'URLs', value: 'urls', checked: false },
              { name: 'Custom pattern', value: 'custom' }
            ]
          },
          {
            type: 'input',
            name: 'customPattern',
            message: 'Custom pattern (regex):',
            when: (answers) => answers.selectedPatterns.includes('custom'),
            validate: (input) => {
              return input.trim().length > 0 || 'Custom pattern cannot be empty';
            }
          },
          {
            type: 'input',
            name: 'replacement',
            message: 'Replacement text:',
            default: '***REDACTED***'
          },
          {
            type: 'confirm',
            name: 'createBackup',
            message: 'Create backup before operation?',
            default: true
          }
        ]);

        // Create pattern list based on selections
        const patterns = [];
        const patternMap = {
          email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
          apiKeys: /([A-Z_]+_?(KEY|TOKEN|SECRET|PASSWORD|PASS|API_KEY|SECRET_KEY)=)([^\s\n]+)/g,
          passwords: /password[=:\s]+([^\s\n]+)/gi,
          ips: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
          urls: /(https?:\/\/[^\s]+)/g
        };

        answers.selectedPatterns.forEach(pattern => {
          if (pattern !== 'custom' && patternMap[pattern]) {
            patterns.push(patternMap[pattern]);
          }
        });

        if (answers.customPattern) {
          patterns.push(answers.customPattern);
        }

        sanitizeOptions = {
          patterns,
          replacement: answers.replacement,
          createBackup: answers.createBackup
        };
      } else {
        // Command line mode
        if (!options.patterns) {
          showErrorAndExit('At least one pattern must be specified');
        }

        const patterns = options.patterns.split(',').map(p => p.trim());
        // BUG-NEW-002 fix: Default backup to true
        sanitizeOptions = {
          patterns,
          replacement: options.replacement,
          createBackup: options.backup !== false
        };
      }

      // Create GCTM instance
      const gctm = new GitCommitTimeMachine();

      logger.title('Sanitize History from Sensitive Data');
      logger.info(`${sanitizeOptions.patterns.length} patterns will be sanitized`);

      // Perform operation
      const result = await gctm.sanitizeHistory(sanitizeOptions);

      if (result.success) {
        showSuccessAndExit(`${result.processed} commits successfully sanitized`);
      } else {
        showErrorAndExit(`Operation failed: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * AI-powered commit message generation
 */
program
  .command('ai-generate')
  .description('Generate AI-powered commit message suggestions')
  .option('-l, --language <lang>', 'Language (en, tr, es, fr, de)', 'en')
  .option('-s, --style <style>', 'Style (conventional, descriptive, minimal, humorous)', 'conventional')
  .option('-c, --context <text>', 'Additional context for the AI')
  .option('-m, --current-message <text>', 'Current message to improve')
  .option('-i, --interactive', 'Interactive mode with selection')
  .option('-a, --apply <number>', 'Apply suggestion number (1-3)')
  .action(async (options) => {
    try {
      const gctm = new GitCommitTimeMachine();

      // Initialize AI assistant
      const initResult = await gctm.initializeAI();
      if (!initResult.success) {
        showErrorAndExit(`AI initialization failed: ${initResult.error}`);
      }

      logger.title('AI Commit Message Generator');
      logger.info(`Language: ${options.language}, Style: ${options.style}`);

      // Generate AI commit messages
      const result = await gctm.generateAICommitMessage({
        language: options.language,
        style: options.style,
        context: options.context || '',
        currentMessage: options.currentMessage || ''
      });

      if (!result.success) {
        showErrorAndExit(`AI generation failed: ${result.error}`);
      }

      // Display suggestions
      logger.subtitle('AI Generated Suggestions:');
      result.suggestions.forEach((suggestion, index) => {
        logger.info(`${index + 1}. ${suggestion}`);
      });

      // Interactive mode
      if (options.interactive) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'selected',
            message: 'Select a commit message to apply:',
            choices: result.suggestions.map((s, i) => ({
              name: `${i + 1}. ${s}`,
              value: s
            })),
            default: 0
          },
          {
            type: 'confirm',
            name: 'apply',
            message: 'Apply this commit message?',
            default: true
          }
        ]);

        if (answers.apply) {
          const applyResult = await gctm.applyAICommitMessage(answers.selected, true);
          if (applyResult.success) {
            showSuccessAndExit(`Commit message applied: ${answers.selected}`);
          } else {
            showErrorAndExit(`Failed to apply commit message: ${applyResult.error}`);
          }
        }
      } else if (options.apply) {
        // BUG-NEW-013 fix: Validate parseInt result before using
        const applyIndex = parseInt(options.apply) - 1;
        if (isNaN(applyIndex)) {
          showErrorAndExit(`Invalid suggestion number: ${options.apply}. Must be a number.`);
        }
        if (applyIndex >= 0 && applyIndex < result.suggestions.length) {
          const selectedSuggestion = result.suggestions[applyIndex];
          const applyResult = await gctm.applyAICommitMessage(selectedSuggestion, true);
          if (applyResult.success) {
            showSuccessAndExit(`Commit message applied: ${selectedSuggestion}`);
          } else {
            showErrorAndExit(`Failed to apply commit message: ${applyResult.error}`);
          }
        } else {
          showErrorAndExit(`Invalid suggestion number: ${options.apply}`);
        }
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * AI configuration management
 */
program
  .command('ai-config')
  .description('AI assistant configuration')
  .option('-k, --api-key <key>', 'Set API key')
  .option('-p, --provider <provider>', 'Set AI provider (openai, anthropic, google, local)')
  .option('-m, --model <model>', 'Set AI model')
  .option('-l, --language <lang>', 'Set default language (en, tr, es, fr, de)')
  .option('-s, --style <style>', 'Set default style (conventional, descriptive, minimal, humorous)')
  .option('-t, --temperature <temp>', 'Set creativity level (0.0-1.0)')
  .option('--test', 'Test AI connection')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    try {
      const gctm = new GitCommitTimeMachine();

      // Show current configuration
      if (options.show) {
        const config = gctm.getAIConfig();
        logger.title('Current AI Configuration');
        console.table([
          { Setting: 'API Key', Value: config.apiKey || 'Not set' },
          { Setting: 'Provider', Value: config.apiProvider },
          { Setting: 'Model', Value: config.model },
          { Setting: 'Language', Value: config.language },
          { Setting: 'Style', Value: config.style },
          { Setting: 'Max Tokens', Value: config.maxTokens },
          { Setting: 'Temperature', Value: config.temperature }
        ]);
        return;
      }

      // Test connection
      if (options.test) {
        logger.title('Testing AI Connection');
        const result = await gctm.testAIConnection();
        if (result.success) {
          showSuccessAndExit('AI connection test successful');
        } else {
          showErrorAndExit(`AI connection test failed: ${result.error}`);
        }
        return;
      }

      // Update configuration
      const configUpdate = {};
      if (options.apiKey) configUpdate.apiKey = options.apiKey;
      if (options.provider) configUpdate.apiProvider = options.provider;
      if (options.model) configUpdate.model = options.model;
      if (options.language) configUpdate.language = options.language;
      if (options.style) configUpdate.style = options.style;
      if (options.temperature) configUpdate.temperature = parseFloat(options.temperature);

      if (Object.keys(configUpdate).length > 0) {
        const result = await gctm.updateAIConfig(configUpdate);
        if (result.success) {
          showSuccessAndExit('AI configuration updated successfully');
        } else {
          showErrorAndExit(`Failed to update AI config: ${result.error}`);
        }
      } else {
        logger.info('No configuration changes specified. Use --help to see available options.');
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * Backup management commands
 */
const backupCmd = program
  .command('backup')
  .description('Backup management');

backupCmd
  .command('create')
  .description('Creates a new backup')
  .option('-d, --description <text>', 'Backup description')
  .option('-u, --include-uncommitted', 'Include uncommitted changes')
  .action(async (options) => {
    try {
      const gctm = new GitCommitTimeMachine();

      const backupOptions = {
        description: options.description,
        includeUncommitted: options.includeUncommitted || false
      };

      logger.title('Create Backup');

      const result = await gctm.backupManager.createBackup(backupOptions);

      if (result.success) {
        showSuccessAndExit(`Backup created: ${result.backupId}`);
      } else {
        showErrorAndExit(`Failed to create backup: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

backupCmd
  .command('list')
  .description('Lists available backups')
  .action(async () => {
    try {
      const gctm = new GitCommitTimeMachine();

      const backups = await gctm.listBackups();

      logger.title('Backup List');

      if (backups.length === 0) {
        logger.info('No available backups found');
        return;
      }

      const tableData = backups.map(backup => [
        backup.id,
        new Date(backup.createdAt).toLocaleDateString(),
        backup.description || 'No description',
        backup.currentBranch || 'N/A'
      ]);

      logger.table(
        ['ID', 'Date', 'Description', 'Branch'],
        tableData
      );

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

backupCmd
  .command('restore <backupId>')
  .description('Restores specified backup')
  .option('-y, --yes', 'Restore without confirmation')
  .action(async (backupId, options) => {
    try {
      // Request confirmation
      if (!options.yes) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to restore backup '${backupId}'? This operation may lose your current changes!`,
            default: false
          }
        ]);

        if (!answers.confirm) {
          logger.info('Operation cancelled');
          return;
        }
      }

      const gctm = new GitCommitTimeMachine();

      logger.title('Restore Backup');
      logger.info(`Backup: ${backupId}`);

      const result = await gctm.restoreBackup(backupId);

      if (result.success) {
        showSuccessAndExit('Backup successfully restored');
      } else {
        showErrorAndExit(`Failed to restore backup: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

backupCmd
  .command('delete <backupId>')
  .description('Deletes specified backup')
  .option('-y, --yes', 'Delete without confirmation')
  .action(async (backupId, options) => {
    try {
      // Request confirmation
      if (!options.yes) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete backup '${backupId}'? This operation cannot be undone!`,
            default: false
          }
        ]);

        if (!answers.confirm) {
          logger.info('Operation cancelled');
          return;
        }
      }

      const gctm = new GitCommitTimeMachine();

      logger.title('Delete Backup');
      logger.info(`Backup: ${backupId}`);

      const result = await gctm.backupManager.deleteBackup(backupId);

      if (result.success) {
        showSuccessAndExit('Backup successfully deleted');
      } else {
        showErrorAndExit(`Failed to delete backup: ${result.error}`);
      }

    } catch (error) {
      showErrorAndExit(`Unexpected error: ${error.message}`);
    }
  });

/**
 * Default command: Interactive mode
 */
program
  .command('*', '', { isDefault: true })
  .action(() => {
    logger.title('Git Commit Time Machine');
    console.log(chalk.cyan('Manage your Git commit history!\n'));

    inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '📅 Redate commit timestamps', value: 'redate' },
          { name: '📝 Edit commit message', value: 'edit-message' },
          { name: '📄 Edit commit content', value: 'edit-content' },
          { name: '🧹 Sanitize history', value: 'sanitize' },
          { name: '💾 Backup management', value: 'backup' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]).then((answers) => {
      if (answers.action === 'exit') {
        logger.info('Goodbye!');
        process.exit(0);
      } else {
        logger.info(`Please run: gctm ${answers.action} --interactive`);
      }
    });
  });

// Run the program
program.parse();