import { Link } from "react-router-dom";
import { Globe, Gamepad2, Monitor } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { useTheme } from "@/components/theme-provider";

function Navbar() {
  const { platform, togglePlatform, serverLocation, toggleServerLocation } = useTheme();

  const getPlatformIcon = () => {
    if (platform === "PC") return <Monitor className="size-4" />;
    return <Gamepad2 className="size-4" />;
  };

  return (
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
              <Link to="/login" className={navigationMenuTriggerStyle()}>
                Login
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Right Side Tools: Server Selection (Platform + Location) & Theme Toggle */}
      <div className="flex items-center gap-2">
        {/* 1. Console / Platform Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={togglePlatform}
          aria-label={`Server Platform: ${platform}. Click to change.`}
          title={`Platform: ${platform} (Click to toggle)`}
          className="gap-1.5 font-medium cursor-pointer hover:bg-accent transition-colors"
        >
          {getPlatformIcon()}
          <span>{platform}</span>
        </Button>

        {/* 2. Location / Region Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={toggleServerLocation}
          aria-label={`Server Location: ${serverLocation}. Click to change.`}
          title={`Location: ${serverLocation} (Click to toggle)`}
          className="gap-1.5 font-medium cursor-pointer hover:bg-accent transition-colors"
        >
          <Globe className="size-4 text-emerald-500" />
          <span>{serverLocation}</span>
        </Button>

        {/* Dark/Light Mode Toggle */}
        <ModeToggle />
      </div>
    </nav>
  );
}

export default Navbar;