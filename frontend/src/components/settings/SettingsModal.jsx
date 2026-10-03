import React, { useState } from "react";
import { 
  X, 
  Settings, 
  Globe, 
  Monitor, 
  Gamepad2, 
  Sun, 
  Moon, 
  RefreshCw, 
  Zap, 
  Sliders, 
  LayoutGrid, 
  List, 
  Check, 
  ShieldAlert,
  Terminal
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";

function SettingsModal({ isOpen, onClose, onOpenDevModal }) {
  const { theme, setTheme, platform, setPlatform, serverLocation, setServerLocation } = useTheme();
  const { 
    autoRefreshInterval, 
    setAutoRefreshInterval, 
    defaultMinDealScore, 
    setDefaultMinDealScore, 
    itemsPerPage, 
    setItemsPerPage, 
    layoutMode, 
    setLayoutMode
  } = useSettings();

  const [activeTab, setActiveTab] = useState("realm");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#121218] border border-[#c5a059]/40 text-[#e0d8c3] shadow-2xl rounded-none relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Gold Decorative Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>

        {/* Modal Header */}
        <div className="p-4 md:p-6 border-b border-[#2a2c33] flex items-center justify-between bg-[#0a0a0d]">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-[#161620] border border-[#c5a059]/50 flex items-center justify-center text-[#c5a059]">
              <Settings className="size-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-cinzel text-lg md:text-xl font-bold tracking-wider text-[#d4af37]">
                SYSTEM & PLATFORM SETTINGS
              </h2>
              <p className="text-xs text-[#a89f91]">
                Configure regional market preferences, addon sync rules, and UI layout.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] border border-transparent hover:border-[#2a2c33] transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Main Body with Sidebar Tabs */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Tab Navigation Sidebar */}
          <div className="w-full md:w-48 bg-[#0d0d12] border-b md:border-b-0 md:border-r border-[#2a2c33] p-2 flex md:flex-col gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("realm")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "realm"
                  ? "bg-[#c5a059]/15 border-[#c5a059]/60 text-[#d4af37]"
                  : "border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]"
              }`}
            >
              <Globe className="size-4 text-[#c5a059]" />
              <span>Realm & Platform</span>
            </button>

            <button
              onClick={() => setActiveTab("display")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "display"
                  ? "bg-[#c5a059]/15 border-[#c5a059]/60 text-[#d4af37]"
                  : "border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]"
              }`}
            >
              <Sliders className="size-4 text-[#c5a059]" />
              <span>Display & Theme</span>
            </button>

            <button
              onClick={() => setActiveTab("sync")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "sync"
                  ? "bg-[#c5a059]/15 border-[#c5a059]/60 text-[#d4af37]"
                  : "border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]"
              }`}
            >
              <RefreshCw className="size-4 text-[#c5a059]" />
              <span>Addon & Sync</span>
            </button>

            <button
              onClick={() => setActiveTab("deals")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "deals"
                  ? "bg-[#c5a059]/15 border-[#c5a059]/60 text-[#d4af37]"
                  : "border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]"
              }`}
            >
              <Zap className="size-4 text-[#c5a059]" />
              <span>Deals & Alerting</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 p-5 overflow-y-auto bg-[#121218]">
            {/* TAB 1: Realm & Platform */}
            {activeTab === "realm" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <Globe className="size-4 text-[#c5a059]" /> Server Megaserver Location
                  </h3>
                  <p className="text-xs text-[#a89f91] mb-3">
                    Select your primary ESO region. All guild trader listings and market stats filter by this location.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {["NA", "EU"].map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setServerLocation(loc)}
                        className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                          serverLocation === loc
                            ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                            : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91] hover:border-[#c5a059]/40 hover:text-[#e0d8c3]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="size-4 text-emerald-400" /> {loc} Megaserver
                        </span>
                        {serverLocation === loc && <Check className="size-4 text-[#c5a059]" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2c33]">
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <Monitor className="size-4 text-[#c5a059]" /> Game Platform
                  </h3>
                  <p className="text-xs text-[#a89f91] mb-3">
                    Choose your active gaming platform.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "PC", label: "PC / Mac", icon: Monitor },
                      { id: "Xbox", label: "Xbox", icon: Gamepad2 },
                      { id: "PlayStation", label: "PlayStation", icon: Gamepad2 }
                    ].map((item) => {
                      const IconComp = item.icon;
                      const isSelected = platform === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setPlatform(item.id)}
                          className={`flex flex-col items-center justify-center p-3 border text-xs font-cinzel font-semibold transition-all gap-1.5 ${
                            isSelected
                              ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                              : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91] hover:border-[#c5a059]/40 hover:text-[#e0d8c3]"
                          }`}
                        >
                          <IconComp className="size-5 text-[#c5a059]" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Display & Theme */}
            {activeTab === "display" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <Moon className="size-4 text-[#c5a059]" /> Theme Interface
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        theme === "dark"
                          ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                          : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Moon className="size-4 text-amber-400" /> Dark Mode (Tamriel Night)
                      </span>
                      {theme === "dark" && <Check className="size-4 text-[#c5a059]" />}
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        theme === "light"
                          ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                          : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Sun className="size-4 text-amber-400" /> Light Mode (Daylight)
                      </span>
                      {theme === "light" && <Check className="size-4 text-[#c5a059]" />}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2c33]">
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <LayoutGrid className="size-4 text-[#c5a059]" /> Marketplace Layout Density
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLayoutMode("grid")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        layoutMode === "grid"
                          ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                          : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid className="size-4 text-[#c5a059]" /> Rich Grid View
                      </span>
                      {layoutMode === "grid" && <Check className="size-4 text-[#c5a059]" />}
                    </button>

                    <button
                      onClick={() => setLayoutMode("compact")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        layoutMode === "compact"
                          ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                          : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <List className="size-4 text-[#c5a059]" /> Compact Row List
                      </span>
                      {layoutMode === "compact" && <Check className="size-4 text-[#c5a059]" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Addon & Sync */}
            {activeTab === "sync" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <RefreshCw className="size-4 text-[#c5a059]" /> Live Auto-Refresh Interval
                  </h3>
                  <p className="text-xs text-[#a89f91] mb-3">
                    Automatically poll the central market API for newly uploaded in-game trader scans.
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "off", label: "Off" },
                      { id: "15", label: "15 Sec" },
                      { id: "30", label: "30 Sec" },
                      { id: "60", label: "60 Sec" }
                    ].map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => setAutoRefreshInterval(sec.id)}
                        className={`p-2.5 border text-xs font-cinzel font-bold text-center transition-all ${
                          autoRefreshInterval === sec.id
                            ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                            : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91] hover:border-[#c5a059]/40"
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2c33]">
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <ShieldAlert className="size-4 text-[#c5a059]" /> Addon Sync Status & Path
                  </h3>
                  <div className="p-3 bg-[#0a0a0d] border border-[#2a2c33] space-y-2 text-xs font-mono text-[#a89f91]">
                    <div className="flex justify-between items-center text-[#e0d8c3]">
                      <span>Watcher Daemon Status:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> Ready
                      </span>
                    </div>
                    <div className="text-[11px] text-[#a89f91]">
                      Monitored Path: <br />
                      <span className="text-[#c5a059]">~/Documents/Elder Scrolls Online/live/SavedVariables/ESOTrade.lua</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Deals & Alerts */}
            {activeTab === "deals" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <Zap className="size-4 text-[#c5a059]" /> Default Min Value Index (Deal Score Threshold)
                  </h3>
                  <p className="text-xs text-[#a89f91] mb-3">
                    Highlight listings listed below market value ($suggested\_price / listing\_price$).
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "1.0", label: "1.0x (Market Price)" },
                      { id: "1.25", label: "1.25x (20% Off Deal)" },
                      { id: "1.5", label: "1.5x (33% Off Steal)" }
                    ].map((score) => (
                      <button
                        key={score.id}
                        onClick={() => setDefaultMinDealScore(score.id)}
                        className={`p-2.5 border text-xs font-cinzel font-semibold text-center transition-all ${
                          defaultMinDealScore === score.id
                            ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                            : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91] hover:border-[#c5a059]/40"
                        }`}
                      >
                        {score.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2c33]">
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <Sliders className="size-4 text-[#c5a059]" /> Default Pagination Page Size
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["20", "50", "100"].map((num) => (
                      <button
                        key={num}
                        onClick={() => setItemsPerPage(num)}
                        className={`p-2 border text-xs font-cinzel font-bold text-center transition-all ${
                          itemsPerPage === num
                            ? "bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37]"
                            : "bg-[#0a0a0d] border-[#2a2c33] text-[#a89f91]"
                        }`}
                      >
                        {num} Items / Page
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2a2c33]">
                  <h3 className="font-cinzel text-sm font-bold text-[#d4af37] mb-2 tracking-wide flex items-center gap-2">
                    <Terminal className="size-4 text-amber-500" /> Developer Mode Shortcut
                  </h3>
                  <p className="text-xs text-[#a89f91] mb-3">
                    Access developer account switcher and database testing utilities.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      if (onOpenDevModal) onOpenDevModal();
                    }}
                    className="w-full rounded-none gap-2 font-bold bg-amber-950/40 text-[#d4af37] border-amber-600/40 hover:bg-amber-900/60"
                  >
                    <Zap className="size-4 text-[#c5a059] fill-[#c5a059]" />
                    <span>Open Developer Account Switcher</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#2a2c33] bg-[#0a0a0d] flex justify-end">
          <Button
            onClick={onClose}
            className="rounded-none font-cinzel font-bold bg-[#c5a059] text-[#0a0a0d] hover:bg-[#d4af37] px-6 text-xs"
          >
            Save & Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
