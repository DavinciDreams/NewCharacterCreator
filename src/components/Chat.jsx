import React, { useEffect, useContext } from 'react';
import axios from "axios";
import { voices } from "../constants/voices";
import { favouriteColors } from "../constants/favouriteColors";
import { LanguageContext } from "../context/LanguageContext";
import { SceneContext } from "../context/SceneContext";
import { AudioContext } from "../context/AudioContext";
import CustomButton from "./custom-button";
import { Message } from "./message";
import styles from "./Chat.module.css";
import useSpeechRecognition from "../hooks/useSpeechRecognition";

const sessionId =
  localStorage.getItem("sessionId") ??
  Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
localStorage.setItem("sessionId", sessionId)


const defaultSpeaker = "Speaker"

// Helper: Prune messages to keep context manageable
const pruneMessages = (messages) => {
  // Keep last 10 messages for context
  const recentMessages = messages.slice(-10)
  return recentMessages.map(m => `${m.name}: ${m.message}`)
}

// Speech Recognition setup

export default function ChatBox({
  templateInfo,
  micEnabled,
  setMicEnabled,
}) {

  // Chat management state (must be inside the component)
  const [savedChats, setSavedChats] = React.useState([])
  const [currentChatId, setCurrentChatId] = React.useState(null)

  // AI service selection state
  const [aiService, setAiService] = React.useState(
    localStorage.getItem('aiService') || 'litellm'
  )
  // LiteLLM config
  const [litellmUrl, setLitellmUrl] = React.useState(
    localStorage.getItem('litellmUrl') || 'http://localhost:4000/v1/chat/completions'
  )
  const [litellmModel, setLitellmModel] = React.useState(
    localStorage.getItem('litellmModel') || 'gpt-3.5-turbo'
  )
  const [litellmKey, setLitellmKey] = React.useState(
    localStorage.getItem('litellmKey') || ''
  )
  const [ollamaUrl, setOllamaUrl] = React.useState(
    localStorage.getItem('ollamaUrl') || 'http://localhost:11434/api/generate'
  )
  const [ollamaModel, setOllamaModel] = React.useState(
    localStorage.getItem('ollamaModel') || 'llama3'
  )
  const [openRouterKey, setOpenRouterKey] = React.useState(
    localStorage.getItem('openRouterKey') || ''
  )
  const [openRouterModel, setOpenRouterModel] = React.useState(
    localStorage.getItem('openRouterModel') || 'mistralai/mixtral-8x7b-instruct'
  )
  const [lmStudioUrl, setLmStudioUrl] = React.useState(
    localStorage.getItem('lmStudioUrl') || 'http://localhost:1234/v1/chat/completions'
  )
  const [lmStudioModel, setLmStudioModel] = React.useState(
    localStorage.getItem('lmStudioModel') || 'lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF'
  )

  // Persist AI service config
  useEffect(() => { localStorage.setItem('aiService', aiService) }, [aiService])
  useEffect(() => { localStorage.setItem('litellmUrl', litellmUrl) }, [litellmUrl])
  useEffect(() => { localStorage.setItem('litellmModel', litellmModel) }, [litellmModel])
  useEffect(() => { localStorage.setItem('litellmKey', litellmKey) }, [litellmKey])
  useEffect(() => { localStorage.setItem('ollamaUrl', ollamaUrl) }, [ollamaUrl])
  useEffect(() => { localStorage.setItem('ollamaModel', ollamaModel) }, [ollamaModel])
  useEffect(() => { localStorage.setItem('openRouterKey', openRouterKey) }, [openRouterKey])
  useEffect(() => { localStorage.setItem('openRouterModel', openRouterModel) }, [openRouterModel])
  useEffect(() => { localStorage.setItem('lmStudioUrl', lmStudioUrl) }, [lmStudioUrl])
  useEffect(() => { localStorage.setItem('lmStudioModel', lmStudioModel) }, [lmStudioModel])

  // Helper: Save current chat to localStorage
  const saveCurrentChat = () => {
    const chatId = currentChatId || `chat_${Date.now()}`
    const chatData = { id: chatId, messages, timestamp: Date.now() }
    localStorage.setItem(chatId, JSON.stringify(chatData))
    setSavedChats([...savedChats.filter(c => c.id !== chatId), chatData])
    setCurrentChatId(chatId)
  }

  // Helper: Start a new chat
  const startNewChat = () => {
    setMessages([])
    setCurrentChatId(null)
    setInput("")
  }

  // Helper: Download chat as JSON
  const downloadChat = () => {
    const chatData = { messages, timestamp: Date.now() }
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
    saveAs(blob, `chat_${Date.now()}.json`)
  }

  // Helper: Share chat (Web Share API)
  const shareChat = async () => {
    const chatText = messages.map(m => `${m.name}: ${m.message}`).join('\n')
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Chat', text: chatText })
      } catch (e) {
        alert('Share failed: ' + e.message)
      }
    } else {
      alert('Web Share API not supported on this browser.')
    }
  }

  // Load saved chats from localStorage on mount
  useEffect(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('chat_'))
    const chats = keys.map(k => {
      try {
        return JSON.parse(localStorage.getItem(k))
      } catch (e) {
        console.warn('Failed to parse chat:', k, e)
        return null
      }
    }).filter(Boolean)
    setSavedChats(chats)
  }, [])
  const [waitingForResponse, setWaitingForResponse] = React.useState(false)

  // Translate hook
  const { t } = useContext(LanguageContext)

  // Default character template for fallback
  const defaultTemplate = {
    name: 'Assistant',
    description: 'I am a helpful AI assistant.',
    voiceKey: '',
    colorKey: Object.keys(favouriteColors)[0],
    greeting: 'Hello! How can I help you today?',
    personality: {
      question: 'What kind of assistant are you?',
      answer: 'I am a friendly and helpful AI assistant, ready to engage in conversation and assist with various tasks.'
    },
    relationship: {
      question: 'How do you interact with users?',
      answer: 'I aim to be helpful, clear, and engaging while maintaining a professional and friendly demeanor.'
    },
    hobbies: {
      question: 'What topics do you enjoy discussing?',
      answer: 'I enjoy discussing a wide range of topics and helping users with their questions and tasks.'
    }
  };

  // Defensive: handle missing templateInfo or fullBio
  let fullBio = null
  let name = ''
  let bio = ''
  let voice = ''
  let fontColor = favouriteColors[Object.keys(favouriteColors)[0]].fontColor
  // Define colors for user and agent messages
  const userColor = favouriteColors.blue.color // Use blue for user messages
  const agentColor = favouriteColors.green.color // Use green for agent messages
  let greeting = ''
  let question1 = ''
  let question2 = ''
  let question3 = ''
  let response1 = ''
  let response2 = ''
  let response3 = ''
  let fullBioError = null

  if (!templateInfo || !templateInfo.id) {
    // Use default template
    fullBio = defaultTemplate;
    name = fullBio.name;
    bio = fullBio.description;
    voice = fullBio.voiceKey;
    fontColor = favouriteColors[fullBio.colorKey]?.fontColor || favouriteColors[Object.keys(favouriteColors)[0]].fontColor;
    greeting = fullBio.greeting;
    question1 = fullBio.personality?.question || '';
    question2 = fullBio.relationship?.question || '';
    question3 = fullBio.hobbies?.question || '';
    response1 = fullBio.personality?.answer || '';
    response2 = fullBio.relationship?.answer || '';
    response3 = fullBio.hobbies?.answer || '';
  } else {
    const fullBioStr = localStorage.getItem(`${templateInfo.id}_fullBio`)
    if (!fullBioStr) {
      // Use default template if no data found
      fullBio = defaultTemplate;
      name = fullBio.name;
      bio = fullBio.description;
      voice = fullBio.voiceKey;
      fontColor = favouriteColors[fullBio.colorKey]?.fontColor || favouriteColors[Object.keys(favouriteColors)[0]].fontColor;
      greeting = fullBio.greeting;
      question1 = fullBio.personality?.question || '';
      question2 = fullBio.relationship?.question || '';
      question3 = fullBio.hobbies?.question || '';
      response1 = fullBio.personality?.answer || '';
      response2 = fullBio.relationship?.answer || '';
      response3 = fullBio.hobbies?.answer || '';
    } else {
      try {
        fullBio = JSON.parse(fullBioStr)
        name = fullBio.name || ''
        bio = fullBio.description || ''
        voice = fullBio.voiceKey || ''
        fontColor = favouriteColors[fullBio.colorKey]?.fontColor || favouriteColors[Object.keys(favouriteColors)[0]].fontColor
        greeting = fullBio.greeting || ''
        question1 = fullBio.personality?.question || ''
        question2 = fullBio.relationship?.question || ''
        question3 = fullBio.hobbies?.question || ''
        response1 = fullBio.personality?.answer || ''
        response2 = fullBio.relationship?.answer || ''
        response3 = fullBio.hobbies?.answer || ''
      } catch (e) {
        fullBioError = 'Character data is corrupted or invalid.'
      }
    }
  }

  const [speaker, setSpeaker] = React.useState(
    localStorage.getItem("speaker") || defaultSpeaker,
  )
  // Get audio context
  const { speakText, availableVoices, selectedVoiceURI, setSelectedVoiceURI } = useContext(AudioContext)

  // on speaker changer, set local storage
  useEffect(() => {
    localStorage.setItem("speaker", speaker)
  }, [speaker])

  function composePrompt() {
    const prompt = `Name: ${name}
Bio: ${bio}
${speaker}: Hey ${name}
${name}: ${greeting}
${speaker}: ${question1}
${name}: ${response1}
${speaker}: ${question2}
${name}: ${response2}
${speaker}: ${question3}
${name}: ${response3}`

    return prompt
  }

  const { lipSync } = React.useContext(SceneContext)
  const [input, setInput] = React.useState("")
  const [messages, setMessages] = React.useState([])
  const [speechError, setSpeechError] = React.useState(null);
  const hasRequestedMediaPermission = React.useRef(false);
  // Track if TTS is currently speaking
  const isSpeaking = React.useRef(false);

  // --- Core chat logic and handlers (must be defined before useEffect hooks and before useSpeechRecognition) ---
  /**
   * handleUserChatInput - Processes only user input, never agent output
   * Only called from user typing or speech recognition final transcript
   */
  const handleUserChatInput = React.useCallback(async (value) => {
    // Only process non-empty user input
    if (!value || value.trim() === "" || waitingForResponse) {
      return;
    }

    setWaitingForResponse(true);
    const agent = name;
    setInput(""); // Clear input field

    // Add user message with unique ID
    const userMessageId = Math.random().toString(36).slice(2);
    const userMessageOutputObject = {
      id: userMessageId,
      name: speaker,
      message: value,
      timestamp: Date.now(),
      type: 1, // type 1 is for user messages
    };
    setMessages((messages) => [...messages, userMessageOutputObject]);
    const promptMessages = await pruneMessages(messages);
    promptMessages.push(`${speaker}: ${value}`);

    // Compose prompt
    let prompt = `The following is part of a conversation between ${speaker} and ${agent}. ${agent} is descriptive and helpful, and is honest when it doesn't know an answer. Included is a context which acts a short-term memory, used to guide the conversation and track topics.\n\nCONTEXT:\n\nInfo about ${agent}\n---\n\nBio: "${bio}"\n\nQuestion 1: "${question1}"\nResponse 1: "${response1}"\n\nQuestion 2: "${question2}"\nResponse 2: "${response2}"\n\nQuestion 3: "${question3}"\nResponse 3: "${response3}"\n\nMOST RECENT MESSAGES:\n\n${promptMessages.join("\n")}\n${agent}:`;

    // AI Service Routing
    try {
      // Generate a new message ID for this response
      const thisAgentMessageId = Math.random().toString(36).slice(2);
      if (aiService === 'litellm' || aiService === 'openrouter' || aiService === 'lmstudio') {
        // Streaming for OpenAI-compatible APIs (LiteLLM, OpenRouter, LM Studio)
        let url, headers, body;
        if (aiService === 'litellm') {
          url = litellmUrl;
          headers = { 'Content-Type': 'application/json' };
          if (litellmKey) headers['Authorization'] = `Bearer ${litellmKey}`;
          body = {
            model: litellmModel,
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              ...promptMessages.map(m => {
                const [name, ...rest] = m.split(':');
                return {
                  role: name.trim() === speaker ? 'user' : 'assistant',
                  content: rest.join(':').trim()
                };
              }),
            ],
            max_tokens: 400,
            temperature: 0.9,
            stream: true,
          };
        } else if (aiService === 'openrouter') {
          url = 'https://openrouter.ai/api/v1/chat/completions';
          headers = {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          };
          body = {
            model: openRouterModel,
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              ...promptMessages.map(m => {
                const [name, ...rest] = m.split(':');
                return {
                  role: name.trim() === speaker ? 'user' : 'assistant',
                  content: rest.join(':').trim()
                };
              }),
            ],
            max_tokens: 400,
            temperature: 0.9,
            stream: true,
          };
        } else if (aiService === 'lmstudio') {
          url = lmStudioUrl;
          headers = { 'Content-Type': 'application/json' };
          body = {
            model: lmStudioModel,
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              ...promptMessages.map(m => {
                const [name, ...rest] = m.split(':');
                return {
                  role: name.trim() === speaker ? 'user' : 'assistant',
                  content: rest.join(':').trim()
                };
              }),
            ],
            max_tokens: 400,
            temperature: 0.9,
            stream: true,
          };
        }

        // Speech streaming setup
        let fullText = '';
        let ttsBuffer = '';

        try {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });

          if (!response.body || !window.ReadableStream) {
            // Fallback for non-streaming support
            const data = await response.json();
            const output = data.choices[0].message.content;
            addOrUpdateAgentMessage(output, true, thisAgentMessageId);
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');

          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(l => l.trim().startsWith('data: '));

            for (const line of lines) {
              const dataStr = line.replace('data: ', '').trim();
              if (dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                const delta = data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || '';

                if (delta) {
                  fullText += delta;
                  addOrUpdateAgentMessage(fullText, false, thisAgentMessageId);
                }
              } catch (e) {
                console.warn('Error parsing streaming response:', e);
              }
            }
          }

          addOrUpdateAgentMessage(fullText, true, thisAgentMessageId);
        } catch (err) {
          console.error('Streaming error:', err);
          addOrUpdateAgentMessage('[AI streaming error: ' + (err?.message || 'Unknown error') + ']', true, thisAgentMessageId);
        }
      } else if (aiService === 'ollama') {
        // Ollama (local)
        const response = await axios.post(ollamaUrl, {
          model: ollamaModel,
          prompt,
          stream: false
        });
        const output = response.data.response || (response.data.choices && response.data.choices[0].text) || response.data.text || '[No response]';
        addOrUpdateAgentMessage(output, true);
      } else {
        addOrUpdateAgentMessage('[No AI service selected]', true);
      }
    } catch (error) {
      setWaitingForResponse(false);
      addOrUpdateAgentMessage('[AI Error: ' + (error?.message || 'Unknown error') + ']', true);
      console.error(error);
    } finally {
      setWaitingForResponse(false);
    }
  }, [messages, waitingForResponse, name, speaker, bio, question1, response1, question2, response2, question3, response3, aiService, litellmUrl, litellmModel, litellmKey, openRouterKey, openRouterModel, lmStudioUrl, lmStudioModel, ollamaUrl, ollamaModel, setWaitingForResponse, setInput, setMessages, t]);

  const handleChange = async (event) => {
    event.preventDefault();
    setInput(event.target.value);
  };

  // --- Use the custom useSpeechRecognition hook for STT ---
  const { start, stop, isRecognizing } = useSpeechRecognition({
    onResult: ({ interimTranscript, finalTranscript }) => {
      // Only update input state from user speech recognition
      if (interimTranscript) {
        setInput(interimTranscript); // Only update from interim transcript
      }
      if (finalTranscript) {
        setInput(''); // Clear input after final transcript
        stopSpeech();
        handleUserChatInput(finalTranscript.trim()); // Process final transcript as user input
      }
    },
    onError: (e) => setSpeechError(e.error),
    onStart: () => {
      setInput('Listening...');
      setMicEnabled(true);
    },
    onEnd: () => {
      setInput(''); // Clear input when speech recognition ends
      setMicEnabled(false);
    },
    lang: 'en-US',
    interim: true,
    continuous: false, // Changed to false to prevent continuous listening
    enabled: !waitingForResponse && !isSpeaking.current, // Disable speech recognition while waiting for AI response or when TTS is active
  });
  
  // Use only the hook's start/stop for speech
  const startSpeech = async () => {
    // Don't start speech recognition if waiting for AI response or if TTS is active
    if (waitingForResponse || isSpeaking.current) {
      setSpeechError("Cannot start speech recognition while AI is responding or speaking");
      return;
    }
    
    setSpeechError(null);
    try {
      // Only request media permission if we haven't already
      if (!hasRequestedMediaPermission.current) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          hasRequestedMediaPermission.current = true;
        } catch (err) {
          console.error('Media permission error:', err);
          const errorMessage = err.name === 'NotAllowedError'
            ? 'Microphone access was denied. Please allow microphone access in your browser settings.'
            : err.message || 'Failed to get microphone permission';
          setSpeechError(errorMessage);
          setMicEnabled(false);
          return;
        }
      }

      // Start recognition
      await start();
      setMicEnabled(true);
    } catch (err) {
      console.error('Speech start error:', err);
      const errorMessage = err.message || 'Failed to start speech recognition';
      setSpeechError(errorMessage);
      setMicEnabled(false);
    }
  };

  const stopSpeech = () => {
    try {
      stop();
      setMicEnabled(false);
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  };
  useEffect(() => {
    // Focus back on input when the response is given
    if (!waitingForResponse) {
      const inputElement = document.getElementById("messageInput")
      if (inputElement) {
        inputElement.focus()
      }
    }
  }, [waitingForResponse])

  const handleSubmit = async (event) => {
    if (event.preventDefault) event.preventDefault()
    // Stop speech to text when a message is sent through the input
    stopSpeech()
    if (!waitingForResponse) {
      // Get the value of the input element
      const input = event.target.elements.message
      const value = input.value
      handleUserChatInput(value)
    }
  }

  /**
   * addOrUpdateAgentMessage - Adds or updates an agent message
   * Only calls speakText for agent messages, never for user input
   */
  function addOrUpdateAgentMessage(content, isFinal, messageId) {
    setMessages(prevMessages => {
      // If the message already exists, update it; otherwise, add it
      const idx = prevMessages.findIndex(m => m.id === messageId);
      if (idx !== -1) {
        // Update existing
        const updated = [...prevMessages];
        updated[idx] = {
          ...updated[idx],
          message: content,
          type: 0, // AI message
          timestamp: Date.now(),
        };
        return updated;
      } else {
        // Add new
        return [
          ...prevMessages,
          {
            id: messageId,
            name,
            message: content,
            type: 0, // AI message
            timestamp: Date.now(),
          },
        ];
      }
    });

    // Only call speakText for agent messages (type 0) when final
    // Never call for user input (type 1) or interim updates
    if (isFinal && content && speakText) {
      // Ensure microphone is disabled before AI speaks to prevent feedback loop
      if (micEnabled) {
        stopSpeech();
      }
      
      // Mark that TTS is active to prevent STT from starting
      isSpeaking.current = true;
      
      // Speak the text after a short delay to ensure mic is fully stopped
      setTimeout(() => {
        // Create a wrapper around speakText to track when speaking is done
        const speakWithTracking = async () => {
          try {
            await speakText(content);
          } finally {
            // Mark that TTS is no longer active
            isSpeaking.current = false;
          }
        };
        
        speakWithTracking();
      }, 300);
    }
  }

  return (
    <div className={styles["chatBox"]}>
      {/* AI Service selection UI - moved to top for visibility */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#f5f5f5',
        borderRadius: 8,
        padding: '8px 12px',
        border: '1px solid #ddd',
        marginTop: 4
      }}>
        <strong style={{marginRight: 8}}>AI Service:</strong>
        <select id="aiService" value={aiService} onChange={e => setAiService(e.target.value)}>
          <option value="litellm">LiteLLM (OpenAI-compatible)</option>
          <option value="ollama">Ollama (local)</option>
          <option value="openrouter">OpenRouter (cloud)</option>
          <option value="lmstudio">LM Studio (local)</option>
        </select>
        {/* Service-specific config fields */}
        {aiService === 'litellm' && (
          <>
            <input
              type="text"
              placeholder="LiteLLM URL"
              value={litellmUrl}
              onChange={e => setLitellmUrl(e.target.value)}
              style={{ width: 220 }}
            />
            <input
              type="text"
              placeholder="LiteLLM Model"
              value={litellmModel}
              onChange={e => setLitellmModel(e.target.value)}
              style={{ width: 160 }}
            />
            <input
              type="text"
              placeholder="LiteLLM API Key (optional)"
              value={litellmKey}
              onChange={e => setLitellmKey(e.target.value)}
              style={{ width: 220 }}
            />
          </>
        )}
        {aiService === 'ollama' && (
          <>
            <input
              type="text"
              placeholder="Ollama URL"
              value={ollamaUrl}
              onChange={e => setOllamaUrl(e.target.value)}
              style={{ width: 220 }}
            />
            <input
              type="text"
              placeholder="Ollama Model"
              value={ollamaModel}
              onChange={e => setOllamaModel(e.target.value)}
              style={{ width: 160 }}
            />
          </>
        )}
        {aiService === 'openrouter' && (
          <>
            <input
              type="text"
              placeholder="OpenRouter API Key"
              value={openRouterKey}
              onChange={e => setOpenRouterKey(e.target.value)}
              style={{ width: 220 }}
            />
            <input
              type="text"
              placeholder="OpenRouter Model"
              value={openRouterModel}
              onChange={e => setOpenRouterModel(e.target.value)}
              style={{ width: 220 }}
            />
          </>
        )}
        {aiService === 'lmstudio' && (
          <>
            <input
              type="text"
              placeholder="LM Studio URL"
              value={lmStudioUrl}
              onChange={e => setLmStudioUrl(e.target.value)}
              style={{ width: 220 }}
            />
            <input
              type="text"
              placeholder="LM Studio Model"
              value={lmStudioModel}
              onChange={e => setLmStudioModel(e.target.value)}
              style={{ width: 220 }}
            />
          </>
        )}
      </div>

      {/* Chat management controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={startNewChat} title="Start new chat">New Chat</button>
        <button onClick={saveCurrentChat} title="Save chat">Save</button>
        <button onClick={downloadChat} title="Download chat">Download</button>
        <button onClick={shareChat} title="Share chat">Share</button>
        {savedChats.length > 0 && (
          <select
            value={currentChatId || ''}
            onChange={e => {
              const chat = savedChats.find(c => c.id === e.target.value)
              if (chat) {
                setMessages(chat.messages)
                setCurrentChatId(chat.id)
              }
            }}
            style={{ marginLeft: 8 }}
          >
            <option value="">Load saved chat...</option>
            {savedChats.map(c => (
              <option key={c.id} value={c.id}>
                {c.id} ({new Date(c.timestamp).toLocaleString()})
              </option>
            ))}
          </select>
        )}
      </div>
      <div className={styles["speaker"]}>
        <label htmlFor="speaker">{t("labels.yourName")}</label>
        <input
          type="text"
          name="speaker"
          defaultValue={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
        />
      </div>      {/* Voice selection dropdown */}
      <div className={styles["speaker"]}>
        <label htmlFor="voiceSelect">TTS Voice</label>
        <select
          id="voiceSelect"
          value={selectedVoiceURI || ''}
          onChange={e => setSelectedVoiceURI(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        >
          {availableVoices?.map(v => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang}){v.default ? ' [default]' : ''}
            </option>
          ))}
        </select>
      </div>

      <label>{t("labels.conversation")}</label>
      <div className={styles["messages"]}>
        <div className={styles["scrollBox"]} id={"msgscroll"}>
          {messages.map((msg, index) => (
            <Message
              key={index}
              name={msg.name}
              timestamp={msg.timestamp}
              message={msg.message}
              type={msg.type}
              color={msg.type === 1 ? userColor : agentColor} // Differentiate visually
            />
          ))}
        </div>
      </div>

      <form
        className={styles["send"]}
        style={{ opacity: waitingForResponse ? "0.4" : "1" }}
        onSubmit={handleSubmit}
      >
        <CustomButton
          type="icon"
          theme="light"
          icon="microphone"
          className={`${styles.mic} ${micEnabled ? styles.active : ''}`}
          size={32}
          active={!!micEnabled}
          disabled={waitingForResponse || isSpeaking.current} // Disable mic button while agent is responding or speaking
          onClick={e => {
            e.preventDefault();
            setSpeechError(null);
            if (!micEnabled) {
              startSpeech();
            } else {
              stopSpeech();
            }
          }}
        />
        <input
          autoComplete="off"
          type="text"
          name="message"
          id="messageInput"
          value={input}
          onInput={handleChange}
          onChange={handleChange}
          disabled={waitingForResponse}
        />
        <CustomButton
          theme="light"
          text={t("callToAction.send")}
          size={14}
          onSubmit={handleSubmit}
          className={styles.sendButton}
          type="submit"
        />
      </form>
      {speechError && (
        <div style={{ color: 'red', marginTop: 4, fontSize: 13 }}>
          <b>Speech Error:</b> {speechError}
        </div>
      )}
      <p className={`${styles["isTyping"]} ${waitingForResponse && styles["show"]}`}>
        <span style={{ color: fontColor }}>{name}</span> is typing...
      </p>
    </div>
  );
}
