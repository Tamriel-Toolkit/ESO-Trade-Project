import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  ChevronDown, 
  ShoppingCart, 
  Package, 
  Users, 
  Sparkles, 
  Hammer,
  Layers,
  Search,
  UserCheck
} from "lucide-react";
import { fetchSystemStatus } from "@/api/api";
import SettingsMenu from "./SettingsMenu";
import UserMenu from "./UserMenu";
import DevAccountModal from "../dev/DevAccountModal";

function Navbar() {
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ status: 'checking', latestScan: null });
  
  // Navigation Dropdown States
  const [openDropdown, setOpenDropdown] = useState(null); // 'requests' | 'characters' | null
  const requestsMenuRef = useRef(null);
  const charactersMenuRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        requestsMenuRef.current && !requestsMenuRef.current.contains(event.target) &&
        charactersMenuRef.current && !charactersMenuRef.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;
  const isRequestsActive = location.pathname.startsWith('/requests') || location.pathname === '/my-orders';
  const isCharactersActive = location.pathname === '/characters' || location.pathname === '/traits';

  return (
    <>
      <header className="w-full bg-[#121218] border-b border-[#2a2c33] text-[#e0d8c3] shadow-2xl relative sticky top-0 z-50">
        {/* Ornate Top Border Highlight */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 lg:gap-4 xl:gap-6">
          {/* 1. Left: Brand Identity */}
          <div className="flex items-center shrink-0">
            <Link 
              to="/" 
              className="group flex items-center gap-2.5 sm:gap-3 font-cinzel text-lg sm:text-xl xl:text-2xl font-extrabold tracking-wider text-[#d4af37] hover:text-[#e0d8c3] transition-colors whitespace-nowrap"
            >
              <div className="size-9 sm:size-10 rounded-none bg-[#0a0a0d] border-2 border-[#c5a059]/60 flex items-center justify-center text-xs font-black font-mono text-[#d4af37] shadow-inner group-hover:border-[#c5a059] group-hover:shadow-[0_0_12px_rgba(197,160,89,0.4)] transition-all shrink-0">
                ESO
              </div>
              <span className="flex items-center gap-1.5 sm:gap-2">
                TAMRIEL <span className="text-[#e0d8c3] font-medium text-sm sm:text-base xl:text-lg">TRADE HUB</span>
              </span>
            </Link>
          </div>

          {/* 2. Center: Responsive Desktop Primary Navigation with Dropdowns */}
          <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 flex-1 min-w-0 px-2">
            <Link
              to="/"
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase font-cinzel font-bold tracking-wider xl:tracking-[0.15em] transition-all border-b-2 whitespace-nowrap shrink-0 ${
                isActive('/') 
                  ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                  : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
              }`}
            >
              Home
            </Link>

            <Link
              to="/marketplace"
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase font-cinzel font-bold tracking-wider xl:tracking-[0.15em] transition-all border-b-2 whitespace-nowrap shrink-0 ${
                isActive('/marketplace') 
                  ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                  : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
              }`}
            >
              Marketplace
            </Link>

            {/* REQUESTS DROPDOWN */}
            <div 
              className="relative shrink-0" 
              ref={requestsMenuRef}
              onMouseEnter={() => setOpenDropdown('requests')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'requests' ? null : 'requests')}
                className={`px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase font-cinzel font-bold tracking-wider xl:tracking-[0.15em] transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isRequestsActive || openDropdown === 'requests'
                    ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                    : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
                }`}
              >
                <span>Requests</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${openDropdown === 'requests' ? 'rotate-180 text-[#d4af37]' : ''}`} />
              </button>

              {/* Requests Popover Dropdown */}
              {openDropdown === 'requests' && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-[#121218] border border-[#2a2c33] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>
                  
                  <div className="p-1.5 space-y-1">
                    <Link
                      to="/requests"
                      className={`flex items-start gap-3 p-2.5 transition-colors group ${
                        isActive('/requests') ? 'bg-[#c5a059]/15 border-l-2 border-[#c5a059]' : 'hover:bg-[#1a1a24]'
                      }`}
                    >
                      <ShoppingCart className="size-4.5 text-[#c5a059] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-cinzel font-bold text-[#e0d8c3] group-hover:text-[#d4af37] uppercase">
                          Item Requests
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          Browse public WTB & crafting bounties
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/my-orders"
                      className={`flex items-start gap-3 p-2.5 transition-colors group ${
                        isActive('/my-orders') ? 'bg-[#c5a059]/15 border-l-2 border-[#c5a059]' : 'hover:bg-[#1a1a24]'
                      }`}
                    >
                      <Package className="size-4.5 text-[#c5a059] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-cinzel font-bold text-[#e0d8c3] group-hover:text-[#d4af37] uppercase">
                          My Orders
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          Manage your posted & claimed bounties
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/builds"
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase font-cinzel font-bold tracking-wider xl:tracking-[0.15em] transition-all border-b-2 whitespace-nowrap shrink-0 ${
                isActive('/builds') 
                  ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                  : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
              }`}
            >
              Builds
            </Link>

            {/* CHARACTERS DROPDOWN */}
            <div 
              className="relative shrink-0" 
              ref={charactersMenuRef}
              onMouseEnter={() => setOpenDropdown('characters')}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'characters' ? null : 'characters')}
                className={`px-3 xl:px-4 py-2 text-xs xl:text-sm uppercase font-cinzel font-bold tracking-wider xl:tracking-[0.15em] transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isCharactersActive || openDropdown === 'characters'
                    ? 'border-[#c5a059] text-[#d4af37] bg-[#c5a059]/10 shadow-[0_2px_12px_rgba(197,160,89,0.3)]' 
                    : 'border-transparent text-[#a89f91] hover:text-[#e0d8c3] hover:border-[#2a2c33]'
                }`}
              >
                <span>Characters</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${openDropdown === 'characters' ? 'rotate-180 text-[#d4af37]' : ''}`} />
              </button>

              {/* Characters Popover Dropdown */}
              {openDropdown === 'characters' && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-[#121218] border border-[#2a2c33] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>
                  
                  <div className="p-1.5 space-y-1">
                    <Link
                      to="/characters"
                      className={`flex items-start gap-3 p-2.5 transition-colors group ${
                        isActive('/characters') ? 'bg-[#c5a059]/15 border-l-2 border-[#c5a059]' : 'hover:bg-[#1a1a24]'
                      }`}
                    >
                      <Users className="size-4.5 text-[#c5a059] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-cinzel font-bold text-[#e0d8c3] group-hover:text-[#d4af37] uppercase">
                          Roster & Crafters
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          Character profiles, stats & equipment
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/traits"
                      className={`flex items-start gap-3 p-2.5 transition-colors group ${
                        isActive('/traits') ? 'bg-[#c5a059]/15 border-l-2 border-[#c5a059]' : 'hover:bg-[#1a1a24]'
                      }`}
                    >
                      <Sparkles className="size-4.5 text-[#c5a059] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-cinzel font-bold text-[#e0d8c3] group-hover:text-[#d4af37] uppercase">
                          Trait Tracker
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                          Research matrix & market fodder matching
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* 3. Right: Minimalist Utility Controls (Settings Gear & Profile Menu) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <SettingsMenu
              syncStatus={syncStatus}
              onOpenDevModal={() => setIsDevModalOpen(true)}
            />
            <UserMenu />
          </div>
        </div>

        {/* Mobile & Tablet Navigation Links (< lg) */}
        <div className="border-t border-[#2a2c33] bg-[#0a0a0d] lg:hidden">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-start sm:justify-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
            <Link
              to="/"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/marketplace') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Market
            </Link>
            <Link
              to="/requests"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/requests') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Item Requests
            </Link>
            <Link
              to="/my-orders"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/my-orders') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              My Orders
            </Link>
            <Link
              to="/builds"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/builds') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Builds
            </Link>
            <Link
              to="/characters"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/characters') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Roster
            </Link>
            <Link
              to="/traits"
              className={`px-2.5 sm:px-3 py-1 text-xs uppercase font-cinzel font-semibold tracking-wider whitespace-nowrap border shrink-0 ${
                isActive('/traits') ? 'border-[#c5a059]/60 bg-[#c5a059]/10 text-[#d4af37]' : 'border-transparent text-[#a89f91]'
              }`}
            >
              Traits
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