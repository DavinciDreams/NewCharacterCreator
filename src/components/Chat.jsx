import React, { useRef, useEffect, useContext } from 'react'
import EasySpeech from 'easy-speech'
import axios from "axios"
import { voices } from "../constants/voices"
import { favouriteColors } from "../constants/favouriteColors"
import { LanguageContext } from "../context/LanguageContext"
import { SceneContext } from "../context/SceneContext"
import CustomButton from "./custom-button"
import { Message } from "./message"
import styles from "./Chat.module.css"

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
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent;

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


  // Defensive: handle missing templateInfo or fullBio
  let fullBio = null
  let name = ''
  let bio = ''
  let voice = ''
  let fontColor = favouriteColors[Object.keys(favouriteColors)[0]].fontColor
  let greeting = ''
  let question1 = ''
  let question2 = ''
  let question3 = ''
  let response1 = ''
  let response2 = ''
  let response3 = ''
  let fullBioError = null
  if (!templateInfo || !templateInfo.id) {
    fullBioError = 'No character template loaded.'
  } else {
    const fullBioStr = localStorage.getItem(`${templateInfo.id}_fulBio`)
    if (!fullBioStr) {
      fullBioError = `No character data found for template: ${templateInfo.id}`
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

  // EasySpeech voice selection
  const [availableVoices, setAvailableVoices] = React.useState([])
  const [selectedVoiceURI, setSelectedVoiceURI] = React.useState(() => localStorage.getItem('selectedVoiceURI') || null)

  // Persist selected voice
  useEffect(() => {
    if (selectedVoiceURI) localStorage.setItem('selectedVoiceURI', selectedVoiceURI)
  }, [selectedVoiceURI])

  useEffect(() => {
    // Load voices on mount
    EasySpeech.init({ maxTimeout: 5000, interval: 250 }).then(() => {
      const voices = EasySpeech.voices()
      setAvailableVoices(voices)
      // Set default selected voice
      if (voices.length > 0 && !selectedVoiceURI) {
        setSelectedVoiceURI(voices.find(v => v.lang.startsWith('en'))?.voiceURI || voices[0].voiceURI)
      }
    })
  }, [])

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

  // --- Core chat logic and handlers (must be defined before useEffect hooks) ---
  // Helper: TTS output (can be called with partials)
  // Always use the latest selectedVoiceURI from state
  const speakOutput = async (output) => {
    if (!output?.trim()) return;
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        await EasySpeech.init({ maxTimeout: 5000, interval: 250 })
        const voices = EasySpeech.voices()
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI) || voices[0]
        
        // Cancel any ongoing speech before starting new one
        EasySpeech.cancel();
        
        await EasySpeech.speak({
          text: output,
          voice: selectedVoice,
          pitch: 1,
          rate: 1,
          volume: 1,
          // Add event handlers for better state management
          boundary: (e) => console.debug('Word boundary reached:', e.charIndex),
          error: (e) => {
            if (e.error !== 'interrupted') {
              console.warn('EasySpeech error:', e);
            }
          }
        })
        break; // Success, exit retry loop
      } catch (e) {
        attempt++;
        console.warn(`EasySpeech attempt ${attempt} failed:`, e);
        
        if (e.toString().includes('interrupted')) {
          // For interruption errors, wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        } else if (attempt === maxRetries) {
          console.error('EasySpeech failed after all retries:', e);
        }
      }
    }
  }

  // Helper: Add or update agent message (for streaming)
  // Generate a new message ID for each agent response, and use it for all streaming updates
  const agentMessageId = Math.random().toString(36).slice(2)
  const addOrUpdateAgentMessage = (output, done = false, id = agentMessageId) => {
    setMessages((messages) => {
      // If message with id exists, update it
      const idx = messages.findIndex(m => m.id === id)
      if (idx !== -1) {
        const updated = [...messages]
        updated[idx] = { ...updated[idx], message: output }
        return updated
      } else {
        // Otherwise, add new
        return [
          ...messages,
          {
            id: id,
            name: name,
            message: output,
            timestamp: Date.now(),
            type: 0,
          },
        ]
      }
    })
    if (done) setWaitingForResponse(false)
  }

  const handleUserChatInput = async (value) => {
    if (value && value !== "" && !waitingForResponse) {
      setWaitingForResponse(true)
      const agent = name
      setInput("")
      const userMessageOutputObject = {
        name: speaker,
        message: value,
        timestamp: Date.now(),
        type: 1,
      }
      setMessages((messages) => [...messages, userMessageOutputObject])
      const promptMessages = await pruneMessages(messages)
      promptMessages.push(`${speaker}: ${value}`)

      // Compose prompt
      let prompt = `The following is part of a conversation between ${speaker} and ${agent}. ${agent} is descriptive and helpful, and is honest when it doesn't know an answer. Included is a context which acts a short-term memory, used to guide the conversation and track topics.\n\nCONTEXT:\n\nInfo about ${agent}\n---\n\nBio: "${bio}"\n\nQuestion 1: "${question1}"\nResponse 1: "${response1}"\n\nQuestion 2: "${question2}"\nResponse 2: "${response2}"\n\nQuestion 3: "${question3}"\nResponse 3: "${response3}"\n\nMOST RECENT MESSAGES:\n\n${promptMessages.join("\n")}\n${agent}:`

      // AI Service Routing
      try {
        // Generate a new message ID for this response
        const thisAgentMessageId = Math.random().toString(36).slice(2)
        if (aiService === 'litellm' || aiService === 'openrouter' || aiService === 'lmstudio') {
          // Streaming for OpenAI-compatible APIs (LiteLLM, OpenRouter, LM Studio)
          let url, headers, body
          if (aiService === 'litellm') {
            url = litellmUrl
            headers = { 'Content-Type': 'application/json' }
            if (litellmKey) headers['Authorization'] = `Bearer ${litellmKey}`
            body = {
              model: litellmModel,
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                ...promptMessages.map(m => {
                  const [name, ...rest] = m.split(':')
                  return {
                    role: name.trim() === speaker ? 'user' : 'assistant',
                    content: rest.join(':').trim()
                  }
                }),
              ],
              max_tokens: 400,
              temperature: 0.9,
              stream: true,
            }
          } else if (aiService === 'openrouter') {
            url = 'https://openrouter.ai/api/v1/chat/completions'
            headers = {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
            }
            body = {
              model: openRouterModel,
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                ...promptMessages.map(m => {
                  const [name, ...rest] = m.split(':')
                  return {
                    role: name.trim() === speaker ? 'user' : 'assistant',
                    content: rest.join(':').trim()
                  }
                }),
              ],
              max_tokens: 400,
              temperature: 0.9,
              stream: true,
            }
          } else if (aiService === 'lmstudio') {
            url = lmStudioUrl
            headers = { 'Content-Type': 'application/json' }
            body = {
              model: lmStudioModel,
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                ...promptMessages.map(m => {
                  const [name, ...rest] = m.split(':')
                  return {
                    role: name.trim() === speaker ? 'user' : 'assistant',
                    content: rest.join(':').trim()
                  }
                }),
              ],
              max_tokens: 400,
              temperature: 0.9,
              stream: true,
            }
          }

          // Streaming fetch
          let fullText = ''
          let ttsBuffer = ''
          let ttsTimeout = null
          const speakChunk = async (chunk) => {
            if (chunk.trim()) await speakOutput(chunk)
          }
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers,
              body: JSON.stringify(body),
            })
            if (!response.body || !window.ReadableStream) {
              // Fallback to non-streaming if not supported
              const data = await response.json()
              const output = data.choices[0].message.content
              await speakOutput(output)
              addOrUpdateAgentMessage(output, true, thisAgentMessageId)
              return
            }
            const reader = response.body.getReader()
            const decoder = new TextDecoder('utf-8')
            let done = false
            while (!done) {
              const { value, done: doneReading } = await reader.read()
              done = doneReading
              if (value) {
                const chunk = decoder.decode(value)
                // OpenAI streaming format: lines starting with 'data: '
                const lines = chunk.split('\n').filter(l => l.trim().startsWith('data: '))
                for (const line of lines) {
                  const dataStr = line.replace('data: ', '').trim()
                  if (dataStr === '[DONE]') continue
                  try {
                    const data = JSON.parse(dataStr)
                    const delta = data.choices?.[0]?.delta?.content || data.choices?.[0]?.message?.content || ''
                    if (delta) {
                      fullText += delta
                      addOrUpdateAgentMessage(fullText, false, thisAgentMessageId)
                      ttsBuffer += delta
                      // Speak in small chunks (sentence or every 40 chars)
                      if (ttsBuffer.length > 40 || /[.!?]\s$/.test(ttsBuffer)) {
                        const toSpeak = ttsBuffer
                        ttsBuffer = ''
                        // Speak chunk async, but don't await to avoid blocking
                        speakChunk(toSpeak)
                      }
                    }
                  } catch (e) { /* ignore parse errors */ }
                }
              }
            }
            // Speak any remaining buffer
            if (ttsBuffer.trim()) await speakOutput(ttsBuffer)
            addOrUpdateAgentMessage(fullText, true, thisAgentMessageId)
          } catch (err) {
            addOrUpdateAgentMessage('[AI streaming error: ' + (err?.message || 'Unknown error') + ']', true, thisAgentMessageId)
          }
        } else if (aiService === 'ollama') {
          // Ollama (local)
          const response = await axios.post(ollamaUrl, {
            model: ollamaModel,
            prompt,
            stream: false
          })
          // Ollama returns { response: "..." } or { choices: [{text: ...}] }
          const output = response.data.response || (response.data.choices && response.data.choices[0].text) || response.data.text || '[No response]'
          await speakOutput(output)
          addOrUpdateAgentMessage(output, true)
        } else {
          addOrUpdateAgentMessage('[No AI service selected]', true)
        }
      } catch (error) {
        setWaitingForResponse(false)
        addOrUpdateAgentMessage('[AI Error: ' + (error?.message || 'Unknown error') + ']', true)
        console.error(error)
      }
    }
  }

  const handleChange = async (event) => {
    event.preventDefault()
    setInput(event.target.value)
  }

  // --- Robust SpeechRecognition setup (internal, not via props) ---
  const recognitionRef = useRef(null)
  const [speechError, setSpeechError] = React.useState(null)

  useEffect(() => {
    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser')
      setMicEnabled(false)
      return
    }
    
    const setupRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = 'en-US'; // Make this configurable based on user's language

      // Add grammar support if available
      if (SpeechGrammarList) {
        const speechRecognitionList = new SpeechGrammarList();
        recognition.grammars = speechRecognitionList;
      }
      
      recognition.onstart = () => {
        setSpeechError(null);
        setInput('Listening...');
        console.log('Speech recognition started');
      };
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Show interim results while speaking
        if (interimTranscript) {
          setInput(interimTranscript);
        }
        
        // Send final results when done speaking
        if (finalTranscript) {
          setInput('');
          handleUserChatInput(finalTranscript.trim());
        }
      };
      
      recognition.onerror = (event) => {
        // Don't treat 'aborted' as an error when we intentionally stop
        if (event.error === 'aborted' && !micEnabled) {
          return;
        }
        
        console.error('Speech recognition error:', event);
        
        const errorMessages = {
          'no-speech': 'No speech was detected. Please try again.',
          'audio-capture': 'No microphone was found. Ensure it is plugged in and allowed.',
          'not-allowed': 'Microphone permission was denied. Please allow access.',
          'network': 'Network error occurred. Check your connection.',
          'aborted': 'Speech recognition was interrupted.',
          'language-not-supported': 'The selected language is not supported.',
          'service-not-allowed': 'Speech recognition service not allowed. Try reloading.',
        };
        
        setSpeechError(errorMessages[event.error] || `Error: ${event.error}`);
        setMicEnabled(false);
        setInput('');
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        // Only attempt to restart if explicitly enabled
        if (micEnabled) {
          try {
            // Small delay before restarting to prevent rapid cycling
            setTimeout(() => {
              if (micEnabled && recognitionRef.current) {
                recognition.start();
              }
            }, 200);
          } catch (e) {
            console.warn('Could not restart recognition:', e);
            setMicEnabled(false);
            setSpeechError('Failed to restart speech recognition');
          }
        }
      };
      
      recognitionRef.current = recognition;
    };

    setupRecognition();
    
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
  }, [micEnabled, handleUserChatInput])

  const startSpeech = async () => {
    setSpeechError(null);
    try {
      // First check if speech recognition is available
      if (!recognitionRef.current) {
        throw new Error('Speech recognition is not available');
      }

      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop any existing recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore stop errors
        }
      }
      
      // Start new recognition session
      await new Promise((resolve, reject) => {
        try {
          recognitionRef.current.onstart = () => {
            setMicEnabled(true);
            resolve();
          };
          recognitionRef.current.onerror = (err) => reject(err);
          recognitionRef.current.start();
        } catch (e) {
          reject(e);
        }
      });
    } catch (err) {
      console.error('Speech start error:', err);
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Microphone access was denied. Please allow microphone access in your browser settings.'
        : err.message || 'Failed to start speech recognition';
      setSpeechError(errorMessage);
      setMicEnabled(false);
    }
  };

  const stopSpeech = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setMicEnabled(false);
      }
    } catch (err) {
      console.error('Error stopping speech recognition:', err);
    }
  };

  useEffect(() => {
    // Focus back on input when the response is given
    if (!waitingForResponse) {
      document.getElementById("messageInput").focus()
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



  if (fullBioError) {
    return (
      <div style={{ padding: 32, color: 'red', background: '#fffbe6', border: '1px solid #ffd700', borderRadius: 8, margin: 32 }}>
        <h2>Chat Not Available</h2>
        <p>{fullBioError}</p>
        <p>Please select a character or reload the page after creating one.</p>
      </div>
    )
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
      </div>

      {/* Voice selection dropdown */}
      <div className={styles["speaker"]}>
        <label htmlFor="voiceSelect">TTS Voice</label>
        <select
          id="voiceSelect"
          value={selectedVoiceURI || ''}
          onChange={e => setSelectedVoiceURI(e.target.value)}
          style={{ width: '100%', marginBottom: 8 }}
        >
          {availableVoices.map(v => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name} ({v.lang}){v.default ? ' [default]' : ''}
            </option>
          ))}
        </select>
      </div>

      <label>{t("labels.conversation")}</label>
      <div className={styles["messages"]}>
        <div className={styles["scrollBox"]} id={"msgscroll"}>
          {messages.map((msg, index) => {
            if (msg.timestamp)
              return (
                <Message
                  key={index}
                  name={msg.name}
                  timestamp={msg.timestamp}
                  message={msg.message}
                  type={msg.type}
                  color={fontColor}
                />
              )
          })}
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
          className={styles.mic}
          size={32}
          active={!!micEnabled}
          onClick={() => (!micEnabled ? startSpeech() : stopSpeech())}
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
  )
}
