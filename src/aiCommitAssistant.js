const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./utils/logger');

/**
 * AI-powered commit message assistant
 */
class AICommitAssistant {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY;
    this.apiProvider = options.provider || 'openai'; // openai, anthropic, google, local
    this.model = options.model || 'gpt-5-main'; // Updated to 2025 latest model
    this.maxTokens = options.maxTokens || 150;
    this.temperature = options.temperature || 0.7;
    this.language = options.language || 'en'; // en, tr, es, fr, de, etc.
    this.style = options.style || 'conventional'; // conventional, descriptive, minimal, humorous
    this.configPath = options.configPath || '.gctm-ai-config.json';
    this.customInstructions = options.customInstructions || '';
    this.timeout = options.timeout || 60000; // Default 60 seconds, configurable for slow networks
  }

  /**
   * Initialize AI assistant configuration
   * @returns {Promise<Object>} Configuration status
   */
  async initialize() {
    try {
      // Load existing configuration if available
      await this.loadConfig();

      if (!this.apiKey) {
        logger.warn('No AI API key found. Please set OPENAI_API_KEY or AI_API_KEY environment variable.');
        return {
          success: false,
          error: 'API key required. Set OPENAI_API_KEY or AI_API_KEY environment variable.'
        };
      }

      logger.info('AI Commit Assistant initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error(`Failed to initialize AI assistant: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      if (await fs.pathExists(this.configPath)) {
        const config = await fs.readJson(this.configPath);
        Object.assign(this, config);
        logger.debug('AI configuration loaded from file');
      }
    } catch (error) {
      logger.warn(`Could not load AI config: ${error.message}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig() {
    try {
      const config = {
        apiKey: this.apiKey,
        apiProvider: this.apiProvider,
        model: this.model,
        maxTokens: this.maxTokens,
        temperature: this.temperature,
        language: this.language,
        style: this.style,
        customInstructions: this.customInstructions
      };

      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      logger.debug('AI configuration saved');
    } catch (error) {
      logger.warn(`Could not save AI config: ${error.message}`);
    }
  }

  /**
   * Generate commit message using AI
   * @param {Object} options - Generation options
   * @param {Array} options.changedFiles - List of changed files
   * @param {string} options.diff - Git diff output
   * @param {string} options.currentMessage - Current commit message (for rewriting)
   * @param {string} options.language - Target language
   * @param {string} options.style - Commit message style
   * @param {string} options.context - Additional context
   * @returns {Promise<Object>} Generated commit message
   */
  async generateCommitMessage(options = {}) {
    try {
      const {
        changedFiles = [],
        diff = '',
        currentMessage = '',
        language = this.language,
        style = this.style,
        context = ''
      } = options;

      if (!this.apiKey) {
        throw new Error('AI API key not configured');
      }

      const prompt = this.buildPrompt({
        changedFiles,
        diff,
        currentMessage,
        language,
        style,
        context
      });

      logger.info(`Generating AI commit message (${style} style, ${language} language)...`);

      const response = await this.callAI(prompt);

      if (!response.success) {
        throw new Error(response.error);
      }

      const suggestions = this.parseResponse(response.message, style);

      logger.success('AI commit message generated successfully');
      return {
        success: true,
        suggestions,
        raw: response.message
      };

    } catch (error) {
      logger.error(`Failed to generate AI commit message: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build prompt for AI based on options
   * @param {Object} options - Prompt building options
   * @returns {string} Generated prompt
   */
  buildPrompt(options) {
    const { changedFiles, diff, currentMessage, language, style, context } = options;

    const styleInstructions = this.getStyleInstructions(style, language);
    const languageInstructions = this.getLanguageInstructions(language);

    let prompt = `You are an expert Git commit message writer. Generate commit messages based on the provided changes.

${languageInstructions}

${styleInstructions}

Changes:
`;

    if (context) {
      prompt += `Context: ${context}\n`;
    }

    if (changedFiles.length > 0) {
      prompt += `\nFiles changed:\n${changedFiles.map(f => `- ${f}`).join('\n')}\n`;
    }

    if (diff) {
      prompt += `\nDiff preview (first 1000 chars):\n${diff.substring(0, 1000)}${diff.length > 1000 ? '...' : ''}\n`;
    }

    if (currentMessage) {
      prompt += `\nCurrent message to improve: "${currentMessage}"\n`;
    }

    if (this.customInstructions) {
      prompt += `\nAdditional instructions: ${this.customInstructions}\n`;
    }

    prompt += `
Generate a commit message that:
1. Clearly describes what changed and why
2. Follows the specified style and conventions
3. Is written in the specified language
4. Is concise but informative

Provide 3 different options, numbered 1-3.`;

    return prompt;
  }

  /**
   * Get style-specific instructions
   * @param {string} style - Commit message style
   * @param {string} language - Target language
   * @returns {string} Style instructions
   */
  getStyleInstructions(style, language) {
    const instructions = {
      conventional: {
        en: 'Use conventional commits format: type(scope): description. Types: feat, fix, docs, style, refactor, test, chore',
        es: 'Usa formato de commits convencionales: tipo(alcance): descripción. Tipos: feat, fix, docs, style, refactor, test, chore',
        fr: 'Utilise le format des commits conventionnels: type(portée): description. Types: feat, fix, docs, style, refactor, test, chore',
        de: 'Verwende konventionelles Commit-Format: typ(bereich): beschreibung. Typen: feat, fix, docs, style, refactor, test, chore',
        tr: 'Konvansiyonel commit formatı kullan: tip(kapsam): açıklama. Tipler: feat, fix, docs, style, refactor, test, chore',
        it: 'Usa il formato dei commit convenzionali: tipo(ambito): descrizione. Tipi: feat, fix, docs, style, refactor, test, chore',
        pt: 'Use formato de commits convencionais: tipo(escopo): descrição. Tipos: feat, fix, docs, style, refactor, test, chore',
        nl: 'Gebruik conventionele commit-indeling: type(scope): beschrijving. Types: feat, fix, docs, style, refactor, test, chore',
        ru: 'Используйте формат условных коммитов: тип(область): описание. Типы: feat, fix, docs, style, refactor, test, chore',
        ja: '慣例的なコミット形式を使用: type(scope): 説明。タイプ: feat, fix, docs, style, refactor, test, chore',
        zh: '使用约定式提交格式：type(scope): 描述。类型：feat, fix, docs, style, refactor, test, chore',
        ko: '컨벤셔널 커밋 형식 사용: type(scope): 설명. 타입: feat, fix, docs, style, refactor, test, chore'
      },
      descriptive: {
        en: 'Write descriptive, detailed commit messages that explain what changed and why',
        es: 'Escribe mensajes de commit descriptivos y detallados que expliquen qué cambió y por qué',
        fr: 'Rédigez des messages de commit descriptifs et détaillés expliquant ce qui a changé et pourquoi',
        de: 'Schreibe beschreibende, detaillierte Commit-Nachrichten, die erklären was sich geändert hat und warum',
        tr: 'Ne değiştiğini ve neden olduğunu açıklayan açıklayıcı, detaylı commit mesajları yaz',
        it: 'Scrivi messaggi di commit descrittivi e dettagliati che spiegano cosa è cambiato e perché',
        pt: 'Escreva mensagens de commit descritivas e detalhadas que explicam o que mudou e por quê',
        nl: 'Schrijf beschrijvende, gedetailleerde commit-berichten die uitleggen wat er veranderd is en waarom',
        ru: 'Пишите описательные, подробные сообщения коммитов, объясняющие, что изменилось и почему',
        ja: '何が変更されたのか、なぜ変更されたのかを説明する、詳細で説明的なコミットメッセージを書いてください',
        zh: '编写描述性的、详细的提交消息，解释更改内容和原因',
        ko: '무엇이 바뀌었는지와 왜 바뀌었는지를 설명하는 설명적이고 상세한 커밋 메시지를 작성하세요'
      },
      minimal: {
        en: 'Write short, minimal commit messages (maximum 50 characters)',
        es: 'Escribe mensajes de commit cortos y mínimos (máximo 50 caracteres)',
        fr: 'Rédigez des messages de commit courts et minimaux (maximum 50 caractères)',
        de: 'Schreibe kurze, minimale Commit-Nachrichten (maximal 50 Zeichen)',
        tr: 'Kısa, minimal commit mesajları yaz (en fazla 50 karakter)',
        it: 'Scrivi messaggi di commit brevi e minimi (massimo 50 caratteri)',
        pt: 'Escreva mensagens de commit curtas e mínimas (máximo 50 caracteres)',
        nl: 'Schrijf korte, minimale commit-berichten (maximaal 50 tekens)',
        ru: 'Пишите короткие, минимальные сообщения коммитов (максимум 50 символов)',
        ja: '短い、最小限のコミットメッセージを書いてください（最大50文字）',
        zh: '编写简短、最少的提交消息（最多50个字符）',
        ko: '짧고 최소한의 커밋 메시지를 작성하세요 (최대 50자)'
      },
      humorous: {
        en: 'Write creative, slightly humorous commit messages while still being professional',
        es: 'Escribe mensajes de commit creativos y ligeramente humorísticos manteniendo la profesionalidad',
        fr: 'Rédigez des messages de commit créatifs et légèrement humoristiques tout en restant professionnel',
        de: 'Schreibe kreative, leicht humorvolle Commit-Nachrichten, die immer noch professionell bleiben',
        tr: 'Hala profesyonel kalırken yaratıcı, esprili commit mesajları yaz',
        it: 'Scrivi messaggi di commit creativi e leggermente umoristici rimanendo professionali',
        pt: 'Escreva mensagens de commit criativas e ligeiramente humorísticas mantendo o profissionalismo',
        nl: 'Schrijf creatieve, licht humoristische commit-berichten terwijl u professioneel blijft',
        ru: 'Пишите креативные, слегка юмористические сообщения коммитов, сохраняя при этом профессионализм',
        ja: 'プロフェッショナルでありながら、クリエイティブで少しユーモアのあるコミットメッセージを書いてください',
        zh: '编写有创意、略带幽默的提交消息，同时保持专业性',
        ko: '전문성을 유지하면서 창의적이고 약간 유머러스한 커밋 메시지를 작성하세요'
      }
    };

    return instructions[style]?.[language] || instructions.conventional.en;
  }

  /**
   * Get language-specific instructions
   * @param {string} language - Target language
   * @returns {string} Language instructions
   */
  getLanguageInstructions(language) {
    const instructions = {
      en: 'Write the commit message in English.',
      es: 'Escribe el mensaje del commit en español.',
      fr: 'Rédigez le message de commit en français.',
      de: 'Schreibe die Commit-Nachricht auf Deutsch.',
      tr: 'Commit mesajını Türkçe yaz.',
      it: 'Scrivi il messaggio di commit in italiano.',
      pt: 'Escreva a mensagem de commit em português.',
      nl: 'Schrijf het commit-bericht in het Nederlands.',
      ru: 'Напишите сообщение коммита на русском языке.',
      ja: 'コミットメッセージを日本語で書いてください。',
      zh: '用中文编写提交消息。',
      ko: '커밋 메시지를 한국어로 작성하세요.'
    };

    return instructions[language] || instructions.en;
  }

  /**
   * Call AI API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<Object>} AI response
   */
  async callAI(prompt) {
    try {
      switch (this.apiProvider) {
        case 'openai':
          return await this.callOpenAI(prompt);
        case 'anthropic':
          return await this.callAnthropic(prompt);
        case 'google':
          return await this.callGoogle(prompt);
        case 'local':
          return await this.callLocalAI(prompt);
        default:
          throw new Error(`Unsupported AI provider: ${this.apiProvider}`);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Call OpenAI API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<Object>} OpenAI response
   */
  async callOpenAI(prompt) {
    try {
      // Validate model is supported (2025 latest models)
      const supportedModels = [
        // GPT-5 Family (Latest)
        'gpt-5-main', 'gpt-5-main-mini', 'gpt-5-thinking', 'gpt-5-thinking-mini', 'gpt-5-thinking-nano',
        // GPT-4.1 Family
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
        // GPT-4o Family (Multimodal)
        'gpt-4o', 'gpt-4o-mini', 'gpt-4o-realtime',
        // o-series (Reasoning)
        'o1', 'o3', 'o4-mini', 'o4-mini-high',
        // Specialized Models
        'dall-e-3', 'whisper-1', 'gpt-realtime-mini',
        // GPT-3.5 Series (Legacy)
        'text-davinci-003', 'text-davinci-002', 'code-davinci-002', 'gpt-3.5-turbo',
        // GPT-3 Series (Legacy)
        'text-curie-001', 'text-babbage-001', 'text-ada-001',
        // Open Source Models
        'gpt-oss', 'gpt-oss-safeguard',
        // Additional Legacy
        'gpt-4-turbo', 'gpt-4'
      ];

      if (!supportedModels.includes(this.model)) {
        logger.warn(`Model ${this.model} may not be supported. Consider using: gpt-5-main, gpt-4.1, or gpt-4o`);
      }

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates Git commit messages. Follow conventional commit standards when appropriate.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      // Validate response structure
      if (!response.data || !response.data.choices || !Array.isArray(response.data.choices) || response.data.choices.length === 0) {
        throw new Error('Invalid API response format: missing choices array');
      }

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid API response format: missing message content');
      }

      return {
        success: true,
        message: content
      };
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Call Anthropic Claude API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<Object>} Anthropic response
   */
  async callAnthropic(prompt) {
    try {
      // Latest Claude models (2025)
      const supportedModels = [
        // Claude Sonnet 4.5 Series (Latest)
        'claude-sonnet-4-5-20250929',
        // Claude Sonnet 4 Series
        'claude-sonnet-4-20250522',
        // Claude Opus 4.1 Series (Most powerful)
        'claude-opus-4-1-20250805',
        // Claude Sonnet 3.7 Series (Hybrid reasoning)
        'claude-sonnet-3-7-20250224',
        // Claude Haiku 4.5 Series (Fast & economical)
        'claude-haiku-4-5-20251015',
        // Claude Haiku 3.5 Series (Legacy)
        'claude-3-5-haiku-20241022',
        // Claude 3 Series (Legacy)
        'claude-3-5-sonnet-20241022',
        'claude-3-5-opus-20241022',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
        'claude-3-haiku-20240307'
      ];

      const modelToUse = this.model || 'claude-haiku-4-5-20251015';

      if (!supportedModels.includes(modelToUse)) {
        logger.warn(`Model ${modelToUse} may not be supported. Consider using: claude-haiku-4-5-20251015 or claude-sonnet-4-5-20250929`);
      }

      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: modelToUse,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature
      }, {
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: this.timeout
      });

      // Validate response structure
      if (!response.data || !response.data.content || !Array.isArray(response.data.content) || response.data.content.length === 0) {
        throw new Error('Invalid API response format: missing content array');
      }

      const text = response.data.content[0]?.text;
      if (!text) {
        throw new Error('Invalid API response format: missing text content');
      }

      return {
        success: true,
        message: text
      };
    } catch (error) {
      throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Call Google Gemini API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<Object>} Google response
   */
  async callGoogle(prompt) {
    try {
      // Latest Gemini models (2025)
      const supportedModels = [
        // Gemini 2.5 Family
        'gemini-2.5-pro', 'gemini-2.5-pro-latest',
        'gemini-2.5-flash', 'gemini-2.5-flash-latest',
        'gemini-2.5-flash-native-audio',
        'gemini-2.5-computer-use',
        'gemini-2.5-image-preview',

        // Gemini 2.5 TTS & Audio
        'gemini-2.5-pro-tts', 'gemini-2.5-flash-tts',
        'lyria-realtime',

        // Gemini Pro Series (Legacy)
        'gemini-pro', 'gemini-pro-vision',

        // Gemma Open Source Models
        'gemma3', 'gemma3:1b', 'gemma3:4b', 'gemma3:12b', 'gemma3:27b',
        'gemma3n', 'gemma3n:latest',
        'gemma2', 'gemma2:2b', 'gemma2:9b', 'gemma2:27b'
      ];

      const modelToUse = this.model || 'gemini-2.5-flash';

      if (!supportedModels.includes(modelToUse)) {
        logger.warn(`Model ${modelToUse} may not be supported. Consider using: gemini-2.5-pro or gemini-2.5-flash`);
      }

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${this.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens,
            candidateCount: 1
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      // Validate response structure
      if (!response.data || !response.data.candidates || !Array.isArray(response.data.candidates) || response.data.candidates.length === 0) {
        throw new Error('Invalid API response format: missing candidates array');
      }

      const text = response.data.candidates[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Invalid API response format: missing text content');
      }

      return {
        success: true,
        message: text
      };
    } catch (error) {
      throw new Error(`Google Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Call Local AI API
   * @param {string} prompt - Prompt to send
   * @returns {Promise<Object>} Local AI response
   */
  async callLocalAI(prompt) {
    try {
      // Latest Ollama models (2025 - 100+ models available)
      const supportedModels = [
        // Meta Llama Family (Latest)
        'llama3.3', 'llama3.3:70b',
        'llama3.2', 'llama3.2:1b', 'llama3.2:3b',
        'llama3.1', 'llama3.1:8b', 'llama3.1:70b', 'llama3.1:405b',
        'llama3', 'llama3:8b', 'llama3:70b',
        'llama2', 'llama2:7b', 'llama2:13b', 'llama2:70b',
        'codellama', 'codellama:7b', 'codellama:13b', 'codellama:34b',

        // DeepSeek Family (Reasoning Models)
        'deepseek-r1', 'deepseek-r1:1.5b', 'deepseek-r1:7b', 'deepseek-r1:14b', 'deepseek-r1:671b',
        'deepseek-v3.1-terminus',
        'deepseek-coder', 'deepseek-coder:6.7b', 'deepseek-coder:33b',

        // Alibaba Qwen Family
        'qwen3', 'qwen3:latest',
        'qwen2.5', 'qwen2.5:14b', 'qwen2.5:32b', 'qwen2.5:72b',
        'qwen2.5-coder', 'qwen2.5-coder:latest',
        'qWQ', 'qWQ:latest',

        // Microsoft Phi Family
        'phi4', 'phi4:14b',
        'phi3', 'phi3:mini', 'phi3:medium', 'phi3:small',

        // Google Gemma Family
        'gemma3', 'gemma3:1b', 'gemma3:4b', 'gemma3:12b', 'gemma3:27b',
        'gemma3n', 'gemma3n:latest',
        'gemma2', 'gemma2:2b', 'gemma2:9b', 'gemma2:27b',

        // Mistral Family
        'mistral', 'mistral:7b', 'mistral:large',
        'mixtral', 'mixtral:8x7b', 'mixtral:8x22b',

        // Other Popular Models
        'vicuna', 'vicuna:7b', 'vicuna:13b',
        'orca-mini', 'orca-mini:3b', 'orca-mini:7b', 'orca-mini:13b',
        'llava', 'llava:1.6',
        'tinyllama', 'tinyllama:1.1b',
        'dolphin', 'dolphin:7b', 'dolphin:70b',
        'wizardlm', 'wizardlm:latest',
        'aya', 'aya:latest',
        'command-r', 'command-r:latest',
        'starling', 'starling:latest',
        'openhermes', 'openhermes:latest',

        // Specialized Models
        'nomic-embed-text', 'text-embedding-3-small',
        'qwen-vl', 'llava-v1.5-7b'
      ];

      const modelToUse = this.model || 'llama3.3:70b';

      if (!supportedModels.includes(modelToUse)) {
        logger.warn(`Model ${modelToUse} may not be available. Popular choices: llama3.3:70b, phi4:14b, deepseek-r1:14b, qwen2.5:72b`);
      }

      const response = await axios.post('http://localhost:11434/api/generate', {
        model: modelToUse,
        prompt: prompt,
        options: {
          temperature: this.temperature,
          num_predict: this.maxTokens
        }
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: this.timeout
      });

      // Validate response structure
      if (!response.data || !response.data.response) {
        throw new Error('Invalid API response format: missing response field');
      }

      return {
        success: true,
        message: response.data.response
      };
    } catch (error) {
      throw new Error(`Local AI error: ${error.message}. Make sure Ollama is running and the model is available.`);
    }
  }

  /**
   * Parse AI response to extract suggestions
   * @param {string} response - AI response
   * @param {string} style - Commit message style
   * @returns {Array} Array of suggestions
   */
  parseResponse(response, style) {
    const lines = response.split('\n').filter(line => line.trim());
    const suggestions = [];

    // Try to extract numbered suggestions
    for (const line of lines) {
      const match = line.match(/^\d+\.\s*(.+)$/);
      if (match) {
        suggestions.push(match[1].trim());
      }
    }

    // If no numbered suggestions found, use non-empty lines
    if (suggestions.length === 0) {
      for (const line of lines) {
        if (line.trim() && !line.toLowerCase().includes('here are') && !line.toLowerCase().includes('commit message')) {
          suggestions.push(line.trim());
        }
      }
    }

    // Limit to 5 suggestions and clean them
    return suggestions.slice(0, 5).map(s => this.cleanCommitMessage(s, style));
  }

  /**
   * Clean and format commit message
   * @param {string} message - Raw message
   * @param {string} style - Target style
   * @returns {string} Cleaned message
   */
  cleanCommitMessage(message, style) {
    let cleaned = message.trim();

    // Remove quotes if entire message is quoted
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    // Remove common prefixes
    cleaned = cleaned.replace(/^(commit message:|message:|here's? )/i, '').trim();

    // Apply style-specific formatting
    switch (style) {
      case 'minimal':
        cleaned = cleaned.split('\n')[0].substring(0, 50);
        break;
      case 'conventional':
        // Ensure it follows conventional format
        if (!/^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:/.test(cleaned)) {
          cleaned = `chore: ${cleaned}`;
        }
        break;
    }

    return cleaned;
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration options
   * @returns {Promise<Object>} Update result
   */
  async updateConfig(newConfig) {
    try {
      Object.assign(this, newConfig);
      await this.saveConfig();
      logger.info('AI configuration updated');
      return { success: true };
    } catch (error) {
      logger.error(`Failed to update AI config: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      apiKey: this.apiKey ? '***' : null,
      apiProvider: this.apiProvider,
      model: this.model,
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      language: this.language,
      style: this.style,
      customInstructions: this.customInstructions
    };
  }

  /**
   * Test AI connection
   * @returns {Promise<Object>} Test result
   */
  async testConnection() {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'No API key configured' };
      }

      const testPrompt = 'Generate a simple test commit message for adding a new feature.';
      const result = await this.callAI(testPrompt);

      return {
        success: result.success,
        message: result.success ? 'AI connection successful' : result.error
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = AICommitAssistant;