# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.5] - 2025-11-12

### 🚨 CRITICAL BUG FIXES
- **Major Git History Bug**: Resolved critical issue where date rewriting operations only affected 1 commit instead of processing all commits
- **Sequential Processing Failure**: Fixed git amend operations that were invalidating subsequent commit references
- **Batch Processing Implementation**: Replaced flawed sequential approach with efficient git filter-branch processing

### ⚡ Performance & Reliability
- **Git Filter-Branch Integration**: Implemented robust batch processing for bulk date changes across entire repository
- **Enhanced Backup Safety**: Improved automatic backup creation and restore mechanisms with fallback protection
- **Shell Script Optimization**: Created efficient case-based filtering for commit date mapping
- **Timeout Handling**: Better handling of large repository operations with improved error recovery

### 🛡️ Security & Safety
- **Command Injection Prevention**: Enhanced shell script escaping for git filter-branch operations
- **Backup Validation**: Improved backup branch validation and cleanup processes
- **Error Recovery**: Better error handling with automatic restore from backup on failures

### 🔧 Technical Improvements
- **GitHistoryRewriter Refactor**: Complete rewrite of date change logic from sequential to batch processing
- **Environment Variable Handling**: Proper GIT_AUTHOR_DATE and GIT_COMMITTER_DATE management
- **Filter Script Generation**: Dynamic shell script generation for commit hash to date mapping
- **Performance Monitoring**: Enhanced logging and progress tracking for large operations

### 📊 Impact
- **Functionality**: Fixed core feature that was only working for single commits
- **Performance**: Dramatically improved processing speed for multi-commit operations
- **Reliability**: Eliminated race conditions and hash invalidation issues
- **User Experience**: Restored confidence in date rewriting functionality

## [1.1.1] - 2025-11-10

### Fixed 🔧
- **Test Suite Enhancement**: Dramatically improved test coverage and reliability
  - Increased test count from 24 to 52 comprehensive tests
  - Achieved 100% test success rate (52/52 tests passing)
  - Added comprehensive AI Assistant tests with 26 test cases
  - Fixed Windows path validation issues in validator
  - Enhanced test coverage to 32.19% from initial 17.97%
- **Code Quality Improvements**:
  - Fixed ESLint unnecessary escape character warnings
  - Cleaned up package.json bin configuration
  - Improved error handling and validation
- **Build System**: Enhanced npm publish process with better error handling

### Technical Details
- **Test Framework**: Comprehensive Jest test suite with mocked dependencies
- **Test Coverage**: Core modules fully tested including AI functionality, Git operations, and validation
- **Quality Assurance**: All 52 tests passing consistently
- **Package Size**: 45.3 kB (199.0 kB unpacked)

---

## [1.0.0] - 2025-11-10

### Added 🚀
- **Initial Release**: Complete Git Commit Time Machine tool
- **AI-Powered Commit Messages**: Generate creative commit messages using multiple AI providers
  - OpenAI: GPT-5, GPT-4.1, GPT-4o, and legacy models
  - Anthropic Claude: Claude 4.5, Claude 4.1, and legacy models
  - Google Gemini: Gemini 2.5, Gemma 3, and legacy models
  - Local AI: Ollama with 100+ models (Llama 3.3, DeepSeek-R1, Phi-4, etc.)
- **Multi-Language Support**: AI commit generation in 12 languages
  - English, Turkish, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Japanese, Chinese, Korean
- **Commit Message Styles**: Conventional, Descriptive, Minimal, Humorous
- **Git History Manipulation**:
  - Change commit dates within specified ranges
  - Edit commit messages and content
  - Sanitize sensitive data from repository history
- **Security Features**:
  - Sensitive data detection and replacement
  - API key management and hiding
  - Secure backup and restore system
- **Date Analysis**: Comprehensive commit date and time analysis
- **CLI Interface**: Full command-line interface with interactive modes
- **Package Distribution**: Available as npm package `gctm`
- **Configuration Management**: AI provider and model configuration
- **Testing Suite**: 24 comprehensive tests covering all functionality
- **Content Editor**: Pattern-based content replacement and sanitization
- **Backup Manager**: Complete backup and restore system with metadata

### Features
- **Git History Rewriting**: Safely modify commit dates, messages, and content
- **AI Integration**: Multiple AI providers with 2025 latest models
- **Multi-Platform Support**: Windows, macOS, Linux
- **Developer Tools**: CLI commands for all operations
- **Backup Safety**: Automatic backup creation before operations
- **Sensitive Data Protection**: Detect and hide API keys, emails, passwords

### Technical Details
- **Node.js**: >= 14.0.0 required
- **Dependencies**: 8 production dependencies
- **Package Size**: 39.7 kB (169.8 kB unpacked)
- **Test Coverage**: 24 passing tests
- **License**: MIT License (c) 2025 ERSIN KOC

### Documentation
- README.md with comprehensive installation and usage instructions
- AI_GUIDE.md with detailed AI provider setup
- API reference for programmatic usage
- CLI command reference
- Security considerations and best practices

---

## Usage Examples

### Basic Usage
```bash
# Install globally
npm install -g gctm

# Generate AI commit message in Turkish
gctm ai-generate --language tr --style humorous

# Change commit dates
gctm redate --start "2023-01-01" --end "2023-01-30" --backup

# Sanitize sensitive data
gctm sanitize --patterns "apiKeys,email" --replacement "***REDACTED***"
```

### AI Configuration
```bash
# Configure OpenAI
gctm ai-config --provider openai --model gpt-5-main --api-key "your-key"

# Test AI connection
gctm ai-config --test

# Show configuration
gctm ai-config --show
```

### Programmatic Usage
```javascript
const { GitCommitTimeMachine } = require('gctm');

const gctm = new GitCommitTimeMachine();

// Generate AI commit message
const result = await gctm.generateAICommitMessage({
  language: 'tr',
  style: 'humorous'
});

// Edit commit dates
await gctm.redateCommits({
  startDate: '2023-01-01',
  endDate: '2023-01-30',
  createBackup: true
});
```

---

**Full Project Documentation**: https://github.com/ersinkoc/git-commit-time-machine

**npm Package**: https://www.npmjs.com/package/gctm