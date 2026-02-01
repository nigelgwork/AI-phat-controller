import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Loader2,
  Settings,
  ChevronDown,
  Minimize2,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useCurrentPersonality,
  useClawdbotGreeting,
  usePersonalities,
  useSetCurrentPersonality,
} from '../hooks/useClawdbot';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export default function FloatingAssistant() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPersonalityPicker, setShowPersonalityPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: currentPersonality } = useCurrentPersonality();
  const { data: greeting } = useClawdbotGreeting();
  const { data: personalities = [] } = usePersonalities();
  const setCurrentPersonality = useSetCurrentPersonality();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  // Add greeting when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0 && greeting) {
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen, greeting, messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const result = await window.electronAPI?.executeClaudeCode(input.trim());

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result?.response || result?.error || 'No response',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalityChange = async (id: string) => {
    try {
      await setCurrentPersonality.mutateAsync(id);
      setShowPersonalityPicker(false);
    } catch (error) {
      console.error('Failed to change personality:', error);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    // Collapsed button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 z-50"
        title="Open Clawdbot Assistant"
      >
        <Bot className="w-7 h-7" />
      </button>
    );
  }

  if (isMinimized) {
    // Minimized bar
    return (
      <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-700 rounded-lg shadow-lg flex items-center gap-2 p-2 z-50">
        <Bot className="w-5 h-5 text-cyan-400" />
        <span className="text-sm text-white font-medium">Clawdbot</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
        >
          <ChevronDown className="w-4 h-4 rotate-180" />
        </button>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-slate-800 border border-slate-700 rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <span className="font-medium text-white">Clawdbot</span>
          {currentPersonality && (
            <div className="relative">
              <button
                onClick={() => setShowPersonalityPicker(!showPersonalityPicker)}
                className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
              >
                {currentPersonality.name}
                <ChevronDown className="w-3 h-3 inline ml-1" />
              </button>

              {/* Personality Picker Dropdown */}
              {showPersonalityPicker && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-lg overflow-hidden z-10">
                  {personalities.map((p: { id: string; name: string }) => (
                    <button
                      key={p.id}
                      onClick={() => handlePersonalityChange(p.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-800 transition-colors ${
                        currentPersonality.id === p.id
                          ? 'bg-cyan-500/10 text-cyan-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/clawdbot')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Personality Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Send a message to get started</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-100'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm break-words">
                {msg.content}
              </pre>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 rounded-lg px-3 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Clawdbot..."
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={clearChat}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Clear chat
          </button>
        )}
      </form>
    </div>
  );
}
