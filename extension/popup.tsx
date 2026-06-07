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
    <div className="w-[320px] bg-slate-950 text-slate-100 p-6 flex flex-col gap-5 border border-slate-900 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 font-bold text-base text-white">
        <div className="w-6 h-6 rounded bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span>Prompt<span className="text-indigo-400">Pilot</span></span>
      </div>

      {/* Auth Status Notification */}
      {session ? (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-450 mt-0.5 flex-shrink-0" />
          <div className="text-xs flex flex-col gap-1 leading-relaxed">
            <span className="font-bold text-white">Active Connection</span>
            <span className="text-slate-400 truncate max-w-[200px]">{session.user?.email}</span>
            <span className="text-[10px] text-slate-500">Universal overlays are armed and ready to write.</span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-950/30 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-xs flex flex-col gap-1 leading-relaxed">
            <span className="font-bold text-white">Authentication Required</span>
            <span className="text-slate-405">The extension is offline. Log in to your account dashboard to sync access.</span>
          </div>
        </div>
      )}

      {/* Call to Actions */}
      <div className="flex flex-col gap-2.5">
        <a
          href={dashboardUrl}
          target="_blank"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 hover:bg-indigo-550 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/10"
        >
          <span>Open Web Dashboard</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <a
          href={homeUrl}
          target="_blank"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold transition-all"
        >
          <span>How to use</span>
        </a>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 border-t border-slate-900 pt-3">
        PromptPilot Extension v0.0.1
      </div>
    </div>
  )
}

export default IndexPopup
