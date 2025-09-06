/**
 * AI Commit Assistant - Comprehensive Tests
 */

const AICommitAssistant = require('../src/aiCommitAssistant');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// Mock axios to prevent actual API calls
jest.mock('axios');

describe('AICommitAssistant', () => {
  let aiAssistant;
  let tempConfigDir;

  beforeEach(async () => {
    // Create temporary config directory for tests
    tempConfigDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gctm-ai-test-'));

    // Mock console methods to reduce noise in tests
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    aiAssistant = new AICommitAssistant({
      configPath: path.join(tempConfigDir, 'test-config.json'),
      strictValidation: false,
      throwOnValidationError: false
    });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempConfigDir);
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should create instance with default options', () => {
      const instance = new AICommitAssistant({
        strictValidation: false,
        throwOnValidationError: false
      });

      expect(instance.apiProvider).toBe('openai');
      expect(instance.model).toBe('gpt-4-turbo');
      expect(instance.language).toBe('en');
      expect(instance.style).toBe('conventional');
      expect(instance.maxTokens).toBe(150);
      expect(instance.temperature).toBe(0.7);
      expect(instance.timeout).toBe(60000);
      expect(instance.ollamaUrl).toBe('http://localhost:11434');
    });

    test('should create instance with custom options', () => {
      const options = {
        apiKey: 'test-key-123',
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251015',
        language: 'tr',
        style: 'descriptive',
        maxTokens: 200,
        temperature: 0.5,
        timeout: 30000,
        ollamaUrl: 'http://localhost:11435',
        strictValidation: false,
        throwOnValidationError: false
      };

      const instance = new AICommitAssistant(options);
      expect(instance.apiKey).toBe('test-key-123');
      expect(instance.apiProvider).toBe('anthropic');
      expect(instance.model).toBe('claude-haiku-4-5-20251015');
      expect(instance.language).toBe('tr');
      expect(instance.style).toBe('descriptive');
      expect(instance.maxTokens).toBe(200);
      expect(instance.temperature).toBe(0.5);
      expect(instance.timeout).toBe(30000);
      expect(instance.ollamaUrl).toBe('http://localhost:11435');
    });

    test('should handle missing API key gracefully', () => {
      const instance = new AICommitAssistant({
        strictValidation: false,
        throwOnValidationError: false
      });

      expect(instance.apiKey).toBeUndefined();
    });
  });

  describe('Model Validation', () => {
    test('should get default model for provider', () => {
      expect(aiAssistant.getDefaultModel('openai')).toBe('gpt-4-turbo');
      expect(aiAssistant.getDefaultModel('anthropic')).toBe('claude-haiku-4-5-20251015');
      expect(aiAssistant.getDefaultModel('google')).toBe('gemini-2.5-flash');
      expect(aiAssistant.getDefaultModel('local')).toBe('llama3.3:70b');
      expect(aiAssistant.getDefaultModel('unknown')).toBe('gpt-4-turbo');
    });

    test('should get supported models for provider', () => {
      const openaiModels = aiAssistant.getSupportedModels('openai');
      expect(openaiModels).toContain('gpt-4-turbo');
      expect(openaiModels).toContain('gpt-5-main');

      const anthropicModels = aiAssistant.getSupportedModels('anthropic');
      expect(anthropicModels).toContain('claude-haiku-4-5-20251015');
      expect(anthropicModels).toContain('claude-sonnet-4-5-20250929');
    });

    test('should validate API key format', () => {
      // Test valid formats
      expect(() => {
        const assistant = new AICommitAssistant({
          apiKey: 'sk-1234567890abcdef1234567890abcdef12345678',
          strictValidation: false,
          throwOnValidationError: false
        });
        assistant.validateApiKeyFormat();
      }).not.toThrow();

      // Test invalid formats (should not throw in non-strict mode)
      expect(() => {
        const assistant = new AICommitAssistant({
          apiKey: 'invalid-key',
          strictValidation: false,
          throwOnValidationError: false
        });
        assistant.validateApiKeyFormat();
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    test('should validate config schema', () => {
      const validConfig = {
        apiProvider: 'openai',
        model: 'gpt-4-turbo',
        maxTokens: 150,
        temperature: 0.7,
        language: 'en',
        style: 'conventional',
        timeout: 60000,
        ollamaUrl: 'http://localhost:11434',
        customInstructions: 'Test instructions'
      };

      const validated = aiAssistant.validateConfigSchema(validConfig);
      expect(validated).toEqual(validConfig);
    });

    test('should reject invalid config schema', () => {
      expect(() => {
        aiAssistant.validateConfigSchema({
          apiProvider: 'invalid-provider'
        });
      }).toThrow('Invalid apiProvider: invalid-provider');

      expect(() => {
        aiAssistant.validateConfigSchema({
          maxTokens: -1
        });
      }).toThrow('Invalid maxTokens: must be between 1 and 4000');

      expect(() => {
        aiAssistant.validateConfigSchema({
          temperature: 3
        });
      }).toThrow('Invalid temperature: must be between 0 and 2');
    });

    test('should update configuration', async () => {
      const newConfig = {
        model: 'gpt-5-main',
        language: 'fr',
        style: 'minimal',
        maxTokens: 200
      };

      const result = await aiAssistant.updateConfig(newConfig);
      expect(result.success).toBe(true);
      expect(aiAssistant.model).toBe('gpt-5-main');
      expect(aiAssistant.language).toBe('fr');
      expect(aiAssistant.style).toBe('minimal');
      expect(aiAssistant.maxTokens).toBe(200);
    });

    test('should handle invalid configuration update', async () => {
      const invalidConfig = {
        temperature: 2.5, // Invalid: should be 0-2
        maxTokens: -50    // Invalid: should be positive
      };

      const result = await aiAssistant.updateConfig(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should save and load configuration', async () => {
      // Set some configuration
      aiAssistant.language = 'es';
      aiAssistant.style = 'descriptive';
      aiAssistant.customInstructions = 'Test instructions';

      // Save configuration
      await aiAssistant.saveConfig();

      // Create new instance and load config
      const newAssistant = new AICommitAssistant({
        configPath: aiAssistant.configPath,
        strictValidation: false,
        throwOnValidationError: false
      });
      await newAssistant.loadConfig();

      expect(newAssistant.language).toBe('es');
      expect(newAssistant.style).toBe('descriptive');
      expect(newAssistant.customInstructions).toBe('Test instructions');
    });

    test('should get current configuration', () => {
      const config = aiAssistant.getConfig();
      expect(config).toHaveProperty('apiProvider');
      expect(config).toHaveProperty('model');
      expect(config).toHaveProperty('language');
      expect(config).toHaveProperty('style');
      expect(config).toHaveProperty('maxTokens');
      expect(config).toHaveProperty('temperature');

      // API key should be masked
      if (config.apiKey) {
        expect(config.apiKey).toBe('***');
      }
    });
  });

  describe('Prompt Building', () => {
    test('should build prompt with options', () => {
      const options = {
        changedFiles: ['src/index.js', 'test/index.test.js'],
        diff: '+ some new code\n- old code',
        currentMessage: 'old message',
        language: 'en',
        style: 'conventional',
        context: 'Adding new feature'
      };

      const prompt = aiAssistant.buildPrompt(options);

      expect(prompt).toContain('expert Git commit message writer');
      expect(prompt).toContain('src/index.js');
      expect(prompt).toContain('test/index.test.js');
      expect(prompt).toContain('some new code');
      expect(prompt).toContain('old code');
      expect(prompt).toContain('old message');
      expect(prompt).toContain('Adding new feature');
    });

    test('should handle empty options', () => {
      const prompt = aiAssistant.buildPrompt({
        changedFiles: [],
        diff: '',
        currentMessage: '',
        language: 'en',
        style: 'conventional',
        context: ''
      });
      expect(prompt).toContain('expert Git commit message writer');
    });

    test('should get style instructions', () => {
      const conventionalStyle = aiAssistant.getStyleInstructions('conventional', 'en');
      expect(conventionalStyle).toContain('conventional commits format');

      const minimalStyle = aiAssistant.getStyleInstructions('minimal', 'tr');
      expect(minimalStyle).toContain('en fazla 50 karakter');

      const humorousStyle = aiAssistant.getStyleInstructions('humorous', 'es');
      expect(humorousStyle).toContain('ligeramente humorísticos');
    });

    test('should get language instructions', () => {
      const enInstruction = aiAssistant.getLanguageInstructions('en');
      expect(enInstruction).toBe('Write the commit message in English.');

      const trInstruction = aiAssistant.getLanguageInstructions('tr');
      expect(trInstruction).toBe('Commit mesajını Türkçe yaz.');
    });
  });

  describe('Response Parsing', () => {
    test('should parse response with numbered suggestions', () => {
      const response = `1. feat: add new authentication feature
2. fix: resolve login bug
3. docs: update API documentation

Here are some additional suggestions...`;

      const suggestions = aiAssistant.parseResponse(response, 'conventional');
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toBe('feat: add new authentication feature');
      expect(suggestions[1]).toBe('fix: resolve login bug');
      expect(suggestions[2]).toBe('docs: update API documentation');
    });

    test('should parse response without numbered suggestions', () => {
      const response = `feat: implement user registration
fix: correct password validation
refactor: optimize database queries`;

      const suggestions = aiAssistant.parseResponse(response, 'conventional');
      expect(suggestions).toHaveLength(3);
      expect(suggestions[0]).toBe('feat: implement user registration');
    });

    test('should clean commit message according to style', () => {
      // Test conventional style
      const conventionalMessage = aiAssistant.cleanCommitMessage('add new feature', 'conventional');
      expect(conventionalMessage).toBe('chore: add new feature');

      // Test minimal style
      const minimalMessage = aiAssistant.cleanCommitMessage('This is a very long message that should be truncated', 'minimal');
      expect(minimalMessage.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Error Message Sanitization', () => {
    test('should sanitize API keys from error messages', () => {
      const errorMessage = 'API key sk-1234567890abcdef1234567890abcdef12345678 is invalid';
      const sanitized = aiAssistant.sanitizeErrorMessage(errorMessage);
      expect(sanitized).toContain('sk-***REDACTED***');
      expect(sanitized).not.toContain('sk-1234567890abcdef1234567890abcdef12345678');
    });

    test('should handle empty error message', () => {
      const sanitized = aiAssistant.sanitizeErrorMessage('');
      expect(sanitized).toBe('Unknown error occurred');
    });

    test('should handle null error message', () => {
      const sanitized = aiAssistant.sanitizeErrorMessage(null);
      expect(sanitized).toBe('Unknown error occurred');
    });
  });

  describe('API Calls', () => {
    test('should handle missing API key in generateCommitMessage', async () => {
      aiAssistant.apiKey = null;

      const result = await aiAssistant.generateCommitMessage({
        changedFiles: ['test.js'],
        diff: '+ new code'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API key not configured');
    });

    test('should call OpenAI API', async () => {
      aiAssistant.apiProvider = 'openai';
      aiAssistant.apiKey = 'test-key';

      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'feat: add new feature'
              }
            }
          ]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await aiAssistant.callOpenAI('test prompt');

      expect(result.success).toBe(true);
      expect(result.message).toBe('feat: add new feature');
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should handle OpenAI API errors', async () => {
      aiAssistant.apiProvider = 'openai';
      aiAssistant.apiKey = 'invalid-key';

      axios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'Invalid API key'
            }
          }
        }
      });

      await expect(aiAssistant.callOpenAI('test prompt')).rejects.toThrow('OpenAI API error');
    });
  });

  describe('Integration Tests', () => {
    test('should initialize successfully', async () => {
      const result = await aiAssistant.initialize();

      // Should fail without API key
      expect(result.success).toBe(false);
      expect(result.error).toContain('API key required');
    });

    test('should test connection', async () => {
      aiAssistant.apiKey = null;

      const result = await aiAssistant.testConnection();
      expect(result.success).toBe(false);
      expect(result.error).toContain('No API key configured');
    });

    test('should complete full workflow with mocked API', async () => {
      aiAssistant.apiKey = 'test-key';

      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: '1. feat: add new authentication feature\n2. fix: resolve login bug\n3. docs: update API documentation'
              }
            }
          ]
        }
      };

      axios.post.mockResolvedValue(mockResponse);

      const options = {
        changedFiles: ['src/auth.js'],
        diff: '+ export function authenticate() { }',
        language: 'en',
        style: 'conventional'
      };

      const result = await aiAssistant.generateCommitMessage(options);

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0]).toBe('feat: add new authentication feature');
      expect(result.suggestions[1]).toBe('fix: resolve login bug');
      expect(result.suggestions[2]).toBe('docs: update API documentation');
    });
  });
});