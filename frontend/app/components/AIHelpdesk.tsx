"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, RefreshCw } from "lucide-react";
import { api } from "../utils/api";

interface AIHelpdeskProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIHelpdesk({ isOpen, onClose }: AIHelpdeskProps) {
  const [messages, setMessages] = useState<any[]>([
    { role: "assistant", content: "Namaste! I am your FinLit AI Assistant. I can help you understand stock market concepts, Indian tax laws (like LTCG/STCG), explain your investment scores, or answer any other questions you have. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const data = await api.chatWithAI(userMessage);
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + (err.message || "Failed to contact AI helper.") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#0d1324] border-l border-slate-800 shadow-2xl z-40 flex flex-col animate-pop-in">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600/10 p-2 rounded-lg border border-blue-500/20">
            <Bot className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block">AI Invest Helpdesk</span>
            <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">India Specific Guidance</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, idx) => {
          const isBot = m.role === "assistant";
          return (
            <div key={idx} className={`flex gap-3 ${isBot ? "" : "flex-row-reverse"}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                isBot 
                  ? "bg-blue-600/10 border-blue-500/20 text-blue-500" 
                  : "bg-slate-800 border-slate-700 text-slate-300"
              }`}>
                {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>
              <div className={`p-3.5 rounded-2xl max-w-[78%] text-xs leading-relaxed ${
                isBot 
                  ? "bg-[#111827] border border-slate-800/80 text-slate-200 rounded-tl-none" 
                  : "bg-blue-600 text-white rounded-tr-none"
              }`}>
                {m.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-600/10 border border-blue-500/20 text-blue-500 shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-[#111827] border border-slate-800/80 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
              <span>Analyzing market data...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/30">
        <div className="relative flex items-center">
          <input
            type="text"
            required
            disabled={loading}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about Nifty, tax treatment, trade score..."
            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
