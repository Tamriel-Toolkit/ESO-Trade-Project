import React, { useState } from "react";
import { Shield, Sparkles, Zap, Award, Info } from "lucide-react";
import { renderEsoFormattedText, cleanEsoText } from "@/lib/utils";

const SLOT_DEFINITIONS = [
  // Left Column (Armor & Accessories)
  { slotId: 0, name: "Head", side: "left", anchorY: "12%" },
  { slotId: 3, name: "Shoulders", side: "left", anchorY: "24%" },
  { slotId: 2, name: "Chest", side: "left", anchorY: "36%" },
  { slotId: 11, name: "Hands", side: "left", anchorY: "48%" },
  { slotId: 6, name: "Waist", side: "left", anchorY: "60%" },
  { slotId: 7, name: "Legs", side: "left", anchorY: "72%" },
  { slotId: 8, name: "Feet", side: "left", anchorY: "84%" },

  // Right Column (Jewelry & Weapons)
  { slotId: 1, name: "Necklace", side: "right", anchorY: "12%" },
  { slotId: 9, name: "Ring 1", side: "right", anchorY: "24%" },
  { slotId: 10, name: "Ring 2", side: "right", anchorY: "36%" },
  { slotId: 4, name: "Front Bar Main", side: "right", anchorY: "48%" },
  { slotId: 5, name: "Front Bar Off", side: "right", anchorY: "60%" },
  { slotId: 12, name: "Back Bar Main", side: "right", anchorY: "72%" },
  { slotId: 13, name: "Back Bar Off", side: "right", anchorY: "84%" },
];

const DEFAULT_QUALITY = { label: "Normal", border: "border-gray-500", text: "text-gray-300", bg: "bg-gray-900/60" };

const QUALITY_COLORS = {
  1: { label: "Normal", border: "border-gray-500", text: "text-gray-300", bg: "bg-gray-900/60" },
  2: { label: "Fine", border: "border-green-500", text: "text-green-400", bg: "bg-green-950/60" },
  3: { label: "Superior", border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-950/60" },
  4: { label: "Epic", border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-950/60" },
  5: { label: "Legendary", border: "border-[#c5a059]", text: "text-[#d4af37]", bg: "bg-amber-950/60" },
};

const getQualityTheme = (qualityVal) => {
  const qNum = Number(qualityVal) || 1;
  return QUALITY_COLORS[qNum] || DEFAULT_QUALITY;
};

const ESO_TRAIT_NAMES = {
  // Armor Traits
  11: "Divines",
  12: "Infused",
  13: "Impenetrable",
  14: "Sturdy",
  15: "Well-Fitted",
  16: "Training",
  17: "Nirnhoned",
  18: "Reinforced",
  19: "Prosperous",

  // Weapon Traits
  1: "Powered",
  2: "Charged",
  3: "Precise",
  4: "Infused",
  5: "Defending",
  6: "Training",
  7: "Sharpened",
  8: "Decisive",
  9: "Nirnhoned",

  // Jewelry Traits
  21: "Arcane",
  22: "Healthy",
  23: "Robust",
  24: "Triune",
  25: "Bloodthirsty",
  26: "Harmony",
  27: "Protective",
  28: "Swift",
  29: "Infused",
};

const getTraitDisplayName = (item) => {
  if (item?.trait_name && item.trait_name.trim() !== "") {
    return cleanEsoText(item.trait_name);
  }
  if (item?.trait_id && ESO_TRAIT_NAMES[item.trait_id]) {
    return ESO_TRAIT_NAMES[item.trait_id];
  }
  return null;
};

const getItemLevelDisplay = (item) => {
  if (!item) return null;
  if (item.item_level && item.item_level > 50) return `CP ${item.item_level}`;
  if (item.item_level) return `Lvl ${item.item_level}`;
  return "CP 160";
};

export function AnatomicalEquipmentDiagram({ gearBySlot = {}, activeBar = "front" }) {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const leftSlots = SLOT_DEFINITIONS.filter((s) => s.side === "left");
  const rightSlots = SLOT_DEFINITIONS.filter((s) => s.side === "right");

  const activeHoveredItem = hoveredSlot !== null ? gearBySlot[hoveredSlot] : null;

  return (
    <div className="relative w-full bg-[#0a0a0d] border-2 border-[#2a2c33] p-4 flex flex-col items-center select-none shadow-2xl">
      <div className="font-cinzel text-xs font-bold text-[#c5a059] uppercase tracking-wider mb-2 flex items-center gap-2">
        <Shield className="size-4 text-[#c5a059]" />
        <span>Anatomical Equipment Loadout Diagram</span>
      </div>

      <div className="relative w-full grid grid-cols-1 md:grid-cols-7 gap-3 items-center min-h-[520px]">
        {/* Left Column: Armor Slots */}
        <div className="md:col-span-2 space-y-3">
          {leftSlots.map((slot) => {
            const item = gearBySlot[slot.slotId];
            const quality = getQualityTheme(item?.quality);
            const isHovered = hoveredSlot === slot.slotId;
            const traitName = getTraitDisplayName(item);
            const levelDisplay = getItemLevelDisplay(item);

            return (
              <div
                key={slot.slotId}
                onMouseEnter={() => setHoveredSlot(slot.slotId)}
                onMouseLeave={() => setHoveredSlot(null)}
                className={`p-2 bg-[#121218] border transition-colors cursor-pointer flex items-center justify-between gap-2 rounded-none ${
                  isHovered ? "border-[#c5a059] bg-[#c5a059]/15 shadow-md" : item ? `${quality.border} hover:border-[#c5a059]/60` : "border-[#2a2c33] opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <div className={`size-8 shrink-0 border ${item ? quality.border : "border-[#2a2c33]"} bg-[#0a0a0d] flex items-center justify-center p-0.5 relative`}>
                    {item?.item_icon ? (
                      <img src={item.item_icon} alt={item.item_name} className="size-full object-contain" />
                    ) : (
                      <Shield className="size-4 text-[#8a8275]" />
                    )}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-[10px] uppercase font-cinzel text-[#8a8275]">{slot.name}</span>
                      {item && (
                        <span className={`text-[9px] font-bold uppercase ${quality.text}`}>
                          [{quality.label}]
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold truncate block ${item ? quality.text : "text-[#8a8275]"}`}>
                      {item ? cleanEsoText(item.item_name) : "Empty Slot"}
                    </span>
                    {item && traitName && (
                      <span className="text-[10px] text-[#93c5fd] font-sans truncate block leading-tight">
                        Trait: {traitName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item && (
                    <span className="text-[9px] px-1 py-0.5 border border-[#2a2c33] bg-[#0a0a0d] text-[#e0d8c3] font-mono">
                      {levelDisplay}
                    </span>
                  )}
                  {item?.set_name && (
                    <span className="text-[9px] px-1 py-0.5 border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#d4af37] font-mono">
                      Set
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Column: SVG Anatomical Human Silhouette */}
        <div className="md:col-span-3 relative flex flex-col items-center justify-center min-h-[460px]">
          {/* Anatomical Human Body Silhouette */}
          <svg className="w-64 h-[420px] text-[#2a2c33] drop-shadow-lg" viewBox="0 0 200 400" fill="none" stroke="currentColor">
            {/* Head */}
            <circle cx="100" cy="45" r="22" strokeWidth="2" fill="#121218" />
            {/* Neck & Shoulders */}
            <path d="M 88,67 L 112,67 L 145,90 L 55,90 Z" strokeWidth="2" fill="#121218" />
            {/* Chest & Torso */}
            <path d="M 55,90 L 145,90 L 135,210 L 65,210 Z" strokeWidth="2" fill="#121218" />
            {/* Arms */}
            <path d="M 55,90 L 35,200 L 48,205 L 65,115 Z" strokeWidth="2" fill="#121218" />
            <path d="M 145,90 L 165,200 L 152,205 L 135,115 Z" strokeWidth="2" fill="#121218" />
            {/* Legs */}
            <path d="M 65,210 L 135,210 L 125,370 L 105,370 L 100,240 L 95,240 L 75,370 L 55,370 Z" strokeWidth="2" fill="#121218" />
          </svg>

          {/* SVG Dynamic Glowing Pointer Connector Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#c5a059]/60">
            {/* Head line */}
            <line x1="20%" y1="12%" x2="44%" y2="12%" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Shoulders line */}
            <line x1="20%" y1="24%" x2="38%" y2="22%" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Chest line */}
            <line x1="20%" y1="36%" x2="42%" y2="35%" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Hands line */}
            <line x1="20%" y1="48%" x2="32%" y2="50%" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Waist line */}
            <line x1="20%" y1="60%" x2="42%" y2="54%" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Legs line */}
            <line x1="20%" y1="72%" x2="40%" y2="70%" strokeWidth="1.5" strokeDasharray="3,3" />
            {/* Feet line */}
            <line x1="20%" y1="84%" x2="40%" y2="90%" strokeWidth="1.5" strokeDasharray="3,3" />

            {/* Right Column Lines */}
            <line x1="80%" y1="12%" x2="56%" y2="15%" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="80%" y1="24%" x2="68%" y2="50%" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="80%" y1="36%" x2="68%" y2="52%" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="80%" y1="48%" x2="68%" y2="46%" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="80%" y1="60%" x2="68%" y2="48%" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="80%" y1="72%" x2="65%" y2="30%" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="80%" y1="84%" x2="65%" y2="32%" strokeWidth="1.5" strokeDasharray="3,3" />
          </svg>
        </div>

        {/* Right Column: Jewelry & Weapons Slots */}
        <div className="md:col-span-2 space-y-3">
          {rightSlots.map((slot) => {
            const item = gearBySlot[slot.slotId];
            const quality = getQualityTheme(item?.quality);
            const isHovered = hoveredSlot === slot.slotId;
            const isWeaponBarActive = activeBar === "front" ? (slot.slotId === 4 || slot.slotId === 5) : (slot.slotId === 12 || slot.slotId === 13);
            const traitName = getTraitDisplayName(item);
            const levelDisplay = getItemLevelDisplay(item);

            return (
              <div
                key={slot.slotId}
                onMouseEnter={() => setHoveredSlot(slot.slotId)}
                onMouseLeave={() => setHoveredSlot(null)}
                className={`p-2 bg-[#121218] border transition-colors cursor-pointer flex items-center justify-between gap-2 rounded-none ${
                  isHovered
                    ? "border-[#c5a059] bg-[#c5a059]/15 shadow-md"
                    : isWeaponBarActive
                    ? `${quality.border} bg-[#c5a059]/5 border-l-4`
                    : item
                    ? `${quality.border} hover:border-[#c5a059]/60`
                    : "border-[#2a2c33] opacity-60"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <div className={`size-8 shrink-0 border ${item ? quality.border : "border-[#2a2c33]"} bg-[#0a0a0d] flex items-center justify-center p-0.5`}>
                    {item?.item_icon ? (
                      <img src={item.item_icon} alt={item.item_name} className="size-full object-contain" />
                    ) : (
                      <Zap className="size-4 text-[#8a8275]" />
                    )}
                  </div>
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1.5 leading-none">
                      <span className="text-[10px] uppercase font-cinzel text-[#8a8275]">{slot.name}</span>
                      {item && (
                        <span className={`text-[9px] font-bold uppercase ${quality.text}`}>
                          [{quality.label}]
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold truncate block ${item ? quality.text : "text-[#8a8275]"}`}>
                      {item ? cleanEsoText(item.item_name) : "Empty Slot"}
                    </span>
                    {item && traitName && (
                      <span className="text-[10px] text-[#93c5fd] font-sans truncate block leading-tight">
                        Trait: {traitName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item && (
                    <span className="text-[9px] px-1 py-0.5 border border-[#2a2c33] bg-[#0a0a0d] text-[#e0d8c3] font-mono">
                      {levelDisplay}
                    </span>
                  )}
                  {item?.set_name && (
                    <span className="text-[9px] px-1 py-0.5 border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#d4af37] font-mono">
                      Set
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reserved Fixed-Height Equipment Details Inspector Panel */}
      <div className="mt-4 w-full min-h-[140px] p-3.5 bg-[#161620] border-2 border-[#c5a059]/60 shadow-2xl text-xs flex flex-col justify-between">
        {activeHoveredItem ? (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#2a2c33] pb-1.5">
              <div className="flex items-center gap-2">
                {activeHoveredItem.item_icon && (
                  <img src={activeHoveredItem.item_icon} alt="" className="size-6 border border-[#c5a059]/40 bg-[#0a0a0d] p-0.5 object-contain" />
                )}
                <span className="font-cinzel font-bold text-sm text-[#e0d8c3]">{cleanEsoText(activeHoveredItem.item_name)}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${getQualityTheme(activeHoveredItem.quality).border} ${getQualityTheme(activeHoveredItem.quality).text}`}>
                {getQualityTheme(activeHoveredItem.quality).label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {activeHoveredItem.armor_rating > 0 && (
                <div className="text-[#8a8275]">
                  <span className="text-[#e0d8c3] font-semibold">Armor Rating:</span> {activeHoveredItem.armor_rating.toLocaleString()}
                </div>
              )}
              {activeHoveredItem.weapon_power > 0 && (
                <div className="text-[#8a8275]">
                  <span className="text-[#e0d8c3] font-semibold">Weapon Power:</span> {activeHoveredItem.weapon_power.toLocaleString()}
                </div>
              )}
              {activeHoveredItem.set_name && (
                <div className="text-[#d4af37] font-cinzel font-semibold col-span-2">
                  Set: {cleanEsoText(activeHoveredItem.set_name)}
                </div>
              )}
              {activeHoveredItem.trait_name && (
                <div className="text-[#93c5fd] col-span-2">
                  <span className="font-semibold text-[#60a5fa]">Trait:</span> {cleanEsoText(activeHoveredItem.trait_name)}
                  {activeHoveredItem.trait_description && (
                    <span className="text-[#8a8275] block text-[10px] mt-0.5">{cleanEsoText(activeHoveredItem.trait_description)}</span>
                  )}
                </div>
              )}
              {activeHoveredItem.enchantment_description && (
                <div className="text-[#e0d8c3] col-span-2 bg-[#0a0a0d]/60 p-2 border border-[#2a2c33]">
                  <span className="font-semibold text-[#c5a059] block text-[10px] uppercase mb-0.5">Enchantment Glyph:</span>
                  {renderEsoFormattedText(activeHoveredItem.enchantment_description)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#8a8275] space-y-1">
            <Info className="size-5 text-[#c5a059]/70 mb-1" />
            <span className="font-cinzel text-xs font-semibold text-[#e0d8c3] uppercase tracking-wider">Item Inspector</span>
            <p className="text-[11px] text-[#8a8275] max-w-md">
              Hover over any equipment slot in the diagram above to inspect full item stats, glyph enchantments, traits, and armor ratings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
