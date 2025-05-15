// Constants
const messagesMaxCharacters = 20000;

// Prune Messages Function
export async function pruneMessages(messages) {
  let currentSize = 0;
  const newMessages = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const messageItem = messages[i];
    const message = `${messageItem?.name}: ${messageItem?.message}`;

    currentSize += message.length;
    if (currentSize < messagesMaxCharacters) newMessages.push(message);
    else break;
  }

  return newMessages.reverse();
}

import { DEFAULT_API_KEY } from '../constants/llmModels';

// Get LLM Response
export async function getLLMResponse({
  messages,
  llmContext,
  audioContext,
  model,
  options
}) {
  try {
    // Use default key if no API key provided
    const apiKey = llmContext.apiKey || DEFAULT_API_KEY;
    
    if (!apiKey) {
      throw new Error('No API key provided');
    }

    // Format messages for LLM
    const llmMessages = messages.map(msg => ({
      role: msg.name === 'User' ? 'user' : 'assistant',
      content: msg.message
    }));

    // Get response from LLM
    const response = await llmContext.queryLLM({
      messages: llmMessages, 
      model,
      options,
      apiKey
    });
    
    // Speak the response if audio is enabled
    if (audioContext && !audioContext.isMute) {
      audioContext.speak(response);
    }
    
    return response;
  } catch (error) {
    console.error('Error getting LLM response:', error);
    return "I'm having trouble responding right now.";
  }
}
