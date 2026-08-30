import React, { useState, useRef, useEffect, useId } from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/**
 * Standard ESO Tooltip Provider for controlling global delay & hover behavior
 */
export function TooltipProvider({
  delay = 150,
  children,
  ...props
}) {
  return (
    <TooltipPrimitive.Provider delay={delay} {...props}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  ...props
}) {
  return <TooltipPrimitive.Root {...props} />;
}

export function TooltipTrigger({
  className,
  ...props
}) {
  return (
    <TooltipPrimitive.Trigger
      className={cn("inline-flex shrink-0", className)}
      {...props}
    />
  );
}

export function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 6,
  children,
  title,
  shortcut,
  ...props
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-50"
      >
        <TooltipPrimitive.Popup
          className={cn(
            "bg-[#121218] border border-[#c5a059]/40 text-[#e0d8c3] px-3 py-2 text-xs shadow-2xl backdrop-blur-md max-w-xs transition-all duration-150 animate-in fade-in-0 zoom-in-95 pointer-events-none select-none",
            className
          )}
          {...props}
        >
          {title && (
            <div className="font-cinzel font-bold text-[#d4af37] text-[11px] uppercase tracking-wider mb-1 border-b border-[#2a2c33]/70 pb-1 flex items-center justify-between gap-2">
              <span>{title}</span>
              {shortcut && (
                <span className="text-[9px] font-mono text-[#8a8275] bg-[#0a0a0d] px-1 py-0.2 border border-[#2a2c33]">
                  {shortcut}
                </span>
              )}
            </div>
          )}
          <div className="text-[#c5bead] leading-relaxed text-[11px]">
            {children}
          </div>
          <TooltipPrimitive.Arrow className="fill-[#121218] stroke-[#c5a059]/40" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

/**
 * EsoTooltip: All-in-one convenient tooltip wrapper for wrapping any element
 *
 * Example Usage:
 * <EsoTooltip content="Click to view full character gear details" title="Gear Loadout" side="top">
 *   <button>Equipped</button>
 * </EsoTooltip>
 */
export function EsoTooltip({
  children,
  content,
  title,
  shortcut,
  side = "top",
  align = "center",
  sideOffset = 6,
  delay = 150,
  className = "",
  disabled = false,
}) {
  if (disabled || (!content && !title)) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delay={delay}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger render={children} />
        <TooltipContent
          side={side}
          align={align}
          sideOffset={sideOffset}
          title={title}
          shortcut={shortcut}
          className={className}
        >
          {content}
        </TooltipContent>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export default EsoTooltip;
