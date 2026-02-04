import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export interface TTSOutputProps {
  text: string;
  enabled?: boolean;
  autoPlay?: boolean;
  onComplete?: () => void;
  onStart?: () => void;
  onError?: (error: string) => void;
  voice?: string;
  rate?: number;
  pitch?: number;
}

export default function TTSOutput({
  text,
  enabled = true,
  autoPlay = true,
  onComplete,
  onStart,
  onError,
  voice,
  rate = 1.0,
  pitch = 1.0,
}: TTSOutputProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastTextRef = useRef<string>('');

  // Check if TTS is supported
  useEffect(() => {
    setIsSupported('speechSynthesis' in window);

    if ('speechSynthesis' in window) {
      // Load voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      // Voices may load asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // Speak function
  const speak = useCallback((textToSpeak: string) => {
    if (!enabled || !isSupported || !textToSpeak) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utteranceRef.current = utterance;

    // Set voice if specified
    if (voice && voices.length > 0) {
      const selectedVoice = voices.find(v =>
        v.name.toLowerCase().includes(voice.toLowerCase()) ||
        v.lang.toLowerCase().includes(voice.toLowerCase())
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      // Try to use a natural-sounding English voice
      const preferredVoice = voices.find(v =>
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Premium')) &&
        v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onStart?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onComplete?.();
    };

    utterance.onerror = (event) => {
      setIsSpeaking(false);
      if (event.error !== 'canceled') {
        onError?.(event.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [enabled, isSupported, voices, voice, rate, pitch, onStart, onComplete, onError]);

  // Stop speaking
  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  // Auto-play when text changes
  useEffect(() => {
    if (autoPlay && text && text !== lastTextRef.current) {
      lastTextRef.current = text;
      speak(text);
    }
  }, [text, autoPlay, speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  if (!isSupported) {
    return null;
  }

  return {
    speak,
    stop,
    isSpeaking,
  };
}

// Hook for using TTS in components
export function useTTS(options?: {
  enabled?: boolean;
  voice?: string;
  rate?: number;
  pitch?: number;
  onComplete?: () => void;
  onError?: (error: string) => void;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);

    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!options?.enabled || !isSupported || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Set voice
    if (options?.voice && voices.length > 0) {
      const selectedVoice = voices.find(v =>
        v.name.toLowerCase().includes(options.voice!.toLowerCase()) ||
        v.lang.toLowerCase().includes(options.voice!.toLowerCase())
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    } else {
      const preferredVoice = voices.find(v =>
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Premium')) &&
        v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
    }

    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      options?.onComplete?.();
    };
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      if (event.error !== 'canceled') {
        options?.onError?.(event.error);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, voices, options]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    voices,
  };
}

// TTS toggle button component
export function TTSToggle({
  enabled,
  onToggle,
  className = '',
}: {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`p-2 rounded-lg transition-all ${
        enabled
          ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-300'
      } ${className}`}
      title={enabled ? 'Disable voice output' : 'Enable voice output'}
    >
      {enabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  );
}
