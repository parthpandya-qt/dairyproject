"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DairyLogo from "@/components/DairyLogo";
import FormattedMessage from "@/components/FormattedMessage";

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
      window.dispatchEvent(new CustomEvent("dairy-db-update"));
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
    <div className="fixed inset-0 flex bg-slate-50/30">
      {/* Sidebar Navigation */}
      <aside
        className="static translate-x-0 w-16 md:w-72 bg-gradient-to-b from-[#0a0f1d] via-[#070b14] to-[#03060a] text-white flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.2)] border-r border-slate-800/30 shrink-0"
      >
        <div className="p-3 md:p-6 flex-1 flex flex-col justify-between">
          <div>
            {/* Header & Logo */}
            <div className="flex items-center justify-center md:justify-start gap-3 mb-12 mt-2 select-none">
              <span className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 rounded-2xl shadow-[inset_0_2px_4px_rgba(16,185,129,0.15)] border border-emerald-500/20 animate-pulse">
                <DairyLogo className="w-6 h-6" strokeWidth={2.5} />
              </span>
              <span className="hidden md:inline text-lg font-black bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent tracking-tight">
                DairyFlow Pro
              </span>
            </div>

            {/* Nav Links */}
            <nav className="space-y-1.5 flex-1">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/admin"
                     ? pathname === "/admin" || pathname === "/admin/"
                     : pathname?.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group flex items-center justify-center md:justify-start gap-3.5 px-3 py-3.5 md:px-4 rounded-2xl transition-all duration-300 font-bold text-xs tracking-wide uppercase relative overflow-hidden ${
                      isActive
                        ? "bg-gradient-to-r from-emerald-500/12 to-teal-500/6 text-emerald-400 border border-emerald-500/15 shadow-[0_2px_12px_rgba(16,185,129,0.04)]"
                        : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    {/* Active vertical glow indicator */}
                    {isActive && (
                      <span className="absolute left-0 top-3.5 bottom-3.5 w-1 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    )}
                    <div className={`transition-colors duration-300 ${isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-400"}`}>
                      {link.icon}
                    </div>
                    <span className="hidden md:inline transition-transform duration-300 group-hover:translate-x-1">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer branding */}
          <div className="hidden md:block border-t border-white/5 pt-4 mb-2 select-none">
            <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Enterprise Ledger</p>
            <p className="text-[9px] text-slate-600 mt-0.5 font-bold">v1.2.5 • Active Secure</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top Header bar */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/40 px-4 md:px-8 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.015)] flex items-center justify-between sticky top-0 z-35">
          <div className="flex items-center gap-3 select-none">
            <h1 className="text-base md:text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Dairy Management Center
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center font-black text-xs shadow-[0_2px_8px_rgba(16,185,129,0.2)] select-none border border-emerald-400/20">
              P
            </div>
            {logoutButton}
          </div>
        </header>

        {/* Page Content wrapper */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50/30">
          {children}
        </main>

        {/* Bottom Footer */}
        <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200/20 py-4 px-4 md:px-8 text-center text-[10px] font-semibold text-slate-400 select-none">
          © {new Date().getFullYear()} DairyFlow Pro • Enterprise Livestock & Distribution Systems
        </footer>
      </div>

      {/* AI Copilot Chatbot Panel */}
      {chatOpen && (
        <>
          <style>{`
            @keyframes chatSlideUp {
              from {
                opacity: 0;
                transform: translateY(16px) scale(0.96);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            .animate-chat-open {
              animation: chatSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="fixed bottom-24 right-6 w-96 md:w-[440px] max-w-[calc(100vw-3rem)] h-[540px] bg-slate-950/92 backdrop-blur-3xl border border-white/10 rounded-[24px] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.06)] z-50 overflow-hidden text-slate-100 animate-chat-open origin-bottom-right no-print">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/5 flex items-center justify-between select-none">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 font-black shadow-inner">
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
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all cursor-pointer"
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
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1 block ml-1 select-none">
                      {m.role === "system" ? "System Log" : "Copilot"}
                    </span>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-tr-none shadow-md shadow-emerald-500/10 font-semibold whitespace-pre-wrap"
                        : m.role === "system"
                        ? "bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono rounded-tl-none whitespace-pre-wrap"
                        : "bg-white/5 border border-white/8 text-slate-100 rounded-tl-none backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                    }`}
                  >
                    <FormattedMessage content={m.content} role={m.role} />
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex flex-col items-start gap-1 mr-auto max-w-[70%]">
                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1 block ml-1 select-none">
                    Copilot is typing
                  </span>
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/8 px-4 py-3.5 rounded-2xl rounded-tl-none">
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
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-300 hover:text-white rounded-xl text-[10px] font-bold transition duration-200 ease-out active:scale-95 cursor-pointer"
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
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.55)] rounded-full flex items-center justify-center z-50 cursor-pointer transition-all duration-300 transform active:scale-90 hover:scale-105 hover:-translate-y-1 no-print"
        title="AI Copilot Chatbot"
      >
        {chatOpen ? (
          <svg className="w-6 h-6 animate-[spin_0.2s_ease-out]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
