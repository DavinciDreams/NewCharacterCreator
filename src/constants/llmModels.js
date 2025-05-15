export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_MODEL = 'gpt-3.5-turbo';

export const AVAILABLE_MODELS = {
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    maxTokens: 4096,
    costPerMillionInput: 0.50,
    costPerMillionOutput: 1.50
  },
  'gpt-4': {
    name: 'GPT-4',
    provider: 'OpenAI',
    maxTokens: 8192,
    costPerMillionInput: 10.00,
    costPerMillionOutput: 30.00
  },
  'claude-2': {
    name: 'Claude 2',
    provider: 'Anthropic',
    maxTokens: 100000,
    costPerMillionInput: 8.00,
    costPerMillionOutput: 24.00
  }
};

export const DEFAULT_MODEL_OPTIONS = {
  temperature: 0.7,
  max_tokens: 500,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};
