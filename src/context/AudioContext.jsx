import React, {useState, createContext, useRef, useEffect, useContext} from 'react';
import { SoundContext } from './SoundContext';
import bgm from "../../public/sound/background/cc_bgm_balanced.wav"

export const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const { playSound } = useContext(SoundContext);
    const [isMute, setMute] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const speechSynthesis = window.speechSynthesis;

    // Initialize Web Audio API context
    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        return () => {
            if (audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    const speak = async (text, options = {}) => {
        if (isMute || !speechSynthesis) return;
        
        // Cancel any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.volume = options.volume || 1.0;
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        
        // Lipsync integration
        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                const word = text.substring(event.charIndex, event.charIndex + event.charLength);
                const duration = word.length / (options.rate || 1.0) * 0.05; // Adjusted duration factor
                playSound('speech', { duration });
            }
        };
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            playSound('speech-end');
        };
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