"use client";

import React, { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  time: string;
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if chatbot is enabled and configured on the server
    async function checkStatus() {
      try {
        const res = await fetch("/api/ai/chat");
        if (res.ok) {
          const data = await res.json();
          if (data.enabled) {
            setIsConfigured(true);
            setMessages([
              {
                id: "initial",
                sender: "bot",
                text: "Hello! I am your SpeakUp AI Language Assistant. How can I assist with your English speaking, vocabulary, or learning today?",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
          }
        }
      } catch {
        // Chatbot service offline or not configured
        setIsConfigured(false);
      }
    }
    checkStatus();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // If chatbot is disabled by admin, don't show floating widget
  if (!isConfigured) return null;

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: "u-" + Date.now(),
      sender: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response from AI assistant.");
      }

      const botMsg: Message = {
        id: "b-" + Date.now(),
        sender: "bot",
        text: data.reply || "Thank you for reaching out. Let me know if you need more assistance.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setErrorMessage(err.message || "Communication error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <aside aria-label="AI Chat Assistant" className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#1b1a17] via-[#24211b] to-[#141416] text-[#d4af37] border border-[#d4af37]/40 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300"
          title="Chat with SpeakUp AI Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/30 group-hover:rotate-12 transition-transform">
            <span className="material-symbols-outlined text-[19px]">smart_toy</span>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] uppercase font-bold tracking-widest text-[#d4af37]">SpeakUp AI</p>
            <p className="text-xs text-[#e5e2e1]/80 font-medium">Ask a Question</p>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d4af37]"></span>
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[400px] h-[520px] max-h-[85vh] bg-white dark:bg-[#141416] border border-[#d4af37]/35 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#1c1a16] via-[#2a241b] to-[#141416] border-b border-[#d4af37]/25 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#d4af37]/20 flex items-center justify-center text-[#d4af37] border border-[#d4af37]/40">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                  SpeakUp AI Tutor
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] text-[#e5e2e1]/70">Online &bull; Powered by LMS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: "reset",
                      sender: "bot",
                      text: "Conversation refreshed. How else can I assist your speaking journey today?",
                      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ])
                }
                title="Reset conversation"
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="w-7 h-7 rounded-lg text-stone-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[var(--surface-lowest)] custom-scroll">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    m.sender === "user"
                      ? "bg-gradient-to-r from-[#d4af37] to-[#b39226] text-[#141416] font-medium rounded-tr-none"
                      : "bg-white dark:bg-[#1f1e21] text-[var(--text-main)] border border-[var(--surface-border)] rounded-tl-none"
                  }`}
                >
                  {m.text}
                </div>
                <span className="text-[9px] text-[var(--text-muted)] mt-1 px-1">{m.time}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs bg-white dark:bg-[#1f1e21] border border-[var(--surface-border)] px-3.5 py-2 rounded-2xl rounded-tl-none w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] ml-1">Thinking...</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-1.5 bg-stone-50 dark:bg-[#19191c] border-t border-[var(--surface-border)] flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
            <button
              onClick={() => {
                setInput("Can you explain how to practice English fluency daily?");
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#252429] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors"
            >
              Daily fluency tips
            </button>
            <button
              onClick={() => {
                setInput("What are common executive vocabulary words?");
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-[#252429] border border-[var(--surface-border)] hover:border-[#d4af37] text-[var(--text-muted)] hover:text-[#d4af37] transition-colors"
            >
              Executive vocabulary
            </button>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white dark:bg-[#141416] border-t border-[var(--surface-border)] flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a language question..."
              maxLength={1000}
              disabled={isLoading}
              className="flex-1 bg-stone-100 dark:bg-[#1f1e21] border border-[var(--surface-border)] focus:border-[#d4af37] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-xl bg-[#d4af37] hover:bg-[#b89528] disabled:opacity-40 disabled:hover:bg-[#d4af37] text-[#141416] flex items-center justify-center transition-all shrink-0"
              title="Send message"
            >
              <span className="material-symbols-outlined text-[17px]">send</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
