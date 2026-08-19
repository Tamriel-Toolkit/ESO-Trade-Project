import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchSystemStatus } from "@/api/api";
import SettingsMenu from "./SettingsMenu";
import UserMenu from "./UserMenu";
import DevAccountModal from "../dev/DevAccountModal";

function Navbar() {
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

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <header className="w-full bg-[#121218] border-b border-[#2a2c33] text-[#e0d8c3] shadow-2xl relative sticky top-0 z-50">
        {/* Ornate Top Border Highlight */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative">
          {/* 1. Left: Brand Identity */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="group flex items-center gap-3 font-cinzel text-xl md:text-2xl font-extrabold tracking-wider text-[#d4af37] hover:text-[#e0d8c3] transition-colors"
            >
              <div className="size-10 rounded-none bg-[#0a0a0d] border-2 border-[#c5a059]/60 flex items-center justify-center text-xs font-black font-mono text-[#d4af37] shadow-inner group-hover:border-[#c5a059] group-hover:shadow-[0_0_12px_rgba(197,160,89,0.4)] transition-all">
                ESO
              </div>
              <span className="flex items-center gap-2">
                TAMRIEL <span className="text-[#e0d8c3] font-medium text-base md:text-lg">TRADE HUB</span>
              </span>
            </Link>
          </div>

          {/* 2. Center: Absolute Geometric Center Primary Navigation */}
          <nav className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Link
              to="/"
              className={`px-5 py-2 text-sm uppercase font-cinzel font-bold tracking-[0.15em] transition-all border-b-2 ${
                isActive('/') 
                  ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                  : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
              }`}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              className={`px-5 py-2 text-sm uppercase font-cinzel font-bold tracking-[0.15em] transition-all border-b-2 ${
                isActive('/marketplace') 
                  ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                  : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
              }`}
            >
              Marketplace
            </Link>
            <Link
              to="/characters"
              className={`px-5 py-2 text-sm uppercase font-cinzel font-bold tracking-[0.15em] transition-all border-b-2 ${
                isActive('/characters') 
                  ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                  : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
              }`}
            >
              Roster & Crafters
            </Link>
          </nav>

          {/* 3. Right: Minimalist Utility Controls (Settings Gear & Profile Menu) */}
          <div className="flex items-center gap-3">
            <SettingsMenu
              syncStatus={syncStatus}
              onOpenDevModal={() => setIsDevModalOpen(true)}
            />
            <UserMenu />
          </div>
        </div>

        {/* Mobile Navigation Links */}
        <div className="border-t border-[#2a2c33] bg-[#0a0a0d] md:hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-around">
            <Link
              to="/"
              className={`px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider border ${
                isActive('/') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              className={`px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider border ${
                isActive('/marketplace') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Marketplace
            </Link>
            <Link
              to="/characters"
              className={`px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider border ${
                isActive('/characters') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Roster
            </Link>
          </div>
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