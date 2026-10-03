import { useState } from "react";
import { createPortal } from "react-dom";
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
  ShieldAlert
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSettings } from "@/context/SettingsContext";
import { Button } from "@/components/ui/button";
import { useDialogFocus } from "@/hooks/useDialogFocus";

function SettingsModal({ isOpen, onClose, syncStatus }) {
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

  const dialogRef = useDialogFocus(isOpen, onClose);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] exchange-preferences flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="marketplace-settings-title" tabIndex={-1} className="w-full max-w-2xl bg-card border border-primary/40 text-foreground shadow-2xl rounded-none relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Gold Decorative Bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>

        {/* Modal Header */}
        <div className="p-4 md:p-6 border-b border-border flex items-center justify-between bg-recess">
          <div className="flex items-center gap-3">
            <div className="size-9 shrink-0 bg-secondary border border-primary/50 flex items-center justify-center text-primary">
              <Settings className="size-5 animate-spin-slow" />
            </div>
            <div>
              <h2 id="marketplace-settings-title" className="font-cinzel text-lg md:text-xl font-bold tracking-wider text-primary">
                Marketplace preferences
              </h2>
              <p className="text-xs text-muted-foreground">
                Choose your region, appearance, listing refresh, and deal filters.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close preferences"
            onClick={onClose}
            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Main Body with Sidebar Tabs */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Tab Navigation Sidebar */}
          <div role="group" aria-label="Settings sections" className="w-full md:w-48 shrink-0 bg-recess border-b md:border-b-0 md:border-r border-border p-2 grid grid-cols-2 md:flex md:flex-col gap-1">
            <button
              aria-pressed={activeTab === "realm"}
              onClick={() => setActiveTab("realm")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "realm"
                  ? "bg-primary/15 border-primary/60 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Globe className="size-4 text-primary" />
              <span>Realm & Platform</span>
            </button>

            <button
              aria-pressed={activeTab === "display"}
              onClick={() => setActiveTab("display")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "display"
                  ? "bg-primary/15 border-primary/60 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Sliders className="size-4 text-primary" />
              <span>Display & Theme</span>
            </button>

            <button
              aria-pressed={activeTab === "sync"}
              onClick={() => setActiveTab("sync")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "sync"
                  ? "bg-primary/15 border-primary/60 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <RefreshCw className="size-4 text-primary" />
              <span>Refresh & Sync</span>
            </button>

            <button
              aria-pressed={activeTab === "deals"}
              onClick={() => setActiveTab("deals")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-cinzel font-semibold tracking-wider transition-all text-left border ${
                activeTab === "deals"
                  ? "bg-primary/15 border-primary/60 text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Zap className="size-4 text-primary" />
              <span>Deals & Results</span>
            </button>
          </div>

          {/* Tab Content Panel */}
          <div className="flex-1 min-h-0 p-5 overflow-y-auto bg-card">
            {/* TAB 1: Realm & Platform */}
            {activeTab === "realm" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <Globe className="size-4 text-primary" /> Server Megaserver Location
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select your primary ESO region. All guild trader listings and market stats filter by this location.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {["NA", "EU"].map((loc) => (
                      <button
                        key={loc}
                        aria-pressed={serverLocation === loc}
                        onClick={() => setServerLocation(loc)}
                        className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                          serverLocation === loc
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-recess border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="size-4 text-emerald-400" /> {loc} Megaserver
                        </span>
                        {serverLocation === loc && <Check className="size-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <Monitor className="size-4 text-primary" /> Game Platform
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
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
                          aria-pressed={isSelected}
                          onClick={() => setPlatform(item.id)}
                          className={`flex flex-col items-center justify-center p-3 border text-xs font-cinzel font-semibold transition-all gap-1.5 ${
                            isSelected
                              ? "bg-primary/20 border-primary text-primary"
                              : "bg-recess border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          <IconComp className="size-5 text-primary" />
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
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <Moon className="size-4 text-primary" /> Theme Interface
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      aria-pressed={theme === "dark"}
                      onClick={() => setTheme("dark")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        theme === "dark"
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-recess border-border text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Moon className="size-4 text-amber-400" /> Dark Mode (Tamriel Night)
                      </span>
                      {theme === "dark" && <Check className="size-4 text-primary" />}
                    </button>
                    <button
                      aria-pressed={theme === "light"}
                      disabled
                      aria-describedby="unavailable-preferences-theme"
                      onClick={() => setTheme("light")}
                      className={`disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        theme === "light"
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-recess border-border text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Sun className="size-4 text-amber-400" /> Light Mode (Daylight)
                      </span>
                      {theme === "light" && <Check className="size-4 text-primary" />}
                    </button>
                  </div>
                  <p id="unavailable-preferences-theme" className="mt-2 text-xs text-muted-foreground">
                    Light mode is not available yet.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <LayoutGrid className="size-4 text-primary" /> Marketplace Layout Density
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      aria-pressed={layoutMode === "grid"}
                      onClick={() => setLayoutMode("grid")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        layoutMode === "grid"
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-recess border-border text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutGrid className="size-4 text-primary" /> Rich Grid View
                      </span>
                      {layoutMode === "grid" && <Check className="size-4 text-primary" />}
                    </button>

                    <button
                      aria-pressed={layoutMode === "compact"}
                      onClick={() => setLayoutMode("compact")}
                      className={`flex items-center justify-between p-3 border text-xs font-cinzel font-bold transition-all ${
                        layoutMode === "compact"
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-recess border-border text-muted-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <List className="size-4 text-primary" /> Compact Row List
                      </span>
                      {layoutMode === "compact" && <Check className="size-4 text-primary" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Addon & Sync */}
            {activeTab === "sync" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <RefreshCw className="size-4 text-primary" /> Live Auto-Refresh Interval
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Refresh the current marketplace search while this page is open. This does not control the local addon watcher.
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
                        aria-pressed={autoRefreshInterval === sec.id}
                        onClick={() => setAutoRefreshInterval(sec.id)}
                        className={`p-2.5 border text-xs font-cinzel font-bold text-center transition-all ${
                          autoRefreshInterval === sec.id
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-recess border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <ShieldAlert className="size-4 text-primary" /> Connection & Local Watcher
                  </h3>
                  <div className="p-3 bg-recess border border-border space-y-2 text-xs font-mono text-muted-foreground">
                    <p>Market API: {syncStatus?.status === "online" ? "Connected" : syncStatus?.status === "checking" ? "Checking" : "Unavailable"}</p>
                    <p>Latest server scan: {syncStatus?.latestScan || "None"}</p>
                    <p>Local watcher: <strong className="text-foreground">Unknown</strong></p>
                    <p>The browser cannot inspect your local watcher or its SavedVariables path. API connectivity does not confirm that the watcher is running.</p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Deals & Results */}
            {activeTab === "deals" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <Zap className="size-4 text-primary" /> Default Min Value Index (Deal Score Threshold)
                  </h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Use the observed average unit price divided by listing unit price for deal badges and the Deals only filter. Listings without an observed average are not scored.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "1.0", label: "1.0x (Market Price)" },
                      { id: "1.2", label: "1.2x (Default)" },
                      { id: "1.25", label: "1.25x (20% Off Deal)" },
                      { id: "1.5", label: "1.5x (33% Off Steal)" }
                    ].map((score) => (
                      <button
                        key={score.id}
                        aria-pressed={defaultMinDealScore === score.id}
                        onClick={() => setDefaultMinDealScore(score.id)}
                        className={`p-2.5 border text-xs font-cinzel font-semibold text-center transition-all ${
                          defaultMinDealScore === score.id
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-recess border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {score.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h3 className="font-cinzel text-sm font-bold text-primary mb-2 tracking-wide flex items-center gap-2">
                    <Sliders className="size-4 text-primary" /> Default Pagination Page Size
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {["20", "50", "100"].map((num) => (
                      <button
                        key={num}
                        aria-pressed={itemsPerPage === num}
                        onClick={() => setItemsPerPage(num)}
                        className={`p-2 border text-xs font-cinzel font-bold text-center transition-all ${
                          itemsPerPage === num
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-recess border-border text-muted-foreground"
                        }`}
                      >
                        {num} Items / Page
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 border-t border-border bg-recess flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Changes apply immediately.</p>
          <Button
            onClick={onClose}
            className="rounded-none font-cinzel font-bold bg-primary text-recess hover:bg-primary px-6 text-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default SettingsModal;
