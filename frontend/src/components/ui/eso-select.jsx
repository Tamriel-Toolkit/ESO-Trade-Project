import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export function EsoSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select Option",
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-w-[170px] flex items-center justify-between gap-2 px-3 py-1.5 bg-[#0a0a0d] border border-[#2a2c33] hover:border-[#c5a059]/60 text-[#e0d8c3] font-cinzel font-bold text-xs uppercase cursor-pointer transition-all shadow-sm"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 flex items-center">{selectedOption.icon}</span>
          )}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </div>
        <ChevronDown className={`size-3.5 text-[#c5a059] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Options Popup Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-[#121218] border-2 border-[#c5a059]/60 shadow-2xl overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-cinzel uppercase font-semibold transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-[#c5a059]/20 text-[#d4af37] border-l-2 border-[#c5a059]"
                    : "text-[#a89f91] hover:bg-[#161620] hover:text-[#e0d8c3]"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {opt.icon && <span className="shrink-0 flex items-center">{opt.icon}</span>}
                  <span className="truncate">{opt.label}</span>
                </div>
                {isSelected && <Check className="size-3.5 text-[#c5a059] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
