import process from 'node:process';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY || '';

export const DEFAULT_MODEL = 'nousresearch/deephermes-3-mistral-24b-preview:free';

export const MODEL_CONFIG = {
  'nousresearch/deephermes-3-mistral-24b-preview:free': {
    name: 'DeepHermes 3',
    provider: 'OpenRouter',
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 0.9,
    presence_penalty: 0,
    description: '24B parameter Mistral-based model fine-tuned on roleplay data. Supports 4K context window. Excellent for character interactions.',
    tool_use: false
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    max_tokens: 4096,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    description: 'Fast and cost-effective 175B parameter model. 4K context window. Good general-purpose performance.',
    tool_use: true
  },
  'gpt-4': {
    name: 'GPT-4',
    provider: 'OpenAI',
    max_tokens: 8192,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    description: 'Most capable 1.8T parameter model. 8K context window. Excels at complex tasks and tool use.',
    tool_use: true
  },
  'claude-2': {
    name: 'Claude 2',
    provider: 'Anthropic',
    max_tokens: 100000,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    description: '100K context window. Strong reasoning and safety features. Good for long conversations.',
    tool_use: false
  },
  'claude-instant': {
    name: 'Claude Instant',
    provider: 'Anthropic',
    max_tokens: 100000,
    temperature: 0.7,
    top_p: 1,
    presence_penalty: 0,
    description: 'Faster version of Claude with same 100K context. Good balance of speed and capability.',
    tool_use: false
  }
};

export const DEFAULT_MODEL_OPTIONS = {
  temperature: 0.7,
  max_tokens: 500,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};
