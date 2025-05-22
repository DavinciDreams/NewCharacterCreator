import { useRef, useEffect, useCallback, useState } from "react";

export default function useSpeechRecognition({
  enabled = true,
  onResult,
  onError,
  onStart,
  onEnd,
  lang = "en-US",
  interim = true,
  continuous = true,
}) {
  const recognitionRef = useRef(null);
  const isUnmounting = useRef(false);
  const [isRecognizing, setIsRecognizing] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = interim;
    recognition.lang = lang;

    recognition.onstart = () => {
      setIsRecognizing(true);
      onStart && onStart();
    };
    recognition.onend = () => {
      setIsRecognizing(false);
      onEnd && onEnd();
      if (enabled && !isUnmounting.current) {
        // Add a longer delay to prevent immediate restart which can cause flickering
        setTimeout(() => {
          if (enabled && !isUnmounting.current) {
            recognition.start();
          }
        }, 1500); // Increased delay to 1500ms
      }
    };
    recognition.onerror = (event) => {
      setIsRecognizing(false);
      onError && onError(event);
      if (event.error !== 'no-speech' && enabled && !isUnmounting.current && recognitionRef.current) {
        // Restart after error, but with a delay
        setTimeout(() => {
          if (enabled && !isUnmounting.current && recognitionRef.current) {
            recognitionRef.current.start();
          }
        }, 1500); // Increased delay to 1500ms
      }
    };
    recognition.onresult = (event) => {
      if (!enabled) return;
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      // Only pass non-empty results to maintain state updates only from user input
      if (interimTranscript || finalTranscript) {
        onResult && onResult({ interimTranscript, finalTranscript });
      }
    };

    recognitionRef.current = recognition;
    return () => {
      isUnmounting.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [enabled, lang, interim, continuous, onResult, onError, onStart, onEnd]);

  // Start recognition
  const start = useCallback(() => {
    if (recognitionRef.current && !isRecognizing && enabled) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        // Already started
      }
    }
  }, [enabled, isRecognizing]);

  // Stop recognition
  const stop = useCallback(() => {
    if (recognitionRef.current && isRecognizing) {
      recognitionRef.current.stop();
    }
  }, [isRecognizing]);

  return { start, stop, isRecognizing };
}