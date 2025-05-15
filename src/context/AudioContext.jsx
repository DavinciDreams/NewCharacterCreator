import React, {useState, createContext} from 'react';
export const AudioContext = createContext();
import bgm from "../../public/sound/background/cc_bgm_balanced.wav"

export const AudioProvider = ({ children }) => {
    const [isMute, setMute] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = React.useRef(null);
    const speechSynthesis = window.speechSynthesis;

    const speak = (text, options = {}) => {
        if (isMute || !speechSynthesis) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = options.volume || 1.0;
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        if (speechSynthesis) {
            speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    const enableAudio = () => {
        setMute(false)
        const audio = audioRef.current;
        audio.src = bgm
        audio.loop = true
        audio.volume = 0.0
        audio.play()
        let volume = 0.0
        const seconds = 5.0
        const interval = setInterval(() => {
            volume = Math.max(volume + 1.0 / (10 * seconds * 60.0), 1.0)
            if (volume >= 1.0) {
                clearInterval(interval)
            }
            audio.volume = volume
        }, 1000 / 60)
    }

    const disableAudio = () => {
        setMute(true)
        const audio = audioRef.current;
        audio.pause()
        stopSpeaking();
    }

    return (
        <AudioContext.Provider value={{
            isMute, setMute,
            enableAudio, disableAudio,
            speak, stopSpeaking, isSpeaking
        }}>
            <audio ref={audioRef} />
            {children}
        </AudioContext.Provider>
    )
}