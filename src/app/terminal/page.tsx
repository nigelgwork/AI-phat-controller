"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Cpu, Trash2, CheckCircle, AlertTriangle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

export default function ControllerChatPage() {
  const [hasClaudeCode, setHasClaudeCode] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "Connected to AI Controller. Powered by Claude Code. Type a message to coordinate work across your rigs.",
      timestamp: new Date(),
    },
  ]);

  useEffect(() => {
    // Check if Claude Code is available
    fetch("/api/mayor/status")
      .then((res) => res.json())
      .then((data) => setHasClaudeCode(data.hasClaudeCode))
      .catch(() => setHasClaudeCode(false));
  }, []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/mayor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || data.error || "No response from Controller",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to reach Controller"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "system",
        content: "Chat cleared. Ready for new commands.",
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Status Banner */}
      {hasClaudeCode === true && (
        <div className="flex items-center gap-3 border-b border-cyan-500/30 bg-cyan-500/10 px-6 py-3">
          <CheckCircle className="h-5 w-5 text-cyan-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-cyan-200">
              AI Controller Ready
            </p>
            <p className="text-xs text-cyan-300/70">
              Run Gas Town commands directly: <code className="bg-cyan-500/20 px-1 rounded">gt rig list</code>, <code className="bg-cyan-500/20 px-1 rounded">bd list</code>, etc.
            </p>
          </div>
        </div>
      )}
      {hasClaudeCode === false && (
        <div className="flex items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-6 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-200">
              Claude Code Not Found
            </p>
            <p className="text-xs text-amber-300/70">
              Install Claude Code CLI for full functionality.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
            <Cpu className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">AI Controller</h1>
            <p className="text-sm text-zinc-400">
              {hasClaudeCode ? "Powered by Claude Code" : "Command mode (install Claude Code for AI)"}
            </p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role !== "user" && (
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  message.role === "system"
                    ? "bg-zinc-800"
                    : "bg-cyan-500/20"
                }`}
              >
                <Bot
                  className={`h-4 w-4 ${
                    message.role === "system" ? "text-zinc-400" : "text-cyan-500"
                  }`}
                />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-cyan-600 text-white"
                  : message.role === "system"
                  ? "bg-zinc-800/50 text-zinc-400 italic"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {message.content}
              </pre>
              <div
                className={`mt-1 text-xs ${
                  message.role === "user" ? "text-cyan-200" : "text-zinc-500"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
            {message.role === "user" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-600">
                <User className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
              <Loader2 className="h-4 w-4 text-cyan-500 animate-spin" />
            </div>
            <div className="rounded-lg bg-zinc-800 px-4 py-3">
              <span className="text-sm text-zinc-400">Running command...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Commands */}
      <div className="border-t border-zinc-800 px-6 py-3">
        <div className="flex flex-wrap gap-2">
          <QuickCommand cmd="gt rig list" onClick={(cmd) => setInput(cmd)} />
          <QuickCommand cmd="bd list" onClick={(cmd) => setInput(cmd)} />
          <QuickCommand cmd="gt convoy list" onClick={(cmd) => setInput(cmd)} />
          <QuickCommand cmd="what can I do here?" onClick={(cmd) => setInput(cmd)} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a command (gt rig list, bd list, gt convoy list...)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center rounded-lg bg-cyan-500 px-4 py-3 text-zinc-900 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 text-xs text-zinc-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}

function QuickCommand({ cmd, onClick }: { cmd: string; onClick: (cmd: string) => void }) {
  return (
    <button
      onClick={() => onClick(cmd)}
      className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
    >
      {cmd}
    </button>
  );
}
