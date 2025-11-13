# gctm - Git Commit Time Machine

🚀 **Git Commit Time Machine v1.2.0** - Comprehensive Git history manipulation tool with AI-powered commit message generation. Change commit dates, edit content, manage sensitive data, and generate creative commit messages using OpenAI, Anthropic, Google Gemini, and Local AI models.

**🎯 Version 1.2.0 Highlights:**
- ✅ **100% Test Success Rate**: Achieved 512 tests passing with zero failures - complete reliability guarantee
- 🔬 **Comprehensive Test Coverage**: 40+ new test cases covering all GitHistoryRewriter functionality and edge cases
- 🛡️ **Enhanced Error Handling**: Improved timeout handling, branch validation, and null input protection
- 📊 **Logger System Overhaul**: Completely rewritten logger tests with 100% method coverage including file operations
- 🔧 **Backup Management**: Robust backup creation, restoration, and cleanup with comprehensive validation
- 🚀 **Production-Ready**: Minor version bump reflecting significant stability and reliability improvements

## ✨ Features

- 🤖 **AI-Powered Commit Messages**: Generate creative commit messages using OpenAI, Anthropic Claude, or local AI models
- 🌍 **Multi-Language Support**: Generate commit messages in 12 languages: English, Turkish, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Japanese, Chinese, and Korean
- 🎨 **Multiple Styles**: Choose from conventional, descriptive, minimal, or humorous commit message styles
- ⚙️ **Customizable**: Configure AI providers, models, and settings to match your workflow
- 🔄 **Git History Manipulation**: Change commit dates, edit commit messages, update commit content
- 🛡️ **Security Features**: Sanitize sensitive data, manage API keys, backup and restore system

## Installation

### Option 1: Install via npm (Recommended)

```bash
# Install globally
npm install -g gctm

# Or install locally
npm install gctm

# Verify installation
gctm --version
```

### Option 2: Clone from GitHub

```bash
# Clone the project
git clone https://github.com/ersinkoc/git-commit-time-machine.git

# Change to project directory
cd git-commit-time-machine

# Install dependencies
npm install

# Install globally
npm install -g .
```

### Option 3: Download and Install

```bash
# Download the latest release
wget https://github.com/ersinkoc/git-commit-time-machine/archive/refs/tags/latest.tar.gz

# Extract and install
tar -xzf latest.tar.gz
cd GitCommitTimeMachine-*
npm install -g .
```

### System Requirements

- **Node.js**: >= 14.0.0
- **npm**: >= 6.0.0
- **Git**: >= 2.0.0
- **OS**: Windows, macOS, Linux

### AI Setup (Optional)

For AI-powered commit messages, you'll need API keys:

```bash
# OpenAI (for GPT-5, GPT-4.1 models)
export OPENAI_API_KEY="your-openai-api-key"

# Anthropic Claude (for Claude 4.5, Claude 4.1 models)
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# Google Gemini (for Gemini 2.5 models)
export GOOGLE_API_KEY="your-google-api-key"

# Local AI (via Ollama - requires installation)
# No API key needed, runs locally
```

## Usage

### CLI Usage

#### Redate Commit Timestamps

```bash
# Redate commits within a specific date range
gctm redate --start "2023-01-01" --end "2023-01-30"

# Include backup
gctm redate --start "2023-01-01" --end "2023-01-30" --backup

# Interactive mode
gctm redate --interactive
```

#### Edit Commit Message

```bash
# Edit a specific commit message
gctm edit-message --commit "a1b2c3d" --message "New commit message"

# Interactive mode
gctm edit-message --interactive
```

#### Edit Commit Content

```bash
# Replace a specific pattern
gctm edit-content --commit "a1b2c3d" --pattern "API_KEY" --replacement "***HIDDEN***"

# Interactive mode
gctm edit-content --interactive
```

#### Sanitize History

```bash
# Clean sensitive data
gctm sanitize --patterns "email,apiKeys" --replacement "***REDACTED***"

# Interactive mode
gctm sanitize --interactive
```

### Backup Management

```bash
# Create backup
gctm backup create --description "Pre-operation backup"

# List backups
gctm backup list

# Restore backup
gctm backup restore <backupId>

# Delete backup
gctm backup delete <backupId>
```

#### AI-Powered Commit Messages

```bash
# Generate AI commit messages (requires API key)
export OPENAI_API_KEY="your-openai-api-key"

# Basic AI generation
gctm ai-generate

# Generate in Turkish with humorous style
gctm ai-generate --language tr --style humorous

# Interactive selection and application
gctm ai-generate --interactive

# Generate with additional context
gctm ai-generate --context "Fixed critical authentication bug"

# Improve existing commit message
gctm ai-generate --current-message "fix bug" --style descriptive
```

#### AI Configuration

```bash
# Show current AI configuration
gctm ai-config --show

# Set API key and provider
gctm ai-config --api-key "your-key" --provider openai

# Configure default language and style
gctm ai-config --language tr --style humorous

# Test AI connection
gctm ai-config --test

# Set model and creativity level (2025 models)
gctm ai-config --model gpt-5-main --temperature 0.8
```

**AI Providers Supported:**
- **OpenAI**: GPT-5 series (main, thinking), GPT-4.1 series, GPT-4o, legacy models
- **Anthropic**: Claude 4.5 series, Claude 4.1 series, Claude Haiku 4.5, legacy models
- **Google Gemini**: Gemini 2.5 Pro/Flash, Gemma 3, audio/video models
- **Local**: Ollama with 100+ models including Llama 3.3, DeepSeek-R1, Phi-4, Qwen3

**Languages Available:**
- English (en), Turkish (tr), Spanish (es), French (fr), German (de), Italian (it), Portuguese (pt), Dutch (nl), Russian (ru), Japanese (ja), Chinese (zh), Korean (ko)

**Commit Message Styles:**
- Conventional, Descriptive, Minimal, Humorous

### Programmatic Usage

```javascript
const { GitCommitTimeMachine } = require('./src/index.js');

const gctm = new GitCommitTimeMachine();

// Redate commits
await gctm.redateCommits({
  startDate: '2023-01-01',
  endDate: '2023-01-30',
  createBackup: true,
  preserveOrder: true,
  filter: (commit) => commit.author === 'john.doe@example.com'
});

// Edit content
await gctm.editCommitContent({
  commitId: 'a1b2c3d',
  replacements: [
    { pattern: /API_KEY=.*/g, replacement: 'API_KEY=***REDACTED***' }
  ],
  createBackup: true
});

// Sanitize history
await gctm.sanitizeHistory({
  patterns: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /([A-Z_]+_?(KEY|TOKEN|SECRET|PASSWORD|PASS|API_KEY|SECRET_KEY)=)([^\s\n]+)/g // API keys
  ],
  replacement: '***HIDDEN***',
  createBackup: true
});

// Initialize AI assistant
await gctm.initializeAI();

// Generate AI commit message
const aiResult = await gctm.generateAICommitMessage({
  language: 'tr',
  style: 'humorous',
  context: 'Fixed critical bug in authentication system'
});

if (aiResult.success) {
  console.log('AI Suggestions:', aiResult.suggestions);

  // Apply the first suggestion
  await gctm.applyAICommitMessage(aiResult.suggestions[0], true);
}

// Update AI configuration
await gctm.updateAIConfig({
  apiKey: 'your-api-key',
  provider: 'openai',
  model: 'gpt-4',
  language: 'en',
  style: 'conventional'
});
```

## API Reference

### GitCommitTimeMachine Class

#### Methods

- `redateCommits(options)`: Redates commit timestamps
- `editCommitMessage(options)`: Edits commit message
- `editCommitContent(options)`: Edits commit content
- `sanitizeHistory(options)`: Sanitizes repository history
- `listBackups()`: Lists available backups
- `restoreBackup(backupId)`: Restores a backup

#### Options

**redateCommits:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `filter`: Commit filtering function
- `createBackup`: Create backup
- `preserveOrder`: Preserve order

**editCommitMessage:**
- `commitId`: Commit ID to edit
- `newMessage`: New commit message
- `createBackup`: Create backup

**editCommitContent:**
- `commitId`: Commit ID to edit
- `replacements`: Array of replacement patterns
- `createBackup`: Create backup

## Security Considerations

- ⚠️ **Backup Important**: Always backup before important operations
- ⚠️ **Shared Repositories**: Be careful when using in shared repositories
- ⚠️ **History Changes**: Modified history can affect other developers
- ✅ **Sensitive Data**: Securely manages API keys, passwords, and other sensitive information

## Examples

### Hiding API Keys

```javascript
const gctm = new GitCommitTimeMachine();

// Hide API keys in .env file
const result = await gctm.contentEditor.hideApiKeys(
  './.env',
  ['API_KEY', 'SECRET_KEY', 'DATABASE_URL'],
  '***HIDDEN***'
);

console.log(result);
```

### Date Analysis

```javascript
const gctm = new GitCommitTimeMachine();
const commits = await gctm.gitProcessor.getCommits();

// Which days commits were made
const dayStats = gctm.dateManager.analyzeCommitDays(commits);
console.log(dayStats);

// Which hours commits were made
const hourStats = gctm.dateManager.analyzeCommitHours(commits);
console.log(hourStats);
```

### Sensitive Data Detection

```javascript
const content = await fs.readFile('config.js', 'utf8');
const sensitiveData = gctm.contentEditor.detectSensitiveData(content);

console.log('Detected sensitive data:', sensitiveData);
```

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## Frequently Asked Questions (FAQ)

**Q: How can I restore changed history?**
A: Use `gctm backup restore <backupId>` to restore a previously created backup.

**Q: Can this be used in shared repositories?**
A: Yes, but be cautious. After making changes, you may need to `git push --force` to reflect changes to others.

**Q: Which file formats can be edited?**
A: All text-based files (.js, .py, .json, .env, .md, etc.) can be edited.

**Q: Where are backups stored?**
A: Backups are stored in the `.gctm-backups` folder in the project directory.

## Version & License

- **Version**: 1.1.6
- **License**: MIT License
- **Author**: ERSIN KOC
- **Repository**: https://github.com/ersinkoc/git-commit-time-machine

### License

Copyright (c) 2025 ERSIN KOC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.