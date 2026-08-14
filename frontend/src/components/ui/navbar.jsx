import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Globe, Gamepad2, Monitor, Shield, Zap, User, Store, LogOut, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { fetchSystemStatus } from "@/api/api";
import DevAccountModal from "../dev/DevAccountModal";

function Navbar() {
  const { platform, togglePlatform, serverLocation, toggleServerLocation } = useTheme();
  const { user, logout } = useAuth();
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ status: 'checking', latestScan: null });
  const location = useLocation();

  useEffect(() => {
    fetchSystemStatus().then((res) => {
      if (res && res.success) {
        setSyncStatus({
          status: 'online',
          latestScan: res.latest_scan_at ? new Date(res.latest_scan_at).toLocaleString() : 'No Scans Logged Yet',
          listingsCount: res.active_listings,
          catalogCount: res.catalog_prices
        });
      } else {
        setSyncStatus({ status: 'offline', latestScan: null });
      }
    });
  }, []);

  const getPlatformIcon = () => {
    if (platform === "PC") return <Monitor className="size-4 text-[#c5a059]" />;
    return <Gamepad2 className="size-4 text-[#c5a059]" />;
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="w-full bg-[#121218] border-b border-[#c5a059]/30 text-[#e0d8c3] shadow-2xl rounded-none mb-6 relative">
        {/* Ornate Top Border Highlight */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>

        <div className="px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Brand & Left Navigation Links */}
          <div className="flex items-center gap-6">
            <Link 
              to="/" 
              className="group flex items-center gap-2.5 font-cinzel text-lg md:text-xl font-bold tracking-wider text-[#c5a059] hover:text-[#d4af37] transition-colors"
            >
              <div className="size-8 rounded-none bg-[#0a0a0d] border border-[#c5a059]/40 flex items-center justify-center text-xs font-bold font-mono text-[#c5a059] shadow-inner group-hover:border-[#c5a059]">
                ESO
              </div>
              <span className="flex items-center gap-1.5">
                TAMRIEL <span className="text-[#e0d8c3] font-normal text-sm md:text-base">TRADE HUB</span>
              </span>
            </Link>

            {/* Navigation Menu Links */}
            <nav className="hidden md:flex items-center gap-1 border-l border-[#2a2c33] pl-6">
              <Link
                to="/"
                className={`px-3 py-1.5 text-xs uppercase font-cinzel font-semibold tracking-widest transition-all border ${
                  isActive('/') 
                    ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' 
                    : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
                }`}
              >
                Home
              </Link>
              <Link
                to="/marketplace"
                className={`px-3 py-1.5 text-xs uppercase font-cinzel font-semibold tracking-widest transition-all border ${
                  isActive('/marketplace') 
                    ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' 
                    : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
                }`}
              >
                Marketplace
              </Link>
              <Link
                to="/characters"
                className={`px-3 py-1.5 text-xs uppercase font-cinzel font-semibold tracking-widest transition-all border ${
                  isActive('/characters') 
                    ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' 
                    : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
                }`}
              >
                Roster & Crafters
              </Link>
            </nav>
          </div>

          {/* Right Tools & Verified Addon Sync Status */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Addon Sync Status Indicator Verified via /api/status */}
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#0a0a0d] border border-[#2a2c33] text-[11px] font-mono text-[#a89f91]"
              title={syncStatus.latestScan ? `Verified Backend Sync. Last Scan: ${syncStatus.latestScan}` : "Checking Watcher Sync Status..."}
            >
              {syncStatus.status === 'online' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[#d4af37] font-semibold">ESOTrade Addon:</span>
                  <span className="text-emerald-400">Sync Active</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="text-[#d4af37] font-semibold">ESOTrade Addon:</span>
                  <span className="text-amber-400">Connecting...</span>
                </>
              )}
            </div>

            {/* Developer Bypass Button (Dev mode only) */}
            {!import.meta.env.PROD && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDevModalOpen(true)}
                className="rounded-none gap-1.5 font-bold cursor-pointer bg-amber-950/30 hover:bg-amber-900/50 text-[#d4af37] border-[#c5a059]/40 hover:border-[#c5a059] shadow-sm transition-all text-xs"
                title="Open Developer Account Switcher & Bypass Panel"
              >
                <Zap className="size-3.5 text-[#c5a059] fill-[#c5a059]" />
                <span>[DEV] Accounts</span>
              </Button>
            )}

            {/* Active Session Badge */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#2a2c33]">
                <Link
                  to="/characters"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-[#161620] border border-[#c5a059]/30 text-[#e0d8c3] text-xs font-semibold hover:border-[#c5a059]/60 transition-colors"
                >
                  <User className="size-3.5 text-[#c5a059]" />
                  <span className="font-mono text-[#d4af37]">@{user.username}</span>
                </Link>
                <button
                  onClick={logout}
                  className="text-xs text-[#a89f91] hover:text-red-400 transition-colors p-1"
                  title="Log out session"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-xs font-cinzel font-bold text-[#c5a059] hover:text-[#d4af37] px-2 uppercase tracking-wider"
              >
                Guild Login
              </Link>
            )}

            {/* Platform Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={togglePlatform}
              className="rounded-none gap-1.5 text-xs font-medium cursor-pointer border-[#2a2c33] bg-[#161620] text-[#e0d8c3] hover:border-[#c5a059]/40 hover:bg-[#1a1a26]"
            >
              {getPlatformIcon()}
              <span>{platform}</span>
            </Button>

            {/* Region Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleServerLocation}
              className="rounded-none gap-1.5 text-xs font-medium cursor-pointer border-[#2a2c33] bg-[#161620] text-[#e0d8c3] hover:border-[#c5a059]/40 hover:bg-[#1a1a26]"
            >
              <Globe className="size-3.5 text-emerald-400" />
              <span>{serverLocation}</span>
            </Button>

            {/* Dark Mode Toggle */}
            <ModeToggle />
          </div>
        </div>

        {/* Mobile Navigation Links */}
        <div className="flex md:hidden border-t border-[#2a2c33] px-4 py-2 gap-2 bg-[#0a0a0d]">
          <Link
            to="/"
            className={`px-2.5 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider border ${
              isActive('/') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
            }`}
          >
            Home
          </Link>
          <Link
            to="/marketplace"
            className={`px-2.5 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider border ${
              isActive('/marketplace') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
            }`}
          >
            Marketplace
          </Link>
          <Link
            to="/characters"
            className={`px-2.5 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider border ${
              isActive('/characters') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
            }`}
          >
            Roster
          </Link>
        </div>

        {/* Ornate Bottom Accent Line */}
        <div className="eso-divider my-0"></div>
      </header>

      {/* Developer Account Switcher Modal */}
      {!import.meta.env.PROD && (
        <DevAccountModal isOpen={isDevModalOpen} onClose={() => setIsDevModalOpen(false)} />
      )}
    </>
  );
}

export default Navbar;