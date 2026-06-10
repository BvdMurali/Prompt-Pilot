import type { PlasmoCSConfig } from "plasmo";
import React, { useState, useEffect, useRef } from "react";
import styleText from "data-text:./style.css";
import { Sparkles, RefreshCw, Check, X, ArrowRight, BarChart2, Star, Minus } from "lucide-react";

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
  const [inputText, setInputTextVal] = useState("");
  
  // Auth & API states
  const [session, setSession] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState<"rewrite" | "optimize" | null>(null);
  const [error, setError] = useState("");
  
  // AI Results
  const [result, setResult] = useState<any>(null);
  const [activeVariation, setActiveVariation] = useState<number | null>(null);

  // Form selections
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("");
  const [platform, setPlatform] = useState("");

  // Position and drag states for floating action button
  const [position, setPosition] = useState({
    x: typeof window !== "undefined" ? window.innerWidth - 64 : 500,
    y: typeof window !== "undefined" ? window.innerHeight - 64 : 500
  });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Modal drag & minimize states
  const [showModal, setShowModal] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: -1, y: -1 });
  const isDraggingModal = useRef(false);
  const modalDragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

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
      
      if (isInput) {
        setActiveEl(target);
      }
    };

    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("focusin", handleFocus);
    };
  }, []);

  // Handle dragging mechanics and constraint bounds
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        
        // Check if it's a drag or a click
        if (Math.abs(newX - position.x) > 3 || Math.abs(newY - position.y) > 3) {
          hasDragged.current = true;
        }

        // Constrain inside viewport boundaries
        const buttonSize = 40;
        const boundedX = Math.max(10, Math.min(window.innerWidth - buttonSize - 10, newX));
        const boundedY = Math.max(10, Math.min(window.innerHeight - buttonSize - 10, newY));

        setPosition({ x: boundedX, y: boundedY });
      } else if (isDraggingModal.current) {
        const newX = e.clientX - modalDragStart.current.x;
        const newY = e.clientY - modalDragStart.current.y;

        const modalWidth = Math.min(672, window.innerWidth - 40);
        const modalHeight = 450; // estimated height

        // Constrain inside viewport boundaries
        const boundedX = Math.max(10, Math.min(window.innerWidth - modalWidth - 10, newX));
        const boundedY = Math.max(10, Math.min(window.innerHeight - modalHeight - 10, newY));

        setModalPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      isDraggingModal.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [position, modalPosition]);

  // Keep inside bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const buttonSize = 40;
        const boundedX = Math.max(10, Math.min(window.innerWidth - buttonSize - 10, prev.x));
        const boundedY = Math.max(10, Math.min(window.innerHeight - buttonSize - 10, prev.y));
        return { x: boundedX, y: boundedY };
      });
      setModalPosition((prev) => {
        if (prev.x === -1) return prev;
        const modalWidth = Math.min(672, window.innerWidth - 40);
        const modalHeight = 450;
        const boundedX = Math.max(10, Math.min(window.innerWidth - modalWidth - 10, prev.x));
        const boundedY = Math.max(10, Math.min(window.innerHeight - modalHeight - 10, prev.y));
        return { x: boundedX, y: boundedY };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Center modal initially on open
  useEffect(() => {
    if (showModal && modalPosition.x === -1) {
      const modalWidth = Math.min(672, window.innerWidth - 40);
      setModalPosition({
        x: (window.innerWidth - modalWidth) / 2,
        y: 100
      });
    }
  }, [showModal, modalPosition]);

  // Intercept and stop propagation of keyboard events to prevent affecting host webpage
  useEffect(() => {
    const stopPropagation = (e: KeyboardEvent) => {
      e.stopPropagation();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("keydown", stopPropagation, true);
      container.addEventListener("keyup", stopPropagation, true);
      container.addEventListener("keypress", stopPropagation, true);
    }

    return () => {
      if (container) {
        container.removeEventListener("keydown", stopPropagation, true);
        container.removeEventListener("keyup", stopPropagation, true);
        container.removeEventListener("keypress", stopPropagation, true);
      }
    };
  }, []);

  // Recover modal state from chrome.storage.local on mount
  useEffect(() => {
    chrome.storage.local.get(["promptpilot_modal_state"], (res) => {
      if (res.promptpilot_modal_state) {
        const state = res.promptpilot_modal_state;
        if (state.inputText !== undefined) setInputTextVal(state.inputText);
        if (state.showModal !== undefined) setShowModal(state.showModal);
        if (state.isMinimized !== undefined) setIsMinimized(state.isMinimized);
        if (state.modalPosition !== undefined) setModalPosition(state.modalPosition);
        if (state.tone !== undefined) setTone(state.tone);
        if (state.length !== undefined) setLength(state.length);
        if (state.platform !== undefined) setPlatform(state.platform);
        if (state.result !== undefined) setResult(state.result);
      }
      setIsLoaded(true);
    });
  }, []);

  // Auto-save modal state to chrome.storage.local on changes
  useEffect(() => {
    if (!isLoaded) return;

    if (showModal) {
      chrome.storage.local.set({
        promptpilot_modal_state: {
          inputText,
          showModal,
          isMinimized,
          modalPosition,
          tone,
          length,
          platform,
          result
        }
      });
    } else {
      chrome.storage.local.remove(["promptpilot_modal_state"]);
    }
  }, [isLoaded, inputText, showModal, isMinimized, modalPosition, tone, length, platform, result]);



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

    setLoadingAction(actionType);
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
          setLoadingAction(null);
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            setError(`Extension Error: ${lastError.message}. Please reload the extension on chrome://extensions page and refresh this tab.`);
            return;
          }
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
    setIsMinimized(false);
    setResult(null);
    setError("");
    chrome.storage.local.remove(["promptpilot_modal_state"]);
  };

  const handleModalMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("select") || target.closest("textarea")) {
      return;
    }
    isDraggingModal.current = true;
    modalDragStart.current = {
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    };
    e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    e.preventDefault();
  };

  return (
    <div ref={containerRef} className="promptpilot-shadow-dom text-slate-900 font-sans">
      
      {/* FLOATING ACTION TRIGGER BUBBLE */}
      {!showModal && (
        <button
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (hasDragged.current) return;
            setInputTextVal(getInputText());
            setShowModal(true);
          }}
          className="fixed z-[99999] flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#06B6D4] hover:opacity-90 text-white border border-white/20 shadow-xl transition-all scale-100 cursor-move active:scale-95 select-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`
          }}
        >
          <Sparkles className="w-5 h-5 text-white animate-pulse pointer-events-none" />
        </button>
      )}

      {/* OVERLAY PANEL MODAL - MINIMIZED STATE */}
      {showModal && isMinimized && (
        <div
          onMouseDown={handleModalMouseDown}
          className="fixed z-[999999] bg-white border border-slate-200 rounded-xl shadow-2xl p-3 flex items-center gap-4 cursor-move select-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${modalPosition.x}px`,
            top: `${modalPosition.y}px`
          }}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="w-5 h-5 rounded bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#06B6D4] flex items-center justify-center shadow">
              <Sparkles className="w-3 h-3 text-white animate-pulse" />
            </div>
            <span className="text-xs font-bold text-slate-900">PromptPilot (Minimized)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized(false)}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-[10px] font-bold transition-all active:scale-95"
            >
              Restore
            </button>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY PANEL MODAL - ACTIVE STATE */}
      {showModal && !isMinimized && (
        <div 
          className="fixed z-[999999] w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900"
          style={{
            left: `${modalPosition.x}px`,
            top: `${modalPosition.y}px`
          }}
        >
          
          {/* Modal Header */}
          <div 
            onMouseDown={handleModalMouseDown}
            className="flex justify-between items-center border-b border-slate-100 pb-3 cursor-move select-none"
          >
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm pointer-events-none">
              <div className="w-6 h-6 rounded bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#06B6D4] flex items-center justify-center shadow">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span>PromptPilot universal rewrite panel</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMinimized(true)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-all"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button 
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

            {/* Error notifications */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-700 rounded-lg flex items-center gap-2">
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
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {inputText}
                    </div>
                  </div>

                  {/* After Output */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                      <span>Improved version</span>
                      {result.score?.overall && <span className="text-brand-start font-bold">Score: {result.score.overall}/100</span>}
                    </span>
                    <div className="p-3 rounded-xl bg-white border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap shadow-inner">
                      {activeVariation !== null ? result.variations[activeVariation] : result.improved_text}
                    </div>
                  </div>
                </div>

                {/* Variations Carousel */}
                <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Select Variation style</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveVariation(null)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        activeVariation === null
                          ? "border-brand-start bg-brand-start/10 text-brand-start"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
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
                            ? "border-brand-start bg-brand-start/10 text-brand-start"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Option {String.fromCharCode(65 + idx)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply Actions */}
                <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-1">
                  <button
                    onClick={() => setResult(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold"
                  >
                    Adjust parameters
                  </button>
                  <button
                    onClick={handleApply}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
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
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 outline-none resize-none font-mono leading-relaxed transition-all focus:border-brand-start/50 focus:ring-1 focus:ring-brand-start/20"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Tone Adjust</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-start/50 focus:ring-1"
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
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-start/50 focus:ring-1"
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
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-start/50 focus:ring-1"
                    >
                      <option value="">General AI</option>
                      <option value="chatgpt">ChatGPT (GPT-4o)</option>
                      <option value="claude">Claude (Sonnet 3.5)</option>
                      <option value="gemini">Gemini (3.5 Flash)</option>
                    </select>
                  </div>
                </div>

                {/* CTA Action Triggers */}
                <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-1">
                  {!session && (
                    <span className="text-[10px] text-amber-600 font-semibold">
                      * Log in to Web App first to enable operations.
                    </span>
                  )}
                  <span />
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction("rewrite")}
                      disabled={loadingAction !== null || !session}
                      className="px-4 py-2 rounded-xl border border-brand-start/20 bg-brand-start/5 hover:bg-brand-start/10 text-brand-start text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {loadingAction === "rewrite" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Rewrite text</span>
                    </button>
                    <button
                      onClick={() => handleAction("optimize")}
                      disabled={loadingAction !== null || !session}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      {loadingAction === "optimize" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>Optimize Prompt</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

        </div>
      )}
    </div>
  );
}
