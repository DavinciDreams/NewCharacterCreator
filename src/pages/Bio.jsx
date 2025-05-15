import React, { useContext, useEffect, useState } from "react"
import { voices } from "../constants/voices"
import { favouriteColors } from "../constants/favouriteColors"
import CustomButton from "../components/custom-button"
import { ViewContext, ViewMode } from "../context/ViewContext"
import styles from "./Bio.module.css"
import { LanguageContext } from "../context/LanguageContext"
import { SoundContext } from "../context/SoundContext"
import { AudioContext } from "../context/AudioContext"
import { LLMContext } from "../context/LLMContext"
import { getLLMResponse } from "../lib/chat"
import { Brain } from 'lucide-react';
import { useBio } from "../context/BioContext";
import { createAvatarWithBio } from "../library/utils";

export const getBio = (templateInfo, personality) => {
  const classType = templateInfo.name.toUpperCase();

  const name = personality.names[Math.floor(Math.random() * personality.names.length)]
  const city = personality.cities[Math.floor(Math.random() * personality.cities.length)]
  const weapon = personality.weapons[Math.floor(Math.random() * personality.weapons.length)]
  const hobby = personality.hobbies[Math.floor(Math.random() * personality.hobbies.length)]
  const profession = personality.professions[Math.floor(Math.random() * personality.professions.length)]
  const heshe = personality.heShe[classType]

  const voiceKey = Object.keys(voices).find((v) => {
    if (heshe.toUpperCase() === "SHE"){
      if (v.includes("Female")){
        return v
      }
    }
    if (heshe.toUpperCase() === "HE")
      if (v.includes("Male")){
        return v
      }
  } )
  const randIndexColor = Math.floor(Math.random() * Object.keys(favouriteColors).length);
  const favColor = Object.keys(favouriteColors)[randIndexColor]
  const description = `${name} is a ${personality.classes[classType]} from ${city}. ${heshe} is ${hobby}. ${heshe} also enjoys ${profession}. ${heshe} is armed with a ${weapon}.`
  
  const q1 = getPersonalityQuestionsAndAnswers(personality);
  const q2 = getRelationshipQuestionsAndAnswers(personality);
  const q3 = getHobbyQuestionsAndAnswers(personality);

  const { setBioData } = useBio();

  const fullBio = {
    name,
    classType,
    city,
    weapon,
    hobby,
    profession,
    heshe,
    voiceKey,
    favColor,
    personality: q1, //{question, answer}
    relationship: q2,
    hobbies: q3,
    description,
    greeting:"Hello"
  }

  setBioData({
    traits: {
      name,
      class: personality.classes[classType],
      city,
      weapon,
      hobby,
      profession,
      favoriteColor: favColor
    },
    fullBio: description
  });

  return fullBio
}

export const getPersonalityQuestionsAndAnswers = (personality) => {
  const question =
  personality.generalPersonalityQuestions[Math.floor(Math.random() * personality.generalPersonalityQuestions.length)]
  const answer =
    personality.generalPersonalityAnswers[
      Math.floor(Math.random() * personality.generalPersonalityAnswers.length)
    ]
  return { question, answer }
}

export const getHobbyQuestionsAndAnswers = (personality) => {
  const question = personality.hobbyQuestions[Math.floor(Math.random() * personality.hobbyQuestions.length)]
  const answer = personality.hobbyAnswers[Math.floor(Math.random() * personality.hobbyAnswers.length)]
  return { question, answer }
}

export const getRelationshipQuestionsAndAnswers = (personality) => {
  const question = personality.relationshipQuestions[Math.floor(Math.random() * personality.relationshipQuestions.length)]
  const answer = personality.relationshipAnswers[Math.floor(Math.random() * personality.relationshipAnswers.length)]
  return { question, answer }
}

// Cache voice keys for performance.
const voiceKeys = Object.keys(voices)
const colorKeys = Object.keys(favouriteColors)

const saveToStorage = (itemName, data) => {
  try {
    localStorage.setItem(itemName, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to storage:', error);
  }
};

const loadFromStorage = (itemName) => {
  try {
    const savedData = localStorage.getItem(itemName);
    return savedData ? JSON.parse(savedData) : null;
  } catch (error) {
    console.error('Failed to load from storage:', error);
    return null;
  }
};

const BioPage = ({ templateInfo, personality }) => {
  const { playSound } = useContext(SoundContext)
  const { isMute, speak } = useContext(AudioContext)
  const { setViewMode } = useContext(ViewContext)
  const { apiKey, queryLLM, AVAILABLE_MODELS, DEFAULT_MODEL } = useContext(LLMContext)
  
  const [fullBio, setFullBio] = React.useState(
    loadFromStorage(`${templateInfo.id}_fulBio`)
    ||
    getBio(templateInfo, personality)
  )

  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);

  const [generatedBio, setGeneratedBio] = useState('');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [bioTraits, setBioTraits] = useState({
    personality: '',
    backstory: '', 
    quirks: '',
    aspirations: ''
  });

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showLoadConfirm, setShowLoadConfirm] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  useEffect(() => {
    if (templateInfo.id) {
      const loadedBio = loadFromStorage(templateInfo.id);
      if (loadedBio) {
        setFullBio(loadedBio);
      } else {
        setFullBio(getBio(templateInfo, personality));
      }
    }
  }, [templateInfo.id, templateInfo, personality]);

  useEffect(() => {
    if (fullBio.name) {
      saveToStorage(templateInfo.id, fullBio);
    }
  }, [fullBio, templateInfo.id]);

  useEffect(() => {
    if (fullBio?.id) {
      const savedVoice = localStorage.getItem(`character_voice_${fullBio.id}`);
      if (savedVoice) setSelectedVoice(savedVoice);
    }
  }, [fullBio?.id]);

  useEffect(() => {
    if (templateInfo.id) {
      const savedBio = loadFromStorage(`character-bio-${templateInfo.id}`);
      if (savedBio) {
        setBioTraits(savedBio.traits);
        setGeneratedBio(savedBio.fullBio);
      }
    }
  }, [templateInfo.id]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const newMessage = { 
      name: 'User', 
      message: userInput,
      timestamp: new Date().toISOString() 
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setUserInput('');
    setIsTyping(true);
    
    try {
      // Get character context from existing bio
      const characterContext = {
        name: personality?.name,
        traits: {
          ...personality,
          voice: voices[personality?.voiceKey]?.name
        }
      };
      
      const response = await getLLMResponse({
        messages: [...chatMessages, newMessage],
        llmContext: { queryLLM, selectedModel },
        audioContext: { isMute, speak },
        options: {
          system: `You are ${characterContext.name}. ${characterContext.description}`
        }
      });
      
      setChatMessages(prev => [...prev, {
        name: characterContext.name,
        message: response,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const back = () => {
    setViewMode(ViewMode.APPEARANCE)
    !isMute && playSound('backNextButton');
  }

  const next = () => {
    setViewMode(ViewMode.SAVE)
    !isMute && playSound('backNextButton');
  }

  // if user presses ctrl c, clear the messages
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "c") {
        // spacebar
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Translate hook
  const { t } = useContext(LanguageContext);

  const generateCharacterBio = async () => {
    if (!fullBio.name || !templateInfo.id) return;
    
    setIsGeneratingBio(true);
    
    try {
      const prompt = `Create a detailed character bio for ${fullBio.name}, a ${fullBio.age}-year-old with:
`
        + `- Voice: ${fullBio.voiceKey}
`
        + `- Personality: ${Object.entries(fullBio.personality).join(', ')}
`
        + `- Favorite color: ${fullBio.favColor}

`
        + `Respond with this JSON structure:
`
        + JSON.stringify({
            personality: "3-5 sentence description",
            backstory: "short origin story",
            quirks: "unique mannerisms",
            aspirations: "goals and dreams"
          }, null, 2);

      const response = await getLLMResponse({
        prompt,
        model: 'gpt-4',
        format: 'json'
      });

      if (response?.data) {
        try {
          const bioData = JSON.parse(response.data);
          if (bioData && typeof bioData === 'object') {
            setBioTraits(bioData);
            const newGeneratedBio = 
              `PERSONALITY: ${bioData.personality}\n\n` +
              `BACKSTORY: ${bioData.backstory}\n\n` +
              `QUIRKS: ${bioData.quirks}\n\n` +
              `ASPIRATIONS: ${bioData.aspirations}`;
            
            setGeneratedBio(newGeneratedBio);
            saveToStorage(`character-bio-${templateInfo.id}`, {
              traits: bioData,
              fullBio: newGeneratedBio
            });
          }
        } catch (parseError) {
          console.error('Failed to parse bio response:', parseError);
          setGeneratedBio('Error: Could not generate bio. Please try again.');
        }
      }
    } catch (error) {
      console.error('Bio generation failed:', error);
      setGeneratedBio('Error: Bio generation failed. Please check your connection.');
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleExportBio = () => {
    const avatarElement = document.getElementById('avatar-preview');
    const bioText = generatedBio || fullBio.description;
    
    if (avatarElement && bioText) {
      createAvatarWithBio(avatarElement, bioText)
        .then(canvas => {
          // Convert canvas to image and download
          const link = document.createElement('a');
          link.download = `${fullBio.name}-bio.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
    }
  };

  const handleImportBio = (importString) => {
    try {
      const data = JSON.parse(importString);
      if (data && data.traits && data.fullBio) {
        setBioTraits(data.traits);
        setGeneratedBio(data.fullBio);
        saveToStorage(`character-bio-${templateInfo.id}`, {
          traits: data.traits,
          fullBio: data.fullBio
        });
        return true;
      }
    } catch (error) {
      console.error('Import failed:', error);
    }
    return false;
  };

  return (
    <div className={styles.container}>
      <div className={"sectionTitle"}>{t("pageTitles.createBio")}</div>
      <div className={styles.bioContainer}>
        <div className={styles.topLine} />
        <div className={styles.bottomLine} />
        <div className={styles.scrollContainer}>

          <div className={styles["inner-container"]}>
            {/* Name */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="name">
                {t("labels.name")}
              </label>

              <input
                type="text"
                name="name"
                className={styles.input}
                defaultValue={fullBio.name}
                onChange={(e) => setFullBio({...fullBio, ...{name:e.target.value}})}
              />
            </div>

            {/* Voice */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="voice">
                {t("labels.voice")}
              </label>

              <select
                name="voice"
                className={styles.select}
                defaultValue={fullBio.voiceKey}
                onChange={(e) => setFullBio({...fullBio, ...{voiceKey:e.target.value}})}
              >
                {voiceKeys.map((voiceKey) => (
                  <option key={`voice-${voiceKey}`} value={voiceKey}>
                    {voiceKey.replace(/([A-Z])/g, ' $1').trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Favourite Color */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="favcolor">
                {t("labels.favoriteColor")}
              </label>

              <select
                name="favcolor"
                className={styles.select}
                defaultValue={fullBio.favColor}
                onChange={(e) => setFullBio({...fullBio, ...{favColor:e.target.value}})}
              >
                {colorKeys.map((colorKey) => (
                  <option key={`color-${colorKey}`} value={colorKey}>
                    {colorKey.replace(/([A-Z])/g, ' $1').trim()}
                  </option>
                ))}
              </select>
            </div>

            {/* Preferred Greeting */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="greeting">
                {t("labels.preferredGreeting")}
              </label>

              <input
                type="text"
                name="greeting"
                className={styles.input}
                defaultValue={fullBio.greeting}
                onChange={(e) => setFullBio({...fullBio, ...{greeting:e.target.value}})}
              />
            </div>

            {/* Bio */}
            <div className={styles.section}>
              <label className={styles.label} htmlFor="bio">{t("labels.bio")}</label>

              <textarea
                name="bio"
                className={styles.input}
                rows="4"
                cols="50"
                defaultValue={fullBio.description}
                onChange={(e) => setFullBio({...fullBio, ...{description:e.target.value}})}
              />
            </div>

            {/* Question 1 */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="question1">
                {t("labels.question")} 1
              </label>

              <select
                name="question1"
                className={styles.select}
                defaultValue={fullBio.personality.question}
                onChange={(e) => setFullBio({...fullBio, ...{
                    personality:{
                      question:e.target.value,
                      answer:fullBio.personality.answer
                    }
                  }})}
              >
                {personality.generalPersonalityQuestions.map((q) => (
                  <option key={`personality-${q}`} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <textarea
                name="response1"
                className={styles.input}
                defaultValue={fullBio.personality.answer}
                onChange={(e) => setFullBio({...fullBio, ...{
                    personality:{
                      question:fullBio.personality.question,
                      answer:e.target.value
                    }
                  }})}


              />
            </div>

            {/* Question 2 */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="question2">
                {t("labels.question")} 2
              </label>

              <select
                name="question2"
                className={styles.select}
                defaultValue={fullBio.relationship.question}
                onChange={(e) => setFullBio({...fullBio, ...{
                    relationship:{
                      question:e.target.value,
                      answer:fullBio.relationship.answer
                    }
                  }})}
              >
                {personality.relationshipQuestions.map((q) => (
                  <option key={`relationship-${q}`} value={q}>
                    {q}
                  </option>
                ))}
              </select>

              <textarea
                name="response1"
                className={styles.input}
                defaultValue={fullBio.relationship.answer}
                onChange={(e) => setFullBio({...fullBio, ...{
                    relationship:{
                      question:fullBio.relationship.question,
                      answer:e.target.value
                    }
                  }})}
              />
            </div>

            {/* Question 3 */}
            <div className={styles.section}>
              <label
                className={styles.label}
                htmlFor="question3">
                {t("labels.question")} 3
              </label>
              <select
                name="question3"
                className={styles.select}
                defaultValue={fullBio.hobbies.question}
                onChange={(e) => setFullBio({...fullBio, ...{
                    hobbies:{
                      question:e.target.value,
                      answer: fullBio.hobbies.answer
                    }
                  }})}
              >
                {personality.hobbyQuestions.map((q) => (
                  <option key={`hobby-${q}`} value={q}>
                    {q}
                  </option>
                ))}
              </select>

              <textarea
                name="response3"
                className={styles.input}
                defaultValue={fullBio.hobbies.answer}
                onChange={(e) => setFullBio({...fullBio, ...{
                    hobbies:{
                      question:fullBio.hobbies.question,
                      answer:e.target.value
                    }
                  }})}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.buttonContainer}>
        <CustomButton
          theme="light"
          text={t('callToAction.back')}
          size={14}
          className={styles.buttonLeft}
          onClick={back}
        />
        <CustomButton
          theme="light"
          text={t('callToAction.next')}
          size={14}
          className={styles.buttonRight}
          onClick={next}
        />
      </div>
      <div className={styles.tabContainer}>
        <button 
          type="button"
          className={`${styles.tab} ${activeTab === 'chat' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button 
          type="button"
          className={`${styles.tab} ${activeTab === 'model' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('model')}
        >
          <Brain size={16} /> Model
        </button>
      </div>
      {activeTab === 'model' && (
        <div className={styles.modelPanel}>
          <h4>Select AI Model</h4>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {Object.entries(AVAILABLE_MODELS).map(([id, model]) => (
              <option key={id} value={id}>
                {model.name} ({model.provider}) 
                {model.tool_use && <span title="Supports tool use">🛠️</span>}
                - {model.max_tokens.toLocaleString()} tokens
              </option>
            ))}
          </select>
          <p className={styles.modelDescription}>
            {AVAILABLE_MODELS[selectedModel]?.description || ''}
            {AVAILABLE_MODELS[selectedModel]?.tool_use && (
              <span className={styles.toolIndicator}> • Tool Capable 🛠️</span>
            )}
          </p>
        </div>
      )}
      {activeTab === 'chat' && (
        <div className={styles.chatContainer}>
          <div className={styles.chatMessages}>
            {chatMessages.map((msg) => (
              <div 
                key={`${msg.name}-${msg.message}-${Date.now()}`} 
                className={msg.name === 'User' ? styles.userMessage : styles.characterMessage}
              >
                <strong>{msg.name}:</strong> {msg.message}
              </div>
            ))}
            {isTyping && <div className={styles.typingIndicator}>Typing...</div>}
          </div>
          
          <div className={styles.chatInput}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me something..."
              disabled={!apiKey}
            />
            <button 
              type="button"
              onClick={handleSendMessage}
              disabled={!userInput.trim() || !apiKey}
            >
              Send
            </button>
          </div>
          <div className={styles.voiceControls}>
            <select
              value={selectedVoice || ''}
              onChange={(e) => {
                const voice = e.target.value;
                setSelectedVoice(voice);
                if (fullBio?.id) {
                  localStorage.setItem(`character_voice_${fullBio.id}`, voice);
                }
              }}
            >
              <option value="">Select Voice</option>
              {Object.keys(voices).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
            <button 
              type="button"
              onClick={() => {
                if (selectedVoice) {
                  speak('This is a preview of my voice', { 
                    voice: voices[selectedVoice],
                    rate: 1.0,
                    pitch: 1.0 
                  });
                }
              }}
              disabled={!selectedVoice}
            >
              Preview Voice
            </button>
          </div>
        </div>
      )}
      {generatedBio && (
        <div className={styles.bioContainer}>
          <h3>{fullBio.name}&apos;s Generated Bio</h3>
          <pre className={styles.bioText}>{generatedBio}</pre>
          
          {/* Personality breakdown */}
          <div className={styles.personalityGrid}>
            {Object.entries(bioTraits).map(([trait, value]) => (
              <div key={trait} className={styles.traitCard}>
                <h4>{trait.toUpperCase()}</h4>
                <p>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={styles.buttonGroup}>
        <CustomButton 
          onClick={() => setShowSaveConfirm(true)}
          disabled={!generatedBio}
        >
          Save Bio
        </CustomButton>
        
        <CustomButton 
          onClick={() => setShowLoadConfirm(true)}
          disabled={!templateInfo.id}
        >
          Load Bio
        </CustomButton>
        
        <CustomButton 
          onClick={() => setShowExportDialog(true)}
          disabled={!generatedBio}
        >
          Export Bio
        </CustomButton>
        
        <CustomButton 
          onClick={() => setShowImportDialog(true)}
        >
          Import Bio
        </CustomButton>
      </div>
      {showSaveConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirm Save</h3>
            <p>Overwrite existing saved bio for this character?</p>
            <div className={styles.modalButtons}>
              <CustomButton onClick={() => {
                saveToStorage(`character-bio-${templateInfo.id}`, {
                  traits: bioTraits,
                  fullBio: generatedBio
                });
                setShowSaveConfirm(false);
              }}>Confirm</CustomButton>
              <CustomButton onClick={() => setShowSaveConfirm(false)}>Cancel</CustomButton>
            </div>
          </div>
        </div>
      )}
      {showLoadConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Confirm Load</h3>
            <p>This will replace your current bio. Continue?</p>
            <div className={styles.modalButtons}>
              <CustomButton onClick={() => {
                const savedBio = loadFromStorage(`character-bio-${templateInfo.id}`);
                if (savedBio) {
                  setBioTraits(savedBio.traits);
                  setGeneratedBio(savedBio.fullBio);
                }
                setShowLoadConfirm(false);
              }}>Confirm</CustomButton>
              <CustomButton onClick={() => setShowLoadConfirm(false)}>Cancel</CustomButton>
            </div>
          </div>
        </div>
      )}
      {showExportDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Export Bio</h3>
            <textarea 
              className={styles.exportArea}
              value={handleExportBio()}
              readOnly
            />
            <div className={styles.modalButtons}>
              <CustomButton onClick={() => {
                navigator.clipboard.writeText(handleExportBio());
                setShowExportDialog(false);
              }}>Copy to Clipboard</CustomButton>
              <CustomButton onClick={() => setShowExportDialog(false)}>Close</CustomButton>
            </div>
          </div>
        </div>
      )}
      {showImportDialog && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Import Bio</h3>
            <textarea 
              className={styles.exportArea}
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste exported bio data here"
            />
            <div className={styles.modalButtons}>
              <CustomButton onClick={() => {
                if (handleImportBio(importData)) {
                  setShowImportDialog(false);
                  setImportData('');
                }
              }}>Import</CustomButton>
              <CustomButton onClick={() => {
                setShowImportDialog(false);
                setImportData('');
              }}>Cancel</CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BioPage