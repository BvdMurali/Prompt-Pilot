import type { PlasmoCSConfig } from "plasmo";
import React, { useState, useEffect, useRef } from "react";
import styleText from "data-text:./style.css";
import { Sparkles, RefreshCw, Check, X, ArrowRight, BarChart2, Star } from "lucide-react";

// Configure Plasmo content script injection targets
export const config: PlasmoCSConfig = {
  matches: ["https://*/*", "http://*/*"],
  all_frames: true
};

// Inject styles into the Shadow DOM container
export const getStyle = () => {
  const style = document.createElement("style");
  style.textContent = styleText;
  return style;
};

export default function ContentScriptUI() {
  const [activeEl, setActiveEl] = useState<HTMLInputElement | HTMLTextAreaElement | HTMLElement | null>(null);
  const [showBubble, setShowBubble] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [inputText, setInputTextVal] = useState("");
  
  // Auth & API states
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // AI Results
  const [result, setResult] = useState<any>(null);
  const [activeVariation, setActiveVariation] = useState<number | null>(null);

  // Form selections
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("");
  const [platform, setPlatform] = useState("");

  const hideBubbleTimeout = useRef<NodeJS.Timeout | null>(null);

  // 1. Session Synchronizer and Global Focus Listeners
  useEffect(() => {
    // Read session from local storage
    chrome.storage.local.get(["promptpilot_session"], (res) => {
      if (res.promptpilot_session) {
        setSession(res.promptpilot_session);
      }
    });

    // Check if we are on PromptPilot dashboard to capture session (supports local and deployed Vercel apps)
    const isDashboard = 
      window.location.origin.includes("localhost:") || 
      window.location.origin.includes("vercel.app");

    if (isDashboard) {
      const handleSessionMessage = (event: MessageEvent) => {
        if (event.data?.type === "PROMPTPILOT_SESSION") {
          const newSession = event.data.session;
          setSession(newSession);
          if (newSession) {
            const apiUrl = `${window.location.origin}/api/prompt/process`;
            chrome.storage.local.set({ 
              promptpilot_session: newSession,
              promptpilot_api_url: apiUrl
            });
          } else {
            chrome.storage.local.remove(["promptpilot_session", "promptpilot_api_url"]);
          }
        }
      };
      window.addEventListener("message", handleSessionMessage);

      // Active request session from the dashboard (resolves startup race conditions)
      window.postMessage({ type: "PROMPTPILOT_REQUEST_SESSION" }, "*");

      // Also request it again after a short delay in case React is still initializing
      const timeoutId = setTimeout(() => {
        window.postMessage({ type: "PROMPTPILOT_REQUEST_SESSION" }, "*");
      }, 1000);

      return () => {
        window.removeEventListener("message", handleSessionMessage);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.getAttribute("contenteditable") === "true";
      
      if (!isInput) return;

      if (hideBubbleTimeout.current) {
        clearTimeout(hideBubbleTimeout.current);
      }

      setActiveEl(target);
      setShowBubble(true);
    };

    const handleBlur = () => {
      // Delay hiding to allow clicking the floating bubble
      hideBubbleTimeout.current = setTimeout(() => {
        if (!showModal) {
          setShowBubble(false);
        }
      }, 350);
    };

    document.addEventListener("focusin", handleFocus);
    document.addEventListener("focusout", handleBlur);

    return () => {
      document.removeEventListener("focusin", handleFocus);
      document.removeEventListener("focusout", handleBlur);
    };
  }, [showModal]);



  const getInputText = () => {
    if (!activeEl) return "";
    if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
      return (activeEl as HTMLInputElement).value;
    }
    return activeEl.innerText || "";
  };

  const setInputText = (text: string) => {
    if (!activeEl) return;
    if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
      (activeEl as HTMLInputElement).value = text;
    } else {
      activeEl.innerText = text;
    }
    // Dispatch input event for frameworks like React/Vue
    activeEl.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const handleAction = async (actionType: "optimize" | "rewrite") => {
    const originalText = inputText;
    if (!originalText.trim()) {
      setError("Please type some text first.");
      return;
    }

    if (!session) {
      setError("Please sign in to your dashboard at http://localhost:3000 to authenticate extension.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setActiveVariation(null);

    // Call API through background script proxy using dynamic URL matching session origin
    chrome.storage.local.get(["promptpilot_api_url"], (storageRes) => {
      const targetUrl = storageRes.promptpilot_api_url || "http://localhost:3000/api/prompt/process";

      chrome.runtime.sendMessage(
        {
          type: "PROMPTPILOT_API_REQUEST",
          payload: {
            url: targetUrl,
            method: "POST",
            token: session.access_token,
            body: {
              text: originalText,
              action: actionType,
              tone: tone || undefined,
              length: length || undefined,
              platform: platform || undefined
            }
          }
        },
        (res) => {
          setLoading(false);
          if (!res || !res.success) {
            setError(res?.error || "Failed to connect to API proxy service.");
            return;
          }

          const apiRes = res.result;
          if (!apiRes.ok) {
            setError(apiRes.data?.error || "Backend returned processing error.");
            return;
          }

          setResult(apiRes.data);
        }
      );
    });
  };

  const handleApply = () => {
    if (!result) return;
    const finalVal = activeVariation !== null ? result.variations[activeVariation] : result.improved_text;
    setInputText(finalVal);
    handleClose();
  };

  const handleClose = () => {
    setShowModal(false);
    setShowBubble(false);
    setResult(null);
    setError("");
  };

  if (!showBubble) return null;

  return (
    <div className="promptpilot-shadow-dom text-slate-100 font-sans">
      
      {/* FLOATING ACTION TRIGGER BUBBLE */}
      {!showModal && (
        <button
          onClick={() => {
            if (hideBubbleTimeout.current) clearTimeout(hideBubbleTimeout.current);
            setInputTextVal(getInputText());
            setShowModal(true);
          }}
          className="fixed bottom-6 right-6 z-[99999] flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 text-white border border-indigo-400/20 shadow-xl transition-all scale-100 active:scale-95"
        >
          <Sparkles className="w-5 h-5 text-white animate-pulse" />
        </button>
      )}

      {/* OVERLAY PANEL MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950/90 border border-slate-900 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <div className="w-6 h-6 rounded bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span>PromptPilot universal rewrite panel</span>
              </div>
              <button 
                onClick={handleClose}
                className="text-slate-450 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error notifications */}
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/40 text-xs text-red-400 rounded-lg flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* AI Result Comparison View */}
            {result ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before Draft */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Original Text</span>
                    <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-900 font-mono text-[11px] text-slate-400 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {inputText}
                    </div>
                  </div>

                  {/* After Output */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                      <span>Improved version</span>
                      {result.score?.overall && <span className="text-indigo-400 font-bold">Score: {result.score.overall}/100</span>}
                    </span>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {activeVariation !== null ? result.variations[activeVariation] : result.improved_text}
                    </div>
                  </div>
                </div>

                {/* Variations Carousel */}
                <div className="flex flex-col gap-1 border-t border-slate-900 pt-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Select Variation style</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveVariation(null)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        activeVariation === null
                          ? "border-indigo-500 bg-indigo-500/10 text-white"
                          : "border-slate-900 bg-slate-900/30 text-slate-400"
                      }`}
                    >
                      Default
                    </button>
                    {result.variations.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveVariation(idx)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                          activeVariation === idx
                            ? "border-indigo-500 bg-indigo-500/10 text-white"
                            : "border-slate-900 bg-slate-900/30 text-slate-400"
                        }`}
                      >
                        Option {String.fromCharCode(65 + idx)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply Actions */}
                <div className="flex gap-3 justify-end border-t border-slate-900 pt-4 mt-1">
                  <button
                    onClick={() => setResult(null)}
                    className="px-4 py-2 rounded-xl border border-slate-900 bg-slate-900/20 text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Adjust parameters
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-5 py-2 rounded-xl bg-indigo-650 hover:bg-indigo-550 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Insert Improved Text</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Settings & Options Setup Form */
              <div className="flex flex-col gap-5">
                {/* Input Text Area Dialogue Box */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Input / Prompt Draft</label>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputTextVal(e.target.value)}
                    placeholder="Type, edit or paste your prompt/text here..."
                    rows={4}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 outline-none resize-none font-mono leading-relaxed transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Tone Adjust</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="bg-slate-900 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="executive">Executive</option>
                      <option value="formal">Formal</option>
                      <option value="persuasive">Persuasive</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Length Adjust</label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="bg-slate-900 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="">Default Length</option>
                      <option value="shorten">Shorten</option>
                      <option value="expand">Expand</option>
                      <option value="summarize">Summarize</option>
                      <option value="simplify">Simplify</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Platform optimization</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="bg-slate-900 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="">General AI</option>
                      <option value="chatgpt">ChatGPT (GPT-4o)</option>
                      <option value="claude">Claude (Sonnet 3.5)</option>
                      <option value="gemini">Gemini (3.5 Flash)</option>
                    </select>
                  </div>
                </div>

                {/* CTA Action Triggers */}
                <div className="flex justify-between items-center border-t border-slate-900 pt-4 mt-1">
                  {!session && (
                    <span className="text-[10px] text-amber-500 font-semibold">
                      * Log in to Web App first to enable operations.
                    </span>
                  )}
                  <span />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction("rewrite")}
                      disabled={loading || !session}
                      className="px-4 py-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Rewrite text</span>
                    </button>
                    <button
                      onClick={() => handleAction("optimize")}
                      disabled={loading || !session}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Optimize Prompt</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
