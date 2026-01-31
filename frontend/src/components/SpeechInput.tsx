import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Voice commands that can be recognized
const VOICE_COMMANDS: Record<string, string> = {
  'pause': 'pause',
  'stop': 'pause',
  'resume': 'resume',
  'continue': 'resume',
  'approve': 'approve',
  'accept': 'approve',
  'yes': 'approve',
  'reject': 'reject',
  'deny': 'reject',
  'no': 'reject',
  'status': 'status',
  'clear': 'clear',
};

interface SpeechInputProps {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onFinalTranscript?: (text: string) => void;
  onCommand?: (command: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function SpeechInput({
  onTranscript,
  onFinalTranscript,
  onCommand,
  disabled = false,
  className = '',
  placeholder,
}: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (interim) {
        onTranscript?.(interim, false);
      }

      if (final) {
        setInterimTranscript('');
        onTranscript?.(final, true);
        onFinalTranscript?.(final);

        // Check for voice commands
        const normalizedText = final.toLowerCase().trim();
        for (const [trigger, command] of Object.entries(VOICE_COMMANDS)) {
          if (normalizedText === trigger || normalizedText.startsWith(trigger + ' ')) {
            onCommand?.(command);
            break;
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);

      // Don't show error for "no-speech" - it's expected when user is silent
      if (event.error !== 'no-speech') {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if we're still supposed to be listening
      // (recognition can end due to silence)
    };

    return recognition;
  }, [onTranscript, onFinalTranscript, onCommand]);

  // Start listening
  const startListening = useCallback(() => {
    if (disabled || !isSupported) return;

    // Initialize new recognition instance
    recognitionRef.current = initRecognition();
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Failed to start speech recognition');
    }
  }, [disabled, isSupported, initRecognition]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 text-slate-500 text-sm ${className}`}>
        <MicOff size={16} />
        <span>Speech recognition not supported</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`p-2 rounded-lg transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isListening ? 'Stop listening' : 'Start voice input'}
      >
        {isListening ? (
          <Mic size={20} className="animate-pulse" />
        ) : (
          <Mic size={20} />
        )}
      </button>

      {isListening && interimTranscript && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 rounded-lg">
            <Loader2 size={14} className="animate-spin text-cyan-400 flex-shrink-0" />
            <span className="text-sm text-slate-300 truncate italic">
              {interimTranscript || placeholder || 'Listening...'}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}

// Hook for using speech input in components
export function useSpeechInput(options?: {
  onCommand?: (command: string) => void;
}) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript(text);
    }
  }, []);

  const handleFinalTranscript = useCallback((text: string) => {
    setTranscript(text);
  }, []);

  return {
    transcript,
    isListening,
    setTranscript,
    SpeechInputComponent: (props: Partial<SpeechInputProps>) => (
      <SpeechInput
        {...props}
        onTranscript={handleTranscript}
        onFinalTranscript={handleFinalTranscript}
        onCommand={options?.onCommand}
      />
    ),
  };
}
