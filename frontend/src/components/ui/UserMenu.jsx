import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogIn, UserPlus, LogOut, Shield, Bookmark, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { EsoTooltip } from "@/components/ui/tooltip";

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
  }, [location.key]);

  const userTooltip = user ? `@${user.username}` : "Guest Account";

  return (
    <div className="exchange-user-menu relative" ref={menuRef}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
      onKeyDown={(event) => { if (event.key === 'Escape' && isOpen) { event.preventDefault(); event.stopPropagation(); setIsOpen(false); menuRef.current?.querySelector('button')?.focus(); } }}>
      {/* Profile Icon Trigger Button */}
      <EsoTooltip content={userTooltip} side="bottom">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Account menu"
          aria-expanded={isOpen}
          aria-controls="account-popover"
          className={`size-10 flex items-center justify-center rounded-none border-2 transition-colors cursor-pointer ${
            user
              ? 'bg-secondary border-primary text-primary shadow-none font-mono font-bold text-sm hover:bg-secondary'
              : isOpen
                ? 'bg-primary/20 border-primary text-primary shadow-none'
                : 'bg-secondary border-primary/40 text-muted-foreground hover:text-primary hover:border-primary hover:bg-secondary shadow-sm'
          }`}
        >
          {user ? (
            <span>{user.username.charAt(0).toUpperCase()}</span>
          ) : (
            <User className="size-4.5" />
          )}
        </button>
      </EsoTooltip>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div id="account-popover" className="exchange-account-popover absolute right-0 mt-2 w-72 bg-card border border-input shadow-2xl z-50">
          {/* Top Gold Accent Line */}
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary to-transparent"></div>

          {user ? (
            /* Authenticated User Menu */
            <div>
              {/* User Header */}
              <div className="px-4 py-3 border-b border-border bg-recess">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 bg-secondary border border-primary/40 flex items-center justify-center text-xs font-bold font-mono text-primary">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 break-words">
                    <span className="font-sans text-sm font-bold text-foreground block break-all">
                      @{user.username}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground block break-all">
                      {user.email || 'Merchant Account'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="p-2 space-y-1">
                <Link
                  to="/characters"
                  className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-2 font-sans">
                    <Shield className="size-3.5 text-primary" />
                    <span>Characters and equipment</span>
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground" />
                </Link>

                <Link
                  to="/marketplace"
                  className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="flex items-center gap-2 font-sans">
                    <Bookmark className="size-3.5 text-primary" />
                    <span>Marketplace</span>
                  </span>
                  <ChevronRight className="size-3 text-muted-foreground" />
                </Link>
              </div>

              {/* Sign Out Action */}
              <div className="p-2 border-t border-border">
                <button
                  type="button"
                  onClick={async () => {
                    setIsOpen(false);
                    menuRef.current?.querySelector('button')?.focus();
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 font-sans font-semibold transition-colors cursor-pointer"
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
              <div className="px-4 py-3 border-b border-border bg-recess">
                <div className="flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  <span className="font-sans text-xs font-bold text-foreground  ">
                    Your account
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Sign in to ESO Marketplace to manage your characters and saved searches.
                </p>
              </div>

              {/* Auth Actions */}
              <div className="p-3 space-y-2">
                <Link
                  to="/login"
                  state={{ from: location }}
                  className="w-full py-2 px-3 bg-primary hover:bg-primary text-recess font-sans font-bold text-xs   flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
                >
                  <LogIn className="size-3.5" />
                  <span>Sign In</span>
                </Link>

                <Link
                  to="/login"
                  state={{ from: location, defaultTab: 'register' }}
                  className="w-full py-2 px-3 bg-secondary hover:bg-secondary border border-border hover:border-primary/40 text-foreground font-sans font-semibold text-xs   flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserPlus className="size-3.5 text-primary" />
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
