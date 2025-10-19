# AI-Powered Commit Message Assistant

The Git Commit Time Machine now includes AI-powered commit message generation with support for multiple languages, styles, and AI providers.

## Features

### 🤖 AI Providers Support
- **OpenAI**: GPT-5, GPT-4.1, GPT-4o, o-series, DALL-E 3 (2025 latest models)
- **Anthropic**: Claude Sonnet 4.5, Claude Opus 4.1, Claude Haiku 4.5 (2025 latest models)
- **Google Gemini**: Gemini 2.5 Pro/Flash, Gemma 3, multimodal models (2025 latest)
- **Local AI**: Ollama with 100+ models including Llama 3.3, DeepSeek-R1, Phi-4, Qwen3

### 🌍 Multi-Language Support
- **English** (en): Standard commit messages
- **Español** (es): Spanish commit messages
- **Français** (fr): French commit messages
- **Deutsch** (de): German commit messages
- **Türkçe** (tr): Turkish commit messages
- **Italiano** (it): Italian commit messages
- **Português** (pt): Portuguese commit messages
- **Nederlands** (nl): Dutch commit messages
- **Русский** (ru): Russian commit messages
- **日本語** (ja): Japanese commit messages
- **中文** (zh): Chinese commit messages
- **한국어** (ko): Korean commit messages

### 🎨 Commit Message Styles
- **Conventional**: Follows conventional commit format (type(scope): description)
- **Descriptive**: Detailed, informative commit messages
- **Minimal**: Short, concise commit messages (max 50 characters)
- **Humorous**: Creative, slightly humorous while remaining professional

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key

#### Option A: Environment Variable (Recommended)
```bash
# For OpenAI
export OPENAI_API_KEY="your-openai-api-key-here"

# For Anthropic Claude
export ANTHROPIC_API_KEY="your-anthropic-api-key-here"

# Or use generic AI key
export AI_API_KEY="your-api-key-here"
```

#### Option B: CLI Configuration
```bash
# Set OpenAI API key
gctm ai-config --api-key "your-openai-api-key-here"

# Set provider (openai, anthropic, local)
gctm ai-config --provider openai

# Set model (2024 latest)
gctm ai-config --model gpt-4o-mini

# Set default language
gctm ai-config --language tr

# Set default style
gctm ai-config --style humorous
```

#### Option C: Configuration File
Create a `.gctm-ai-config.json` file in your project root:

```json
{
  "apiKey": "your-api-key-here",
  "apiProvider": "openai",
  "model": "gpt-4o-mini",
  "maxTokens": 150,
  "temperature": 0.7,
  "language": "en",
  "style": "conventional",
  "customInstructions": "Focus on user-facing features and improvements"
}
```

## Usage

### Generate AI Commit Messages

#### Basic Usage
```bash
# Generate with default settings
gctm ai-generate

# Generate in Turkish with humorous style
gctm ai-generate --language tr --style humorous

# Generate with additional context
gctm ai-generate --context "Fixed critical bug in authentication system"

# Improve an existing commit message
gctm ai-generate --current-message "fix bug" --style descriptive
```

#### Interactive Mode
```bash
# Interactive selection and application
gctm ai-generate --interactive

# Generate and automatically apply suggestion #2
gctm ai-generate --apply 2
```

### AI Configuration Management

#### View Current Configuration
```bash
gctm ai-config --show
```

#### Test AI Connection
```bash
gctm ai-config --test
```

#### Update Configuration
```bash
# Change provider
gctm ai-config --provider anthropic --model claude-3-sonnet

# Adjust creativity (0.0 = conservative, 1.0 = creative)
gctm ai-config --temperature 0.9

# Set defaults
gctm ai-config --language es --style minimal
```

## Examples

### Example 1: English Humorous Commit Messages
```bash
# Set English as default language
gctm ai-config --language en --style humorous

# Make some changes to your code
echo "new feature" >> feature.js

# Generate humorous commit message
gctm ai-generate

# Output might be:
# 1. feat: Add new feature, unstoppable development! 🚀
# 2. feat: Code runs, features follow! ⚡
# 3. feat: Today's new, tomorrow's old - feature calendar moving fast
```

### Example 2: Professional Conventional Commits
```bash
# Configure for professional development
gctm ai-config --language en --style conventional --temperature 0.3

# Generate conventional commit
gctm ai-generate --context "Add user authentication middleware"

# Output might be:
# 1. feat(auth): add JWT authentication middleware
# 2. feat(auth): implement user login and registration system
# 3. feat: add passport.js authentication with local strategy
```

### Example 3: Minimal Spanish Commits
```bash
# Spanish minimal commits
gctm ai-generate --language es --style minimal

# Output might be:
# 1. docs: actualizar readme
# 2. fix: corregir error
# 3. feat: nueva función
```

### Example 4: Improve Existing Messages
```bash
# Improve a poor commit message
gctm ai-generate --current-message "stuff" --style descriptive --context "Added database connection"

# Output might be:
# 1. feat: implement PostgreSQL database connection with connection pooling
# 2. feat: add database module with migration support
# 3. feat: integrate PostgreSQL using Sequelize ORM
```

## AI Provider Setup (2025 Latest Models)

### OpenAI
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set environment variable or configure via CLI
3. **Latest 2025 Models**: Complete GPT-5 and GPT-4.1 series

```bash
export OPENAI_API_KEY="sk-..."
gctm ai-config --provider openai --model gpt-5-main
```

**GPT-5 Family (Latest & Most Powerful):**
- **gpt-5-main**: Latest large model series
- **gpt-5-main-mini**: More economical version
- **gpt-5-thinking**: Deep reasoning version
- **gpt-5-thinking-mini**: Lightweight reasoning version
- **gpt-5-thinking-nano**: Fast nano reasoning version

**GPT-4.1 Family (Previous Generation):**
- **gpt-4.1**: Advanced context length and coding capabilities
- **gpt-4.1-mini**: Cost-effective version
- **gpt-4.1-nano**: Lightweight version

**GPT-4o Family (Multimodal):**
- **gpt-4o**: "Omni" model with text, vision, audio support
- **gpt-4o-mini**: Lower cost version
- **gpt-4o-realtime**: Real-time capabilities

**Legacy Models (Still Supported):**
- **gpt-3.5-turbo**: Chat-optimized GPT-3.5 series
- **text-davinci-003**: Completion-type GPT-3.5 model
- **code-davinci-002**: Code generation specialized model

**Recommended for Commit Messages:**
- **gpt-5-main-mini**: Best balance of power and cost
- **gpt-4.1-mini**: Economical with advanced capabilities
- **gpt-4o-mini**: Fast and cost-effective for quick commits

### Anthropic Claude
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Set environment variable or configure via CLI
3. **Latest 2025 Models**: Complete Claude 4.5 and 4.1 series

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
gctm ai-config --provider anthropic --model claude-sonnet-4-5-20250929
```

**Claude 4.5 Series (Latest & Most Advanced):**
- **claude-sonnet-4-5-20250929**: Newest and most advanced model
- **200K-1M token context**: Extended context with beta for 1M tokens
- **Vision capabilities**: Advanced image and PDF processing
- **Computer use**: Direct UI interaction capabilities

**Claude 4 Series:**
- **claude-sonnet-4-20250522**: High-performance model
- **claude-opus-4-1-20250805**: Most powerful model for complex tasks
- **claude-sonnet-3-7-20250224**: Hybrid reasoning capabilities
- **claude-haiku-4-5-20251015**: Fast and economical

**Legacy Claude 3.5 Series:**
- **claude-3-5-haiku-20241022**: Previous generation fast model
- **claude-3-5-sonnet-20241022**: Previous generation balanced model
- **claude-3-5-opus-20241022**: Previous generation powerful model

**Recommended for Commit Messages:**
- **claude-haiku-4-5-20251015**: Fast, affordable with latest capabilities
- **claude-sonnet-4-5-20250929**: Premium quality for complex changes
- **claude-sonnet-3-7-20250224**: Great balance with hybrid reasoning

### Google Gemini
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Set environment variable or configure via CLI
3. **Latest 2025 Models**: Gemini 2.5 series with advanced capabilities

```bash
export GOOGLE_API_KEY="..."
gctm ai-config --provider google --model gemini-2.5-flash
```

**Gemini 2.5 Series (Latest):**
- **gemini-2.5-pro**: Most powerful with adaptive thinking
- **gemini-2.5-flash**: Fast and economical
- **gemini-2.5-flash-native-audio**: Advanced audio processing
- **gemini-2.5-computer-use**: UI interaction capabilities
- **gemini-2.5-image-preview**: Image generation

**Gemini TTS & Audio:**
- **gemini-2.5-pro-tts**: High-quality text-to-speech
- **gemini-2.5-flash-tts**: Economical TTS
- **lyria-realtime**: Live music generation

**Gemma Open Source:**
- **gemma3**: Latest generation (1B, 4B, 12B, 27B)
- **gemma3n**: Edge device optimized
- **gemma2**: Previous generation (2B, 9B, 27B)

**Recommended for Commit Messages:**
- **gemini-2.5-flash**: Fast, affordable with great performance
- **gemini-2.5-pro**: Premium quality for complex projects
- **gemma3:12b**: Efficient local option

### Local AI (Ollama)
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama3.3`
3. Configure provider and model

```bash
gctm ai-config --provider local --model llama3.3:70b
```

**Latest Models (2025 - 100+ Available):**

**Meta Llama Family (State-of-the-Art):**
- **llama3.3:70b**: Latest state-of-the-art model
- **llama3.2:1b/3b**: Small, efficient models
- **llama3.1:8b/70b/405b**: Previous generation powerhouse
- **codellama:7b/13b/34b**: Code generation specialized

**DeepSeek Family (Advanced Reasoning):**
- **deepseek-r1:14b**: State-of-the-art reasoning model
- **deepseek-r1:671b**: Massive reasoning model
- **deepseek-v3.1-terminus**: Hybrid thinking/non-thinking
- **deepseek-coder**: 87 language support for coding

**Microsoft Phi Family:**
- **phi4:14b**: State-of-the-art reasoning capabilities
- **phi3:mini/medium**: Mobile-optimized models

**Google Gemma Family:**
- **gemma3:1b/4b/12b/27b**: Multimodal capabilities
- **gemma2:2b/9b/27b**: Efficient performance

**Alibaba Qwen Family:**
- **qwen3**: Latest generation
- **qwen2.5:72b**: 128K context window
- **qWQ**: Advanced reasoning capabilities

**Recommended for Commit Messages:**
- **llama3.3:70b**: State-of-the-art quality
- **phi4:14b**: Excellent reasoning, efficient
- **deepseek-r1:14b**: Great for technical commits
- **qwen2.5:72b**: Multilingual support

## 📊 Provider Comparison Table (2025)

| Provider | Most Powerful Model | Most Economical | Context Window | Key Features |
|----------|-------------------|----------------|---------------|--------------|
| **OpenAI** | GPT-5-main | GPT-5-thinking-nano | 128K | Multimodal, reasoning, coding |
| **Anthropic** | Claude Opus 4.1 | Claude Haiku 4.5 | 200K-1M | Safety, computer use, vision |
| **Google** | Gemini 2.5 Pro | Gemma 3:1B | 128K | Speed, multimodal, TTS |
| **Ollama** | Llama 3.3 70B | Phi-3 Mini | Varies | Privacy, free, local |

### 💰 Pricing Examples (per 1M tokens)

**OpenAI:**
- GPT-5-main: $1.25 input / $10 output
- GPT-4.1: $0.75 input / $3.00 output
- GPT-4o-mini: $0.15 input / $0.60 output

**Anthropic:**
- Claude Opus 4.1: $15.00 input / $75.00 output
- Claude Sonnet 4.5: $3.00 input / $15.00 output
- Claude Haiku 4.5: $1.00 input / $5.00 output

**Google Gemini:**
- Gemini 2.5 Pro: $1.25 input / $10.00 output
- Gemini 2.5 Flash: $0.60 input / $3.50 output
- Gemma 3: $0.25 input / $1.00 output

**Ollama:** **Completely FREE** (runs locally on your hardware)

### 🎯 Best Use Cases

**For Complex Projects:**
- **OpenAI GPT-5-main**: Maximum capability for complex reasoning
- **Anthropic Claude Opus 4.1**: Safety-critical and detailed analysis
- **Google Gemini 2.5 Pro**: Multimodal and speed-critical tasks

**For Daily Development:**
- **OpenAI GPT-4o-mini**: Balanced performance and cost
- **Anthropic Claude Haiku 4.5**: Fast, reliable, affordable
- **Google Gemini 2.5 Flash**: Quick responses with good quality

**For Privacy/Local Use:**
- **Llama 3.3 70B**: State-of-the-art local performance
- **DeepSeek-R1 14B**: Advanced reasoning capabilities
- **Phi-4 14B**: Excellent reasoning, efficient resource usage

## Advanced Configuration

### Custom Instructions
You can provide custom instructions to guide the AI:

```json
{
  "customInstructions": "Focus on performance improvements and security fixes. Always mention any breaking changes."
}
```

### Environment Variables
```bash
# API Configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_API_KEY=sk-...

# Model Preferences
GCTM_AI_MODEL=gpt-4
GCTM_AI_LANGUAGE=tr
GCTM_AI_STYLE=conventional
GCTM_AI_TEMPERATURE=0.7
```

## Troubleshooting

### Common Issues

#### API Key Not Found
```
Error: AI API key not configured
```
**Solution**: Set `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `AI_API_KEY` environment variable

#### Connection Timeout
```
Error: OpenAI API error: Request timeout
```
**Solution**: Check internet connection or try a different model/provider

#### Rate Limiting
```
Error: OpenAI API error: Rate limit exceeded
```
**Solution**: Wait a few minutes or check your API usage limits

### Debug Mode
Enable debug logging to troubleshoot issues:
```bash
gctm ai-config --show
gctm ai-config --test
```

## Security Notes

- API keys are stored in plaintext configuration files
- Consider using environment variables for production environments
- The AI service will receive your git diff data - ensure you comply with your organization's policies
- Local AI providers keep data on your machine

## Integration with Git Hooks

You can integrate AI commit message generation into your Git workflow:

### Pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Only run if there are staged changes
if git diff --cached --quiet; then
  exit 0
fi

# Generate AI commit message suggestion
gctm ai-generate --interactive

# Continue with commit if message was applied
if [ $? -eq 0 ]; then
  exit 0
else
  echo "Commit cancelled"
  exit 1
fi
```

### Git Alias
```bash
# Add to ~/.gitconfig
[alias]
  ai = "!f() { gctm ai-generate --interactive \"$@\"; }; f"
  aic = "gctm ai-config"
```

Now you can use:
```bash
git ai  # Generate interactive AI commit message
git aic --show  # Show AI config
```

## Performance Tips

1. **Model Selection**: Use `gpt-3.5-turbo` or `claude-3-haiku` for faster responses
2. **Temperature**: Lower values (0.3-0.5) for more consistent, professional messages
3. **Max Tokens**: Keep at 150 for concise commit messages
4. **Cache Configuration**: Settings are saved in `.gctm-ai-config.json` for reuse

## Contributing

To add support for new AI providers or languages:

1. Update `aiCommitAssistant.js` with new provider logic
2. Add language instructions to `getLanguageInstructions()` method
3. Add style templates to `getStyleInstructions()` method
4. Update documentation with examples

## License

This AI feature is part of the Git Commit Time Machine project and follows the same MIT License.