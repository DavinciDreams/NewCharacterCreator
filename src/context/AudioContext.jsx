import React, { useState, createContext, useRef, useEffect } from 'react';
import EasySpeech from 'easy-speech';
import bgm from "../../public/sound/background/cc_bgm_balanced.wav";

export const AudioContext = createContext();

export const AudioProvider = ({ children }) => {
    const [isMute, setMute] = useState(false);
    const [ttsVolume, setTtsVolume] = useState(1);
    const [bgmVolume, setBgmVolume] = useState(0.3);
    const audioRef = useRef(null);
    
    // TTS voice selection state
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState(
        () => localStorage.getItem('selectedVoiceURI') || null
    );

    // Initialize EasySpeech
    useEffect(() => {
        EasySpeech.init({ maxTimeout: 5000, interval: 250 }).then(() => {
            const voices = EasySpeech.voices();
            setAvailableVoices(voices);
            if (voices.length > 0 && !selectedVoiceURI) {
                setSelectedVoiceURI(
                    voices.find(v => v.lang.startsWith('en'))?.voiceURI || voices[0].voiceURI
                );
            }
        });
    }, []);

    const speakText = async (text, options = {}) => {
        if (isMute || !text?.trim()) return;

        // Temporarily reduce BGM volume
        const audio = audioRef.current;
        const originalVolume = audio.volume;
        audio.volume = originalVolume * 0.3;

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const voices = EasySpeech.voices();
                const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI) || voices[0];
                
                await EasySpeech.speak({
                    text,
                    voice: selectedVoice,
                    pitch: options.pitch || 1,
                    rate: options.rate || 1,
                    volume: ttsVolume,
                    boundary: (e) => console.debug('Word boundary:', e.charIndex),
                    error: (e) => {
                        if (e.error !== 'interrupted') {
                            console.warn('TTS error:', e);
                        }
                    }
                });
                break;
            } catch (e) {
                attempt++;
                console.warn(`TTS attempt ${attempt} failed:`, e);
                if (attempt === maxRetries) {
                    console.error('TTS failed after all retries:', e);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Restore BGM volume
        audio.volume = originalVolume;
    };

    // Enhanced BGM controls
    const enableAudio = () => {
        setMute(false);
        const audio = audioRef.current;
        audio.src = bgm;
        audio.loop = true;
        audio.volume = 0;
        audio.play();
        
        fadeAudio(0, bgmVolume, 5.0);
    };

    const disableAudio = () => {
        setMute(true);
        fadeAudio(audioRef.current.volume, 0, 2.0).then(() => {
            audioRef.current.pause();
        });
    };

    const fadeAudio = async (startVol, endVol, durationSecs) => {
        const audio = audioRef.current;
        const steps = durationSecs * 60;
        const volStep = (endVol - startVol) / steps;
        
        return new Promise(resolve => {
            let step = 0;
            const interval = setInterval(() => {
                audio.volume = startVol + (volStep * step);
                step++;
                
                if (step >= steps) {
                    audio.volume = endVol;
                    clearInterval(interval);
                    resolve();
                }
            }, 1000 / 60);
        });
    };

    return (
        <AudioContext.Provider value={{
            isMute,
            setMute,
            enableAudio,
            disableAudio,
            speakText,
            ttsVolume,
            setTtsVolume,
            bgmVolume,
            setBgmVolume,
            availableVoices,
            selectedVoiceURI,
            setSelectedVoiceURI
        }}>
            <audio ref={audioRef} />
            {children}
        </AudioContext.Provider>
    );
};