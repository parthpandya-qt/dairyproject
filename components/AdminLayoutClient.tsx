"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DairyLogo from "@/components/DairyLogo";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  logoutButton: React.ReactNode;
}

export default function AdminLayoutClient({
  children,
  logoutButton,
}: AdminLayoutClientProps) {
  const pathname = usePathname();

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "model" | "system"; content: string }>>([
    {
      role: "model",
      content: "Hello! I am your Dairy Flow Pro AI Copilot. How can I help you manage your customers, transactions, or bills today?",
    },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);



  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || inputVal;
    if (!messageText.trim()) return;

    if (!textToSend) {
      setInputVal("");
    }

    const newMessages = [...messages, { role: "user" as const, content: messageText }];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get response from AI Copilot.");
      }

      setMessages((prev) => [...prev, { role: "model", content: data.content }]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${err.message || "Something went wrong while connecting to the assistant."}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestions = [
    "List all my clients",
    "Show saved billing records",
    "Log daily deliveries",
    "Add new customer"
  ];

  const navLinks = [
    {
      href: "/admin",
      label: "Home",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 20H7C5.89543 20 5 19.1046 5 18V10.9199C5 10.336 5.25513 9.78132 5.69842 9.40136L10.6984 5.11564C11.4474 4.47366 12.5526 4.47366 13.3016 5.11564L18.3016 9.40136C18.7449 9.78132 19 10.336 19 10.9199V18C19 19.1046 18.1046 20 17 20H15M9 20V14C9 13.4477 9.44772 13 10 13H14C14.5523 13 15 13.4477 15 14V20M9 20H15" />
        </svg>
      )
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      href: "/admin/items",
      label: "Products Catalog",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )
    },
    {
      href: "/admin/transactions",
      label: "Daily Entries",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      href: "/admin/ledger",
      label: "Ledger",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      href: "/admin/reports",
      label: "Reports",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      href: "/admin/receipts",
      label: "Receipts",
      icon: (
        <svg className="w-4.5 h-4.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar Navigation */}
      <aside
        className="static translate-x-0 w-16 md:w-72 bg-[#0b0f19] text-white flex flex-col shadow-xl border-r border-slate-800/20 shrink-0"
      >
        <div className="p-3 md:p-6 flex-1 flex flex-col">
          {/* Header & Logo */}
          <div className="flex items-center justify-center md:justify-between mb-10">
            <h2 className="text-xl font-black text-emerald-400 tracking-tight flex items-center gap-2">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                <DairyLogo className="w-6 h-6" strokeWidth={2.5} />
              </span>
              <span className="hidden md:inline">Dairy Ledger Admin</span>
            </h2>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1.5 flex-1">
            {navLinks.map((link) => {
              // Exact match for admin home, startsWith for others
              const isActive =
                link.href === "/admin"
                   ? pathname === "/admin" || pathname === "/admin/"
                  : pathname?.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center justify-center md:justify-start gap-3 px-3 py-3 md:px-4 rounded-xl transition duration-155 font-bold text-xs tracking-wide uppercase ${
                    isActive
                      ? "bg-slate-800 text-white border border-slate-700/50"
                      : "text-slate-355 hover:text-white hover:bg-slate-850/80"
                  }`}
                >
                  {link.icon}
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Header bar */}
        <header className="bg-white border-b border-slate-200/60 px-4 md:px-8 py-4 shadow-sm flex items-center justify-between sticky top-0 z-30 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <h1 className="text-base md:text-xl font-black text-slate-800 tracking-tight">
              Dairy Management Center
            </h1>
          </div>
          {logoutButton}
        </header>

        {/* Page Content wrapper */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Footer */}
        <footer className="bg-white border-t border-slate-200/50 py-4 px-4 md:px-8 text-center text-xs font-semibold text-slate-400">
          © {new Date().getFullYear()} Dairy Management System • Designed to Industry Standards
        </footer>
      </div>

      {/* AI Copilot Chatbot Panel */}
      {chatOpen && (
        <>
          <style>{`
            @keyframes chatSlideUp {
              from {
                opacity: 0;
                transform: translateY(12px) scale(0.97);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            .animate-chat-open {
              animation: chatSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
          `}</style>
          <div className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[520px] bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-50 overflow-hidden text-slate-100 animate-chat-open origin-bottom-right no-print">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-900/95 via-slate-900/98 to-slate-950/95 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 font-black shadow-inner shadow-emerald-400/5">
                    🤖
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-md">
                    <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                    AI Copilot
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold tracking-tight">Active • Powered by Gemini & MCP</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Close button */}
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col max-w-[85%] ${m.role === "user" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  {m.role !== "user" && (
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1 block ml-1">
                      {m.role === "system" ? "System Log" : "Copilot"}
                    </span>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-sm ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-none shadow-md shadow-emerald-500/10 font-medium"
                        : m.role === "system"
                        ? "bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono rounded-bl-none"
                        : "bg-white/5 border border-white/10 text-slate-100 rounded-bl-none backdrop-blur-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex flex-col items-start gap-1 mr-auto max-w-[70%]">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1 block ml-1">
                    Copilot is typing
                  </span>
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-4 py-3.5 rounded-2xl rounded-bl-none">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions chips */}
            {messages.length === 1 && !isTyping && (
              <div className="px-4 py-3 border-t border-white/5 bg-slate-950/40 flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-350 hover:text-white rounded-xl text-[10px] font-bold transition duration-200 ease-out active:scale-95 cursor-pointer"
                  >
                    💡 {s}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Footer */}
            <div className="p-4 bg-slate-950/40 border-t border-white/5 flex gap-2.5 items-end">
              <textarea
                rows={1}
                placeholder="Ask copilot to perform actions..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all duration-200 resize-none min-h-[42px] max-h-[100px]"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isTyping || !inputVal.trim()}
                className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-600 disabled:from-slate-800 disabled:to-slate-800 disabled:opacity-40 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.5)] rounded-full flex items-center justify-center z-50 cursor-pointer transition transform active:scale-90 hover:scale-105 hover:-translate-y-1 no-print"
        title="AI Copilot Chatbot"
      >
        {chatOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
