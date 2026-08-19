import React, { useState, useRef, useEffect } from 'react';
import { Settings, Globe, Monitor, Gamepad2, Moon, Sun, Laptop, Zap, Radio, Check, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

export default function SettingsMenu({ syncStatus, onOpenDevModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const { platform, togglePlatform, serverLocation, toggleServerLocation, theme, setTheme } = useTheme();

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Settings Icon Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Settings & Game Configuration"
        className={`size-10 flex items-center justify-center rounded-none border-2 transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37] shadow-[0_0_12px_rgba(197,160,89,0.3)]'
            : 'bg-[#161620] border-[#c5a059]/40 text-[#a89f91] hover:text-[#d4af37] hover:border-[#c5a059] hover:bg-[#1f1f2e] shadow-sm'
        }`}
        title="Settings & System Status"
      >
        <Settings className={`size-4.5 transition-transform duration-300 ${isOpen ? 'rotate-90 text-[#d4af37]' : ''}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-[#121218] border border-[#2a2c33] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Top Gold Accent Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>

          {/* Menu Header */}
          <div className="px-4 py-3 border-b border-[#2a2c33] bg-[#0a0a0d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-[#c5a059]" />
              <span className="font-cinzel text-xs font-bold text-[#e0d8c3] uppercase tracking-wider">
                Settings & Environment
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8a8275] uppercase px-1.5 py-0.5 bg-[#161620] border border-[#2a2c33]">
              {platform} · {serverLocation}
            </span>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* 1. Live Sync Telemetry & Connection Status */}
            <div className="p-3 bg-[#0a0a0d] border border-[#2a2c33] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-cinzel text-[11px] font-bold text-[#a89f91] uppercase flex items-center gap-1.5">
                  <Radio className="size-3.5 text-[#c5a059]" />
                  Live Sync Telemetry
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 ${
                  syncStatus?.status === 'online'
                    ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                    : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                }`}>
                  <span className={`size-1.5 rounded-full ${syncStatus?.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  {syncStatus?.status === 'online' ? 'Active' : 'Standby'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#a89f91] pt-1">
                <div>
                  <span className="text-[#8a8275] block text-[10px]">Latest In-Game Scan:</span>
                  <span className="font-mono text-[#e0d8c3]">{syncStatus?.latestScan || 'None'}</span>
                </div>
                <div>
                  <span className="text-[#8a8275] block text-[10px]">Catalog Items:</span>
                  <span className="font-mono text-[#d4af37]">
                    {syncStatus?.catalogCount ? syncStatus.catalogCount.toLocaleString() : '155,476'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Game Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-cinzel font-semibold text-[#8a8275] uppercase block">
                Game Platform
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#0a0a0d] p-1 border border-[#2a2c33]">
                <button
                  type="button"
                  onClick={() => platform !== 'PC' && togglePlatform()}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    platform === 'PC'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Monitor className="size-3.5" />
                  <span>PC / Mac</span>
                </button>
                <button
                  type="button"
                  onClick={() => platform !== 'Console' && togglePlatform()}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    platform === 'Console'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Gamepad2 className="size-3.5" />
                  <span>Console</span>
                </button>
              </div>
            </div>

            {/* 3. Megaserver Region Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-cinzel font-semibold text-[#8a8275] uppercase block">
                Megaserver Region
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#0a0a0d] p-1 border border-[#2a2c33]">
                <button
                  type="button"
                  onClick={() => serverLocation !== 'NA' && toggleServerLocation()}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    serverLocation === 'NA'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Globe className="size-3.5" />
                  <span>North America (NA)</span>
                </button>
                <button
                  type="button"
                  onClick={() => serverLocation !== 'EU' && toggleServerLocation()}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    serverLocation === 'EU'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Globe className="size-3.5" />
                  <span>Europe (EU)</span>
                </button>
              </div>
            </div>

            {/* 4. Display Appearance */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-cinzel font-semibold text-[#8a8275] uppercase block">
                Appearance
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#0a0a0d] p-1 border border-[#2a2c33]">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Moon className="size-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Sun className="size-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    theme === 'system'
                      ? 'bg-[#c5a059] text-[#0a0a0d] font-bold shadow'
                      : 'text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620]'
                  }`}
                >
                  <Laptop className="size-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* 5. Developer Sandbox (Non-Production Only) */}
            {!import.meta.env.PROD && (
              <div className="pt-2 border-t border-[#2a2c33]">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDevModal();
                  }}
                  className="w-full py-2 px-3 bg-[#161620] hover:bg-[#1f1f2e] border border-amber-500/40 hover:border-amber-400 text-amber-400 text-xs font-cinzel font-bold tracking-wider flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-400" />
                    <span>[DEV] Sandbox Accounts</span>
                  </span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
