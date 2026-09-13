import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ShoppingCart,
  Package,
  Users,
  Sparkles,
} from "lucide-react";
import { fetchSystemStatus } from "@/api/api";
import SettingsMenu from "./SettingsMenu";
import UserMenu from "./UserMenu";
import DevAccountModal from "../dev/DevAccountModal";

function Navbar() {
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ status: 'checking', latestScan: null });
  
  // Navigation Dropdown States with Graceful Hover Intent Timeout
  const [openDropdown, setOpenDropdown] = useState(null); // 'requests' | 'characters' | null
  const closeTimeoutRef = useRef(null);
  const openedByHoverRef = useRef(null);
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

  const handleMouseEnter = (menu) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (openDropdown !== menu) openedByHoverRef.current = menu;
    setOpenDropdown(menu);
  };

  const toggleDropdown = (menu, event) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    // The first pointer click should retain a panel just opened by hover.
    const wasOpenedByHover = event.detail !== 0 && openedByHoverRef.current === menu;
    openedByHoverRef.current = null;
    setOpenDropdown(current => wasOpenedByHover ? menu : current === menu ? null : menu);
  };

  const handleDropdownBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      openedByHoverRef.current = null;
      setOpenDropdown(null);
    }
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      if (requestsMenuRef.current?.contains(document.activeElement) || charactersMenuRef.current?.contains(document.activeElement)) return;
      openedByHoverRef.current = null;
      setOpenDropdown(null);
    }, 280); // 280ms grace period so mouse movement to options is effortless
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        requestsMenuRef.current && !requestsMenuRef.current.contains(event.target) &&
        charactersMenuRef.current && !charactersMenuRef.current.contains(event.target)
      ) {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
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
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openedByHoverRef.current = null;
    setOpenDropdown(null);
  }, [location.key]);

  useEffect(() => () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  const isActive = (path) => path === '/my-orders'
    ? ['/my-orders', '/requests/my-orders'].includes(location.pathname)
    : location.pathname === path;
  const isRequestsActive = location.pathname.startsWith('/requests') || location.pathname === '/my-orders';
  const isCharactersActive = location.pathname === '/characters' || location.pathname === '/traits';

  return (
    <>
      <header className="exchange-nav w-full bg-background border-b border-border text-foreground sticky top-0 z-50" onKeyDown={(event) => {
        if (event.key === 'Escape' && openDropdown) {
          event.preventDefault();
          event.stopPropagation();
          (openDropdown === 'requests' ? requestsMenuRef : charactersMenuRef).current?.querySelector('button')?.focus();
          openedByHoverRef.current = null;
          setOpenDropdown(null);
        }
      }}>
        {/* Ornate Top Border Highlight */}
        <div className="h-px w-full bg-primary/30" aria-hidden="true"></div>

        <div className="exchange-container exchange-nav-inner">
          {/* 1. Left: Brand Identity */}
          <div className="flex items-center shrink-0">
            <Link
              to="/"
              aria-current={isActive('/') ? 'page' : undefined}
              aria-label="ESO Marketplace home"
              className="exchange-wordmark group flex items-center gap-3 text-primary hover:text-foreground transition-colors"
            >
              <div aria-hidden="true" className="size-9 sm:size-10 rounded-none bg-recess border-2 border-primary/60 flex items-center justify-center text-xs font-black font-mono text-primary shadow-inner group-hover:border-primary group-hover:shadow-none transition-colors shrink-0">
                ESO
              </div>
              <span className="exchange-brand-name">
                ESO <span>Marketplace</span>
              </span>
            </Link>
          </div>

          {/* 2. Center: Responsive Desktop Primary Navigation with Smooth Dropdowns */}
          <nav className="exchange-nav-links hidden lg:flex items-center justify-center gap-1 xl:gap-2 flex-1 min-w-0 px-2" aria-label="Main navigation">
            <Link
              to="/"
              aria-current={isActive('/') ? 'page' : undefined}
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm  font-sans font-bold   transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                isActive('/')
                  ? 'border-primary text-primary bg-primary/10 shadow-none'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Home
            </Link>

            <Link
              to="/marketplace"
              aria-current={isActive('/marketplace') ? 'page' : undefined}
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm  font-sans font-bold   transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                isActive('/marketplace')
                  ? 'border-primary text-primary bg-primary/10 shadow-none'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Marketplace
            </Link>

            {/* REQUESTS DROPDOWN */}
            <div
              className="relative shrink-0"
              ref={requestsMenuRef}
              onMouseEnter={() => handleMouseEnter('requests')}
              onMouseLeave={handleMouseLeave}
              onBlur={handleDropdownBlur}
            >
              <button
                type="button"
                onClick={(event) => toggleDropdown('requests', event)}
                aria-expanded={openDropdown === 'requests'}
                aria-controls="requests-navigation"
                className={`px-3 xl:px-4 py-2 text-xs xl:text-sm  font-sans font-bold   transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isRequestsActive || openDropdown === 'requests'
                    ? 'border-primary text-primary bg-primary/10 shadow-none'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span>Requests</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${openDropdown === 'requests' ? 'rotate-180 text-primary' : ''}`} />
              </button>

              {/* Requests Popover Dropdown with Invisible Bridge Padding */}
              {openDropdown === 'requests' && (
                <div
                  id="requests-navigation"
                  className="exchange-nav-popover absolute left-0 top-full pt-1.5 w-64 z-50"
                  onMouseEnter={() => handleMouseEnter('requests')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="bg-card border border-border shadow-2xl overflow-hidden">
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>

                    <div className="p-1.5 space-y-1">
                      <Link
                        to="/requests"
                        aria-current={isActive('/requests') ? 'page' : undefined}
                        className={`flex items-start gap-3 p-2.5 transition-colors group ${
                          isActive('/requests') ? 'bg-primary/15 border-l-2 border-primary' : 'hover:bg-secondary'
                        }`}
                      >
                        <ShoppingCart className="size-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-sans font-bold text-foreground group-hover:text-primary ">
                            Requests
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            Items wanted and crafting orders
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/my-orders"
                        aria-current={isActive('/my-orders') ? 'page' : undefined}
                        className={`flex items-start gap-3 p-2.5 transition-colors group ${
                          isActive('/my-orders') ? 'bg-primary/15 border-l-2 border-primary' : 'hover:bg-secondary'
                        }`}
                      >
                        <Package className="size-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-sans font-bold text-foreground group-hover:text-primary ">
                            My Orders
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            Your requests and claimed orders
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/builds"
              aria-current={isActive('/builds') ? 'page' : undefined}
              className={`px-3 xl:px-4 py-2 text-xs xl:text-sm  font-sans font-bold   transition-colors border-b-2 whitespace-nowrap shrink-0 ${
                isActive('/builds')
                  ? 'border-primary text-primary bg-primary/10 shadow-none'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Builds
            </Link>

            {/* CHARACTERS DROPDOWN */}
            <div
              className="relative shrink-0"
              ref={charactersMenuRef}
              onMouseEnter={() => handleMouseEnter('characters')}
              onMouseLeave={handleMouseLeave}
              onBlur={handleDropdownBlur}
            >
              <button
                type="button"
                onClick={(event) => toggleDropdown('characters', event)}
                aria-expanded={openDropdown === 'characters'}
                aria-controls="characters-navigation"
                className={`px-3 xl:px-4 py-2 text-xs xl:text-sm  font-sans font-bold   transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  isCharactersActive || openDropdown === 'characters'
                    ? 'border-primary text-primary bg-primary/10 shadow-none'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <span>Characters</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${openDropdown === 'characters' ? 'rotate-180 text-primary' : ''}`} />
              </button>

              {/* Characters Popover Dropdown with Invisible Bridge Padding */}
              {openDropdown === 'characters' && (
                <div
                  id="characters-navigation"
                  className="exchange-nav-popover absolute left-0 top-full pt-1.5 w-64 z-50"
                  onMouseEnter={() => handleMouseEnter('characters')}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="bg-card border border-border shadow-2xl overflow-hidden">
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>

                    <div className="p-1.5 space-y-1">
                      <Link
                        to="/characters"
                        aria-current={isActive('/characters') ? 'page' : undefined}
                        className={`flex items-start gap-3 p-2.5 transition-colors group ${
                          isActive('/characters') ? 'bg-primary/15 border-l-2 border-primary' : 'hover:bg-secondary'
                        }`}
                      >
                        <Users className="size-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-sans font-bold text-foreground group-hover:text-primary ">
                            Characters
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            Character profiles, stats & equipment
                          </p>
                        </div>
                      </Link>

                      <Link
                        to="/traits"
                        aria-current={isActive('/traits') ? 'page' : undefined}
                        className={`flex items-start gap-3 p-2.5 transition-colors group ${
                          isActive('/traits') ? 'bg-primary/15 border-l-2 border-primary' : 'hover:bg-secondary'
                        }`}
                      >
                        <Sparkles className="size-4.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-sans font-bold text-foreground group-hover:text-primary ">
                            Trait research
                          </div>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            Research progress and matching items
                          </p>
                        </div>
                      </Link>
                    </div>
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
        <div className="border-t border-border bg-recess lg:hidden">
          <nav className="exchange-mobile-links exchange-container py-2 flex items-center gap-1 overflow-x-auto" aria-label="Main navigation">
            <Link
              to="/"
              aria-current={isActive('/') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Home
            </Link>
            <Link
              to="/marketplace"
              aria-current={isActive('/marketplace') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/marketplace') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Marketplace
            </Link>
            <Link
              to="/requests"
              aria-current={isActive('/requests') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/requests') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Item Requests
            </Link>
            <Link
              to="/my-orders"
              aria-current={isActive('/my-orders') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/my-orders') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              My Orders
            </Link>
            <Link
              to="/builds"
              aria-current={isActive('/builds') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/builds') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Builds
            </Link>
            <Link
              to="/characters"
              aria-current={isActive('/characters') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/characters') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Characters
            </Link>
            <Link
              to="/traits"
              aria-current={isActive('/traits') ? 'page' : undefined}
              className={`px-2.5 sm:px-3 py-1 text-xs  font-sans font-semibold  whitespace-nowrap border shrink-0 ${
                isActive('/traits') ? 'border-primary/60 bg-primary/10 text-primary' : 'border-transparent text-muted-foreground'
              }`}
            >
              Trait research
            </Link>
          </nav>
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
