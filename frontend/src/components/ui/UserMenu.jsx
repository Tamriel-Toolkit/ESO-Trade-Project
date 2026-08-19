import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogIn, UserPlus, LogOut, Shield, Bookmark, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Close dropdown on outside click
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

  // Close dropdown on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Icon Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Account Menu"
        className={`size-10 flex items-center justify-center rounded-none border-2 transition-all cursor-pointer ${
          user
            ? 'bg-[#161620] border-[#c5a059] text-[#d4af37] shadow-[0_0_12px_rgba(197,160,89,0.35)] font-mono font-bold text-sm hover:bg-[#1f1f2e]'
            : isOpen
              ? 'bg-[#c5a059]/20 border-[#c5a059] text-[#d4af37] shadow-[0_0_12px_rgba(197,160,89,0.3)]'
              : 'bg-[#161620] border-[#c5a059]/40 text-[#a89f91] hover:text-[#d4af37] hover:border-[#c5a059] hover:bg-[#1f1f2e] shadow-sm'
        }`}
        title={user ? `@${user.username}` : "Guest Account"}
      >
        {user ? (
          <span>{user.username.charAt(0).toUpperCase()}</span>
        ) : (
          <User className="size-4.5" />
        )}
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#121218] border border-[#2a2c33] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Top Gold Accent Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#c5a059] to-transparent"></div>

          {user ? (
            /* Authenticated User Menu */
            <div>
              {/* User Header */}
              <div className="px-4 py-3 border-b border-[#2a2c33] bg-[#0a0a0d]">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 bg-[#161620] border border-[#c5a059]/40 flex items-center justify-center text-xs font-bold font-mono text-[#d4af37]">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <span className="font-cinzel text-xs font-bold text-[#e0d8c3] block truncate">
                      @{user.username}
                    </span>
                    <span className="text-[10px] font-mono text-[#8a8275] block truncate">
                      {user.email || 'Merchant Account'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="p-2 space-y-1">
                <Link
                  to="/characters"
                  className="flex items-center justify-between px-3 py-2 text-xs text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] transition-colors"
                >
                  <span className="flex items-center gap-2 font-cinzel">
                    <Shield className="size-3.5 text-[#c5a059]" />
                    <span>Character Roster & Gear</span>
                  </span>
                  <ChevronRight className="size-3 text-[#8a8275]" />
                </Link>

                <Link
                  to="/marketplace"
                  className="flex items-center justify-between px-3 py-2 text-xs text-[#a89f91] hover:text-[#e0d8c3] hover:bg-[#161620] transition-colors"
                >
                  <span className="flex items-center gap-2 font-cinzel">
                    <Bookmark className="size-3.5 text-[#c5a059]" />
                    <span>Marketplace & Watchlists</span>
                  </span>
                  <ChevronRight className="size-3 text-[#8a8275]" />
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="p-2 border-t border-[#2a2c33]">
                <button
                  type="button"
                  onClick={async () => {
                    setIsOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 font-cinzel font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5 text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            /* Unauthenticated Guest Menu */
            <div>
              {/* Guest Header */}
              <div className="px-4 py-3 border-b border-[#2a2c33] bg-[#0a0a0d]">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-[#c5a059]" />
                  <span className="font-cinzel text-xs font-bold text-[#e0d8c3] uppercase tracking-wider">
                    Guest Session
                  </span>
                </div>
                <p className="text-[11px] text-[#8a8275] mt-1 leading-relaxed">
                  Sign in to synchronize your character gear and live market watchlists.
                </p>
              </div>

              {/* Auth Actions */}
              <div className="p-3 space-y-2">
                <Link
                  to="/login"
                  state={{ from: location }}
                  className="w-full py-2 px-3 bg-[#c5a059] hover:bg-[#d4af37] text-[#0a0a0d] font-cinzel font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  <LogIn className="size-3.5" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/login"
                  state={{ from: location, defaultTab: 'register' }}
                  className="w-full py-2 px-3 bg-[#161620] hover:bg-[#1f1f2e] border border-[#2a2c33] hover:border-[#c5a059]/40 text-[#e0d8c3] font-cinzel font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UserPlus className="size-3.5 text-[#c5a059]" />
                  <span>Create Account</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
