import type { PlasmoCSConfig } from "plasmo";
import React, { useState, useEffect, useRef } from "react";
import styleText from "data-text:./style.css";
import { Sparkles, RefreshCw, Check, X, BarChart2, Star, Minus, MessageSquare, XCircle, RotateCcw, TrendingUp, Brain, Target, Shield, FileSearch, Gauge, Info } from "lucide-react";

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

// ─── V2 Types (mirrored from ai.ts — extension can't import server lib) ────────
type V2Status = 'optimized' | 'needs_clarification' | 'rejected';

interface AIResultV2 {
  status: V2Status;
  confidence: number;
  intent?: string;
  domain?: string;
  optimized_text?: string;
  variations?: string[];
  score?: {
    overall: { score: number; reason: string } | number;
    clarity?: { score: number; reason: string } | number;
    context?: { score: number; reason: string } | number;
    constraints?: { score: number; reason: string } | number;
    structure?: { score: number; reason: string } | number;
    specificity?: { score: number; reason: string } | number;
  };
  improvements?: string[];
  explanations?: { action: string; why: string; how: string }[];
  suggestions?: string[];
  questions?: string[];
  reason?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function scoreNum(s: { score: number; reason: string } | number | undefined): number {
  if (!s) return 0;
  if (typeof s === 'number') return s;
  return s.score;
}

function getConfidenceStyle(val: number): string {
  if (val >= 75) return 'color: #059669; background: #ecfdf5; border-color: #a7f3d0;';
  if (val >= 50) return 'color: #d97706; background: #fffbeb; border-color: #fcd34d;';
  return 'color: #dc2626; background: #fef2f2; border-color: #fca5a5;';
}

// ─── Pipeline Stage Config ────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { label: 'Intent',     description: 'Detecting request type' },
  { label: 'Domain',     description: 'Identifying knowledge domain' },
  { label: 'Ambiguity',  description: 'Checking for unclear terms' },
  { label: 'Context',    description: 'Evaluating information sufficiency' },
  { label: 'Safety',     description: 'Running content policy check' },
  { label: 'Confidence', description: 'Calculating optimization score' },
];

export default function ContentScriptUI() {
  const [activeEl, setActiveEl] = useState<HTMLInputElement | HTMLTextAreaElement | HTMLElement | null>(null);
  const [inputText, setInputTextVal] = useState("");

  // Auth & API states
  const [session, setSession] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState<"rewrite" | "optimize" | null>(null);
  const [pipelineStage, setPipelineStage] = useState(0);
  const [error, setError] = useState("");

  // V2 Results
  const [result, setResult] = useState<AIResultV2 | null>(null);
  const [activeVariation, setActiveVariation] = useState<number | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);

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

  // 1. Session Synchronizer
  useEffect(() => {
    chrome.storage.local.get(["promptpilot_session"], (res) => {
      if (res.promptpilot_session) {
        setSession(res.promptpilot_session);
      }
    });

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
      window.postMessage({ type: "PROMPTPILOT_REQUEST_SESSION" }, "*");
      const timeoutId = setTimeout(() => {
        window.postMessage({ type: "PROMPTPILOT_REQUEST_SESSION" }, "*");
      }, 1000);
      return () => {
        window.removeEventListener("message", handleSessionMessage);
        clearTimeout(timeoutId);
      };
    }
  }, []);

  // 2. Global Focus Listeners
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.getAttribute("contenteditable") === "true";
      if (isInput) setActiveEl(target);
    };
    document.addEventListener("focusin", handleFocus);
    return () => document.removeEventListener("focusin", handleFocus);
  }, []);

  // 3. Dragging mechanics
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        if (Math.abs(newX - position.x) > 3 || Math.abs(newY - position.y) > 3) {
          hasDragged.current = true;
        }
        const buttonSize = 40;
        const boundedX = Math.max(10, Math.min(window.innerWidth - buttonSize - 10, newX));
        const boundedY = Math.max(10, Math.min(window.innerHeight - buttonSize - 10, newY));
        setPosition({ x: boundedX, y: boundedY });
      } else if (isDraggingModal.current) {
        const newX = e.clientX - modalDragStart.current.x;
        const newY = e.clientY - modalDragStart.current.y;
        const modalWidth = Math.min(672, window.innerWidth - 40);
        const boundedX = Math.max(10, Math.min(window.innerWidth - modalWidth - 10, newX));
        const boundedY = Math.max(10, Math.min(window.innerHeight - 450 - 10, newY));
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

  // 4. Keep in bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const buttonSize = 40;
        return {
          x: Math.max(10, Math.min(window.innerWidth - buttonSize - 10, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - buttonSize - 10, prev.y))
        };
      });
      setModalPosition((prev) => {
        if (prev.x === -1) return prev;
        const modalWidth = Math.min(672, window.innerWidth - 40);
        return {
          x: Math.max(10, Math.min(window.innerWidth - modalWidth - 10, prev.x)),
          y: Math.max(10, Math.min(window.innerHeight - 450 - 10, prev.y))
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 5. Center modal on first open
  useEffect(() => {
    if (showModal && modalPosition.x === -1) {
      const modalWidth = Math.min(672, window.innerWidth - 40);
      setModalPosition({ x: (window.innerWidth - modalWidth) / 2, y: 100 });
    }
  }, [showModal, modalPosition]);

  // 6. Keyboard event isolation
  useEffect(() => {
    const stopPropagation = (e: KeyboardEvent) => e.stopPropagation();
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

  // 7. Recover modal state from storage
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

  // 8. Auto-save modal state
  useEffect(() => {
    if (!isLoaded) return;
    if (showModal) {
      chrome.storage.local.set({
        promptpilot_modal_state: { inputText, showModal, isMinimized, modalPosition, tone, length, platform, result }
      });
    } else {
      chrome.storage.local.remove(["promptpilot_modal_state"]);
    }
  }, [isLoaded, inputText, showModal, isMinimized, modalPosition, tone, length, platform, result]);

  // 9. Pipeline stage animator while loading
  useEffect(() => {
    if (!loadingAction) { setPipelineStage(0); return; }
    let stage = 0;
    const interval = setInterval(() => {
      stage = Math.min(stage + 1, PIPELINE_STAGES.length - 1);
      setPipelineStage(stage);
    }, 800);
    return () => clearInterval(interval);
  }, [loadingAction]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
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
    activeEl.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const sendApiRequest = (body: object, onResult: (data: AIResultV2) => void, onError: (msg: string) => void) => {
    chrome.storage.local.get(["promptpilot_api_url"], (storageRes) => {
      const targetUrl = storageRes.promptpilot_api_url || "http://localhost:3000/api/prompt/process";
      chrome.runtime.sendMessage(
        {
          type: "PROMPTPILOT_API_REQUEST",
          payload: { url: targetUrl, method: "POST", token: session.access_token, body }
        },
        (res) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            onError(`Extension Error: ${lastError.message}. Please reload the extension on chrome://extensions and refresh this tab.`);
            return;
          }
          if (!res || !res.success) {
            onError(res?.error || "Failed to connect to API proxy service.");
            return;
          }
          const apiRes = res.result;
          if (!apiRes.ok) {
            onError(apiRes.data?.error || "Backend returned processing error.");
            return;
          }
          onResult(apiRes.data as AIResultV2);
        }
      );
    });
  };

  // ─── Action Handlers ─────────────────────────────────────────────────────────
  const handleAction = async (actionType: "optimize" | "rewrite") => {
    const originalText = inputText;
    if (!originalText.trim()) { setError("Please type some text first."); return; }
    if (!session) {
      setError("Please sign in to your dashboard at http://localhost:3000 to authenticate extension.");
      return;
    }

    setLoadingAction(actionType);
    setError("");
    setResult(null);
    setActiveVariation(null);
    setClarificationAnswers([]);

    sendApiRequest(
      { text: originalText, action: actionType, tone: tone || undefined, length: length || undefined, platform: platform || undefined, version: 'v2' },
      (data) => { setResult(data); setLoadingAction(null); },
      (msg) => { setError(msg); setLoadingAction(null); }
    );
  };

  const handleReoptimizeWithAnswers = (actionType: "optimize" | "rewrite") => {
    if (!result?.questions) return;
    const clarificationContext = result.questions
      .map((q, i) => `Q: ${q}\nA: ${clarificationAnswers[i] || '(not answered)'}`)
      .join('\n\n');
    const enrichedText = `${inputText}\n\n--- Clarification Context ---\n${clarificationContext}`;

    setLoadingAction(actionType);
    setError("");
    setResult(null);
    setActiveVariation(null);

    sendApiRequest(
      { text: enrichedText, action: actionType, tone: tone || undefined, length: length || undefined, platform: platform || undefined, version: 'v2' },
      (data) => { setResult(data); setLoadingAction(null); },
      (msg) => { setError(msg); setLoadingAction(null); }
    );
  };

  const handleApply = () => {
    if (!result || result.status !== 'optimized') return;
    const finalVal = activeVariation !== null
      ? (result.variations?.[activeVariation] ?? result.optimized_text ?? '')
      : (result.optimized_text ?? '');
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
    if (target.closest("button") || target.closest("select") || target.closest("textarea")) return;
    isDraggingModal.current = true;
    modalDragStart.current = { x: e.clientX - modalPosition.x, y: e.clientY - modalPosition.y };
    e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    isDragging.current = true;
    hasDragged.current = false;
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  };

  // Last used action for re-optimize
  const [lastAction, setLastAction] = useState<"optimize" | "rewrite">("optimize");

  const fireAction = (actionType: "optimize" | "rewrite") => {
    setLastAction(actionType);
    handleAction(actionType);
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
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >
          <Sparkles className="w-5 h-5 text-white animate-pulse pointer-events-none" />
        </button>
      )}

      {/* MINIMIZED STATE */}
      {showModal && isMinimized && (
        <div
          onMouseDown={handleModalMouseDown}
          className="fixed z-[999999] bg-white border border-slate-200 rounded-xl shadow-2xl p-3 flex items-center gap-4 cursor-move select-none animate-in fade-in zoom-in-95 duration-150"
          style={{ left: `${modalPosition.x}px`, top: `${modalPosition.y}px` }}
        >
          <div className="flex items-center gap-2 pointer-events-none">
            <div className="w-5 h-5 rounded bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#06B6D4] flex items-center justify-center shadow">
              <Sparkles className="w-3 h-3 text-white animate-pulse" />
            </div>
            <span className="text-xs font-bold text-slate-900">PromptPilot (Minimized)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setIsMinimized(false)}
              className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-[10px] font-bold transition-all active:scale-95">
              Restore
            </button>
            <button onClick={handleClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY PANEL MODAL - ACTIVE STATE */}
      {showModal && !isMinimized && (
        <div
          className="fixed z-[999999] w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900"
          style={{ left: `${modalPosition.x}px`, top: `${modalPosition.y}px` }}
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
              <span>PromptPilot V2 — Universal Panel</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMinimized(true)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-all" title="Minimize">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={handleClose}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-all" title="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-700 rounded-lg flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {/* ─── LOADING: Pipeline Stepper ─────────────────────────────── */}
          {loadingAction && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-violet-600" />
                V2 Intelligence Pipeline Running
              </p>
              {PIPELINE_STAGES.map((stage, idx) => {
                const isActive = idx === pipelineStage;
                const isDone = idx < pipelineStage;
                return (
                  <div key={stage.label}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      isActive ? 'bg-violet-50 border border-violet-200' :
                      isDone  ? 'bg-emerald-50 border border-emerald-100' :
                                 'bg-slate-50 border border-slate-100 opacity-40'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isActive ? 'bg-violet-600' : isDone ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}>
                      {isDone
                        ? <Check className="w-2.5 h-2.5 text-white" />
                        : isActive
                        ? <RefreshCw className="w-2.5 h-2.5 text-white animate-spin" />
                        : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      }
                    </div>
                    <span className={`font-semibold ${isActive ? 'text-violet-800' : isDone ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="text-violet-500 ml-1">{stage.description}…</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── RESULT: Clarification ─────────────────────────────────── */}
          {!loadingAction && result?.status === 'needs_clarification' && (
            <div className="flex flex-col gap-3">
              {/* Header */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 mb-0.5">More context needed</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    The V2 pipeline needs more info before it can optimize safely.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border flex-shrink-0"
                  style={{ ...Object.fromEntries(getConfidenceStyle(result.confidence).split(';').filter(Boolean).map(s => s.split(':').map(x => x.trim()) as [string, string])) }}>
                  {result.confidence}%
                </span>
              </div>

              {/* Tags */}
              {(result.intent || result.domain) && (
                <div className="flex gap-2 flex-wrap">
                  {result.intent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-700">
                      Intent: {result.intent}
                    </span>
                  )}
                  {result.domain && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                      Domain: {result.domain}
                    </span>
                  )}
                </div>
              )}

              {/* Questions */}
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {(result.questions || []).map((question, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm">
                    <p className="text-[11px] font-semibold text-slate-800 flex items-start gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-violet-700 mt-0.5">
                        {idx + 1}
                      </span>
                      {question}
                    </p>
                    <textarea
                      value={clarificationAnswers[idx] || ''}
                      onChange={(e) => {
                        const updated = [...clarificationAnswers];
                        updated[idx] = e.target.value;
                        setClarificationAnswers(updated);
                      }}
                      placeholder="Your answer…"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 placeholder-slate-400 outline-none resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Re-optimize CTA */}
              <button
                onClick={() => handleReoptimizeWithAnswers(lastAction)}
                disabled={clarificationAnswers.every(a => !a?.trim())}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#4f46e5] hover:opacity-90 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Answer & Re-optimize
              </button>

              <button onClick={() => setResult(null)}
                className="w-full py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-semibold hover:bg-slate-50">
                Back to input
              </button>
            </div>
          )}

          {/* ─── RESULT: Rejected ──────────────────────────────────────── */}
          {!loadingAction && result?.status === 'rejected' && (
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-red-900 mb-1">Request could not be processed</p>
                  <p className="text-[11px] text-red-700 leading-relaxed">
                    {result.reason || 'This request contains content that violates our usage policy.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setResult(null); setError(""); }}
                className="w-full py-2.5 rounded-xl border border-red-200 bg-white text-red-700 text-xs font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear & retry
              </button>
            </div>
          )}

          {/* ─── RESULT: Optimized ─────────────────────────────────────── */}
          {!loadingAction && result?.status === 'optimized' && (
            <div className="flex flex-col gap-4">
              {/* V2 meta tags */}
              {(result.intent || result.domain || result.confidence != null) && (
                <div className="flex gap-2 flex-wrap">
                  {result.intent && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-50 border border-violet-200 text-violet-700">
                      {result.intent}
                    </span>
                  )}
                  {result.domain && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700">
                      {result.domain}
                    </span>
                  )}
                  {result.confidence != null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                      {result.confidence}% confidence
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Before */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Original Text</span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-600 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {inputText}
                  </div>
                </div>

                {/* After */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-between">
                    <span>Improved Version</span>
                    {result.score?.overall != null && (
                      <span className="text-brand-start font-bold">Score: {scoreNum(result.score.overall)}/100</span>
                    )}
                  </span>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap shadow-inner">
                    {activeVariation !== null ? result.variations?.[activeVariation] : result.optimized_text}
                  </div>
                </div>
              </div>

              {/* Improvements */}
              {result.improvements && result.improvements.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Improvements Made</span>
                  <div className="flex flex-wrap gap-1.5">
                    {result.improvements.map((imp, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium">
                        {imp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Variations */}
              {result.variations && result.variations.length > 0 && (
                <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500">Select Variation</span>
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
                      <button key={idx} onClick={() => setActiveVariation(idx)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                          activeVariation === idx
                            ? "border-brand-start bg-brand-start/10 text-brand-start"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}>
                        Option {String.fromCharCode(65 + idx)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply / Adjust */}
              <div className="flex gap-3 justify-end border-t border-slate-100 pt-4 mt-1">
                <button onClick={() => setResult(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold">
                  Adjust parameters
                </button>
                <button onClick={handleApply}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Check className="w-3.5 h-3.5" />
                  Insert Improved Text
                </button>
              </div>
            </div>
          )}

          {/* ─── INPUT FORM (default state when no result & not loading) ── */}
          {!loadingAction && !result && (
            <div className="flex flex-col gap-5">
              {/* Input */}
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
                  <select value={tone} onChange={(e) => setTone(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-start/50 focus:ring-1">
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
                  <select value={length} onChange={(e) => setLength(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-start/50 focus:ring-1">
                    <option value="">Default Length</option>
                    <option value="shorten">Shorten</option>
                    <option value="expand">Expand</option>
                    <option value="summarize">Summarize</option>
                    <option value="simplify">Simplify</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Platform</label>
                  <select value={platform} onChange={(e) => setPlatform(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-brand-start/50 focus:ring-1">
                    <option value="">General AI</option>
                    <option value="chatgpt">ChatGPT (GPT-4o)</option>
                    <option value="claude">Claude (Sonnet 3.5)</option>
                    <option value="gemini">Gemini (2.5 Flash)</option>
                  </select>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex justify-between items-center border-t border-slate-100 pt-4 mt-1">
                {!session && (
                  <span className="text-[10px] text-amber-600 font-semibold">
                    * Log in to Web App first to enable operations.
                  </span>
                )}
                <span />
                <div className="flex gap-3">
                  <button
                    onClick={() => fireAction("rewrite")}
                    disabled={loadingAction !== null || !session}
                    className="px-4 py-2 rounded-xl border border-brand-start/20 bg-brand-start/5 hover:bg-brand-start/10 text-brand-start text-xs font-bold disabled:opacity-50 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Rewrite text</span>
                  </button>
                  <button
                    onClick={() => fireAction("optimize")}
                    disabled={loadingAction !== null || !session}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
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
