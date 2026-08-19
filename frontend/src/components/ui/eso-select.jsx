import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";

export function EsoSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select Option",
  className = "",
  "aria-label": ariaLabel
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const listboxId = useId();

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = options.findIndex((opt) => String(opt.value) === String(value));
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < options.length) {
        onChange(options[highlightedIndex].value);
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`} onKeyDown={handleKeyDown}>
      {/* Dropdown Trigger Button with ARIA Combobox Attributes */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel || placeholder}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[220px] flex items-center justify-between gap-3 px-3.5 py-1.5 bg-[#0a0a0d] border border-[#2a2c33] hover:border-[#c5a059]/60 text-[#e0d8c3] font-cinzel font-bold text-xs uppercase cursor-pointer transition-all shadow-sm focus:outline-none focus:border-[#c5a059]"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center" aria-hidden="true">{selectedOption.icon}</span>
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown className={`size-3.5 text-[#c5a059] shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {/* Dropdown Options Popup Menu with ARIA Listbox Attributes */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel || placeholder}
          className="absolute left-0 top-full mt-1 z-50 min-w-full w-max max-w-sm bg-[#121218] border-2 border-[#c5a059]/60 shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto"
        >
          {options.map((opt, idx) => {
            const isSelected = String(opt.value) === String(value);
            const isHighlighted = idx === highlightedIndex;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs font-cinzel uppercase font-semibold transition-colors cursor-pointer text-left whitespace-nowrap ${
                  isSelected
                    ? "bg-[#c5a059]/20 text-[#d4af37] border-l-2 border-[#c5a059]"
                    : isHighlighted
                      ? "bg-[#161620] text-[#e0d8c3]"
                      : "text-[#b0a696] hover:bg-[#161620] hover:text-[#e0d8c3]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {opt.icon && <span className="shrink-0 flex items-center" aria-hidden="true">{opt.icon}</span>}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="size-3.5 text-[#c5a059] shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
