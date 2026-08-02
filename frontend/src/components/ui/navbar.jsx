import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Globe, Gamepad2, Monitor, Shield, Zap, User, Users } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/context/AuthContext";
import DevAccountModal from "../dev/DevAccountModal";

function Navbar() {
  const { platform, togglePlatform, serverLocation, toggleServerLocation } = useTheme();
  const { user, logout } = useAuth();
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  const getPlatformIcon = () => {
    if (platform === "PC") return <Monitor className="size-4" />;
    return <Gamepad2 className="size-4" />;
  };

  return (
    <>
      <nav className="w-full flex flex-wrap items-center justify-between py-3 px-4 mb-6 border-b border-border bg-card text-card-foreground shadow-sm rounded-lg transition-colors gap-3">
        {/* Brand & Left Navigation Links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold tracking-tight text-foreground hover:text-primary transition-colors flex items-center gap-2">
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-xs uppercase font-mono">ESO</span>
            <span>Trade Platform</span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <Link to="/" className={navigationMenuTriggerStyle()}>
                  Home
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/marketplace" className={navigationMenuTriggerStyle()}>
                  Marketplace
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/characters" className={navigationMenuTriggerStyle()}>
                  Roster & Crafters
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right Side Tools: Developer Account Switcher, Server Selection, & User Session */}
        <div className="flex items-center gap-2">
          
          {/* DEVELOPER ACCOUNT BYPASS & MANAGER BUTTON */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDevModalOpen(true)}
            className="gap-1.5 font-bold cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/40 hover:border-amber-500/60 shadow-sm transition-all"
            title="Open Developer Account Switcher & Bypass Panel"
          >
            <Zap className="size-4 fill-amber-400 text-amber-400" />
            <span>[DEV] Accounts</span>
          </Button>

          {/* Active User Session Badge */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Link to="/characters" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/80 transition-colors">
                <User className="size-3.5 text-primary" />
                <span>@{user.username}</span>
              </Link>
              <button
                onClick={logout}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1"
                title="Log out"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-xs text-primary font-semibold hover:underline px-2">
              Login
            </Link>
          )}

          {/* Platform Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlatform}
            className="gap-1.5 font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            {getPlatformIcon()}
            <span>{platform}</span>
          </Button>

          {/* Region Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleServerLocation}
            className="gap-1.5 font-medium cursor-pointer hover:bg-accent transition-colors"
          >
            <Globe className="size-4 text-emerald-500" />
            <span>{serverLocation}</span>
          </Button>

          {/* Dark/Light Mode Toggle */}
          <ModeToggle />
        </div>
      </nav>

      {/* Developer Account Switcher Modal */}
      <DevAccountModal isOpen={isDevModalOpen} onClose={() => setIsDevModalOpen(false)} />
    </>
  );
}

export default Navbar;