import React, { useState, useEffect } from "react"
import "./style.css"
import { Sparkles, ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react"

function IndexPopup() {
  const [session, setSession] = useState<any>(null)
  const [dashboardUrl, setDashboardUrl] = useState("http://localhost:3000/dashboard/editor")
  const [homeUrl, setHomeUrl] = useState("http://localhost:3000")

  useEffect(() => {
    chrome.storage.local.get(["promptpilot_session", "promptpilot_api_url"], (res) => {
      if (res.promptpilot_session) {
        setSession(res.promptpilot_session)
      }
      if (res.promptpilot_api_url) {
        const baseOrigin = res.promptpilot_api_url.replace("/api/prompt/process", "")
        setDashboardUrl(`${baseOrigin}/dashboard/editor`)
        setHomeUrl(baseOrigin)
      }
    })
  }, [])

  return (
    <div className="w-[320px] bg-[#F8FAFC] text-slate-900 p-6 flex flex-col gap-5 border border-slate-200 rounded-2xl shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 font-bold text-base text-slate-900">
        <svg className="w-6 h-6" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="pGradExt" x1="50" y1="165" x2="160" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed"/>
              <stop offset="40%" stopColor="#2563eb"/>
              <stop offset="75%" stopColor="#06b6d4"/>
              <stop offset="100%" stopColor="#22d3ee"/>
            </linearGradient>
            <linearGradient id="speedGradExt" x1="10" y1="90" x2="70" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#7c3aed"/>
              <stop offset="100%" stopColor="#2563eb"/>
            </linearGradient>
          </defs>
          <rect x="42" y="75" width="28" height="10" rx="5" fill="url(#speedGradExt)"/>
          <rect x="15" y="95" width="18" height="10" rx="5" fill="#7c3aed"/>
          <rect x="38" y="95" width="32" height="10" rx="5" fill="#2563eb"/>
          <rect x="15" y="115" width="10" height="8" rx="4" fill="#1d4ed8"/>
          <rect x="29" y="115" width="18" height="8" rx="4" fill="#2563eb"/>
          <circle cx="85" cy="100" r="5" fill="#7c3aed"/>
          <circle cx="102" cy="100" r="5" fill="#3b82f6"/>
          <circle cx="119" cy="100" r="5" fill="#0ea5e9"/>
          <path d="M 70 42 H 125 C 158 42, 172 65, 172 90 C 172 115, 158 138, 125 138 H 80 C 70 138, 62 148, 58 165 C 61 146, 70 128, 76 114 H 125 C 140 114, 146 102, 146 90 C 146 78, 140 66, 125 66 H 70 C 63 66, 63 42, 70 42 Z" fill="url(#pGradExt)"/>
        </svg>
        <span>Prompt<span className="text-indigo-600">Pilot</span></span>
      </div>

      {/* Auth Status Notification */}
      {session ? (
        <div className="p-4 rounded-xl bg-white border border-slate-200 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs flex flex-col gap-1 leading-relaxed">
            <span className="font-bold text-slate-900">Active Connection</span>
            <span className="text-slate-600 truncate max-w-[200px]">{session.user?.email}</span>
            <span className="text-[10px] text-slate-500">Universal overlays are armed and ready to write.</span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs flex flex-col gap-1 leading-relaxed">
            <span className="font-bold text-slate-900">Authentication Required</span>
            <span className="text-slate-600">The extension is offline. Log in to your account dashboard to sync access.</span>
          </div>
        </div>
      )}

      {/* Call to Actions */}
      <div className="flex flex-col gap-2.5">
        <a
          href={dashboardUrl}
          target="_blank"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-start to-brand-mid hover:opacity-90 text-white text-xs font-bold transition-all shadow-sm"
        >
          <span>Open Web Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          href={homeUrl}
          target="_blank"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold transition-all shadow-sm"
        >
          <span>How to use</span>
        </a>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-500 border-t border-slate-100 pt-3">
        PromptPilot Extension v0.0.1
      </div>
    </div>
  )
}

export default IndexPopup
