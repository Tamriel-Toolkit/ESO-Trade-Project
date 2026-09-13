import React, { useState, useRef, useEffect } from 'react';
import { Settings, Globe, Monitor, Gamepad2, Moon, Sun, Laptop, Zap, Radio, ChevronRight } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { EsoTooltip } from '@/components/ui/tooltip';
import { useLocation } from 'react-router-dom';

export default function SettingsMenu({ syncStatus, onOpenDevModal }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
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

  useEffect(() => { setIsOpen(false); }, [location.key]);

  return (
    <div className="exchange-settings relative" ref={menuRef}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
      onKeyDown={(event) => { if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); setIsOpen(false); menuRef.current?.querySelector('button')?.focus(); } }}>
      {/* Settings Icon Trigger Button */}
      <EsoTooltip content="Settings" side="bottom">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Settings"
          aria-expanded={isOpen}
          aria-controls="settings-popover"
          className={`size-10 flex items-center justify-center rounded-none border-2 transition-colors cursor-pointer ${
            isOpen
              ? 'bg-primary/20 border-primary text-primary shadow-none'
              : 'bg-secondary border-primary/40 text-muted-foreground hover:text-primary hover:border-primary hover:bg-secondary shadow-sm'
          }`}
        >
          <Settings className={`size-4.5 transition-transform duration-300 ${isOpen ? 'rotate-90 text-primary' : ''}`} />
        </button>
      </EsoTooltip>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div id="settings-popover" className="exchange-settings-popover bg-card border border-input shadow-2xl z-50">
          {/* Top Gold Accent Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>

          {/* Menu Header */}
          <div className="px-4 py-3 border-b border-border bg-recess flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              <span className="font-sans text-xs font-bold text-foreground  ">
                Settings
              </span>
            </div>
            <span className="text-xs font-mono text-muted-foreground  px-1.5 py-0.5 bg-secondary border border-border">
              {platform} · {serverLocation}
            </span>
          </div>

          <div className="p-4 space-y-4 text-xs">
            {/* 1. Live Sync Telemetry & Connection Status */}
            <div className="p-3 bg-recess border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-bold text-muted-foreground  flex items-center gap-1.5">
                  <Radio className="size-3.5 text-primary" />
                  Connection status
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-mono font-bold px-1.5 py-0.5 ${
                  syncStatus?.status === 'online'
                    ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                    : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                }`}>
                  <span className={`size-1.5 rounded-full ${syncStatus?.status === 'online' ? 'bg-emerald-400 ' : 'bg-amber-400'}`}></span>
                  {syncStatus?.status === 'online' ? 'Connected' : syncStatus?.status === 'checking' ? 'Checking' : 'Unavailable'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                <div>
                  <span className="text-muted-foreground block text-xs">Latest scan</span>
                  <span className="font-mono text-foreground">{syncStatus?.latestScan || 'None'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Catalog Items:</span>
                  <span className="font-mono text-primary">
                    {syncStatus?.catalogCount ? syncStatus.catalogCount.toLocaleString() : '155,476'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Game Platform Selector */}
            <div className="space-y-1.5">
              <span id="settings-platform-label" className="text-xs font-sans font-semibold text-muted-foreground block">
                Game Platform
              </span>
              <div role="group" aria-labelledby="settings-platform-label" className="grid grid-cols-2 gap-1 bg-recess p-1 border border-border">
                <button
                  type="button"
                  onClick={() => platform !== 'PC' && togglePlatform()}
                  aria-pressed={platform === 'PC'}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    platform === 'PC'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Monitor className="size-3.5" />
                  <span>PC / Mac</span>
                </button>
                <button
                  type="button"
                  onClick={() => platform !== 'Console' && togglePlatform()}
                  aria-pressed={['Console', 'Xbox', 'PlayStation'].includes(platform)}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    platform === 'Console'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Gamepad2 className="size-3.5" />
                  <span>Console</span>
                </button>
              </div>
            </div>

            {/* 3. Megaserver Region Selector */}
            <div className="space-y-1.5">
              <span id="settings-region-label" className="text-xs font-sans font-semibold text-muted-foreground block">
                Megaserver Region
              </span>
              <div role="group" aria-labelledby="settings-region-label" className="grid grid-cols-2 gap-1 bg-recess p-1 border border-border">
                <button
                  type="button"
                  onClick={() => serverLocation !== 'NA' && toggleServerLocation()}
                  aria-pressed={serverLocation === 'NA'}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    serverLocation === 'NA'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Globe className="size-3.5" />
                  <span>North America (NA)</span>
                </button>
                <button
                  type="button"
                  onClick={() => serverLocation !== 'EU' && toggleServerLocation()}
                  aria-pressed={serverLocation === 'EU'}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    serverLocation === 'EU'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Globe className="size-3.5" />
                  <span>Europe (EU)</span>
                </button>
              </div>
            </div>

            {/* 4. Display Appearance */}
            <div className="space-y-1.5">
              <span id="settings-appearance-label" className="text-xs font-sans font-semibold text-muted-foreground block">
                Appearance
              </span>
              <div role="group" aria-labelledby="settings-appearance-label" className="grid grid-cols-3 gap-1 bg-recess p-1 border border-border">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Moon className="size-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Sun className="size-3.5" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  aria-pressed={theme === 'system'}
                  className={`py-1.5 px-2 text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                    theme === 'system'
                      ? 'bg-primary text-recess font-bold shadow'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Laptop className="size-3.5" />
                  <span>System</span>
                </button>
              </div>
            </div>

            {/* 5. Developer Sandbox (Non-Production Only) */}
            {!import.meta.env.PROD && (
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    menuRef.current?.querySelector('button')?.focus();
                    onOpenDevModal();
                  }}
                  className="w-full py-2 px-3 bg-secondary hover:bg-secondary border border-amber-500/40 hover:border-amber-400 text-amber-400 text-xs font-sans font-bold  flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="size-3.5 text-amber-400" />
                    <span>Developer accounts</span>
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
