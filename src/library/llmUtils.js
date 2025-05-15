/**
 * Formats a prompt with variables for LLM completion
 * @param {string} prompt - The base prompt
 * @param {object} variables - Variables to include in the prompt
 * @returns {string} Formatted prompt
 */
export function formatPrompt(prompt, variables = {}) {
  return `${prompt} ${JSON.stringify(variables)}`;
}

/**
 * Generates a completion from the LLM API
 * @param {string} prompt - The prompt to complete
 * @param {object} variables - Variables to include with the prompt
 * @returns {Promise<object>} Completion result or error
 */
export async function generateCompletion(prompt, variables = {}) {
  try {
    const response = await fetch('/api/completion', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        prompt: formatPrompt(prompt, variables)
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate completion');
    }

    return await response.json();
  } catch (error) {
    return {
      error: error.message,
      retryable: !error.message?.includes('API key')
    };
  }
}
