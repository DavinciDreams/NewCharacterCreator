import React, { createContext, useState, useCallback } from 'react';
import {
  OPENROUTER_API_URL,
  DEFAULT_MODEL,
  AVAILABLE_MODELS,
  DEFAULT_MODEL_OPTIONS
} from '../constants/llmModels';

export const LLMContext = createContext();

export const LLMProvider = ({ children }) => {
    const [apiKey, setApiKey] = useState('');
    const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const queryLLM = useCallback(async (messages, model = currentModel, options = {}) => {
        if (!apiKey) {
            setError('API key not configured');
            return null;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'NewCharacterCreator'
                },
                body: JSON.stringify({
                    model,
                    messages,
                    ...DEFAULT_MODEL_OPTIONS,
                    ...options
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (err) {
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, currentModel]);

    return (
        <LLMContext.Provider value={{
            apiKey,
            setApiKey,
            currentModel,
            setCurrentModel,
            availableModels: AVAILABLE_MODELS,
            queryLLM,
            isLoading,
            error
        }}>
            {children}
        </LLMContext.Provider>
    );
};
