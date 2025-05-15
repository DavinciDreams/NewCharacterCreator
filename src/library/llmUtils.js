import { getAsArray } from './utils';
import { DEFAULT_MODEL, AVAILABLE_MODELS } from '../constants/llmModels';

export const formatLLMResponse = (response, characterTraits = {}) => {
  // Format response based on character traits
  if (characterTraits.personality) {
    return `${characterTraits.name || 'Character'}: ${response}`;
  }
  return response;
};

export const getCharacterContext = (characterData) => {
  if (!characterData) return '';
  
  const traits = characterData.traits || {};
  return `You are ${traits.name || 'a character'} with these traits:\n` +
    Object.entries(traits)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
};

export const shouldInterruptSpeech = (audioContext) => {
  return audioContext?.isSpeaking && !audioContext?.isMute;
};

export const getVoiceOptions = (characterData) => {
  const traits = characterData?.traits || {};
  return {
    rate: traits.speechRate || 1.0,
    pitch: traits.voicePitch || 1.0,
    voice: traits.voiceType || 'default'
  };
};

export const handleLLMError = (error) => {
  console.error('LLM Error:', error);
  return {
    error: true,
    message: error.message || 'Failed to get response',
    retryable: !error.message?.includes('API key')
  };
};
