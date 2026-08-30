import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { EsoTooltip } from "@/components/ui/tooltip";

export function ModeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const tooltipText = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <EsoTooltip content={tooltipText} side="bottom">
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        aria-label={tooltipText}
        className={`relative cursor-pointer transition-transform active:scale-95 ${className}`}
      >
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </EsoTooltip>
  );
}

export default ModeToggle;
