import React, { useState } from "react";
import { Shield, Sparkles, Zap, Award, Info, Sword } from "lucide-react";
import { renderEsoFormattedText, cleanEsoText, getEsoIconUrl } from "@/lib/utils";

const SLOT_DEFINITIONS = [
  // Left Column (Armor)
  { slotId: 0, name: "Head", side: "left", anchorY: "12%", lineTarget: { x: "44%", y: "11%" }, iconType: "armor" },
  { slotId: 3, name: "Shoulders", side: "left", anchorY: "24%", lineTarget: { x: "32%", y: "23%" }, iconType: "armor" },
  { slotId: 2, name: "Chest", side: "left", anchorY: "36%", lineTarget: { x: "38%", y: "35%" }, iconType: "armor" },
  { slotId: 16, fallbackSlotIds: [13], name: "Hands", side: "left", anchorY: "48%", lineTarget: { x: "22%", y: "50%" }, iconType: "armor" },
  { slotId: 6, name: "Waist", side: "left", anchorY: "60%", lineTarget: { x: "36%", y: "53%" }, iconType: "armor" },
  { slotId: 7, fallbackSlotIds: [8], name: "Legs", side: "left", anchorY: "72%", lineTarget: { x: "38%", y: "70%" }, iconType: "armor" },
  { slotId: 8, fallbackSlotIds: [9], name: "Feet", side: "left", anchorY: "84%", lineTarget: { x: "34%", y: "92%" }, iconType: "armor" },

  // Right Column (Jewelry & Weapons)
  { slotId: 1, name: "Necklace", side: "right", anchorY: "12%", lineTarget: { x: "56%", y: "16%" }, iconType: "jewelry" },
  { slotId: 9, fallbackSlotIds: [11], name: "Ring 1", side: "right", anchorY: "24%", lineTarget: { x: "78%", y: "48%" }, iconType: "jewelry" },
  { slotId: 10, fallbackSlotIds: [12], name: "Ring 2", side: "right", anchorY: "36%", lineTarget: { x: "78%", y: "52%" }, iconType: "jewelry" },
  { slotId: 4, name: "Front Bar Main", side: "right", anchorY: "48%", lineTarget: { x: "80%", y: "50%" }, iconType: "weapon" },
  { slotId: 5, name: "Front Bar Off", side: "right", anchorY: "60%", lineTarget: { x: "80%", y: "55%" }, iconType: "weapon" },
  { slotId: 20, fallbackSlotIds: [12], name: "Back Bar Main", side: "right", anchorY: "72%", lineTarget: { x: "70%", y: "38%" }, iconType: "weapon" },
  { slotId: 21, fallbackSlotIds: [13], name: "Back Bar Off", side: "right", anchorY: "84%", lineTarget: { x: "70%", y: "42%" }, iconType: "weapon" },
];

const DEFAULT_QUALITY = { label: "Normal", border: "border-gray-500", text: "text-gray-300", bg: "bg-gray-900/60" };

const QUALITY_COLORS = {
  1: { label: "Normal", border: "border-gray-500", text: "text-gray-300", bg: "bg-gray-900/60" },
  2: { label: "Fine", border: "border-green-500", text: "text-green-400", bg: "bg-green-950/60" },
  3: { label: "Superior", border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-950/60" },
  4: { label: "Epic", border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-950/60" },
  5: { label: "Legendary", border: "border-[#c5a059]", text: "text-[#d4af37]", bg: "bg-amber-950/60" },
};

const getQualityTheme = (qualityVal, item = null) => {
  let qNum = Number(qualityVal);

  // Parse quality directly from item_link if qualityVal is missing
  if ((!qNum || isNaN(qNum)) && item?.item_link && item.item_link.includes(":")) {
    const parts = item.item_link.split(":");
    if (parts.length >= 7 && parts[5]) {
      const pQ = parseInt(parts[5], 10);
      if (!isNaN(pQ) && pQ >= 1 && pQ <= 5) {
        qNum = pQ;
      }
    }
  }

  qNum = qNum && qNum >= 1 && qNum <= 5 ? qNum : 1;
  return QUALITY_COLORS[qNum] || DEFAULT_QUALITY;
};

export const ESO_TRAIT_NAMES = {
  0: "None",
  // Weapon Traits (1-10)
  1: "Powered",
  2: "Charged",
  3: "Precise",
  4: "Infused",
  5: "Defending",
  6: "Training",
  7: "Sharpened",
  8: "Decisive",
  9: "Intricate",
  10: "Ornate",

  // Armor Traits (11-20)
  11: "Sturdy",
  12: "Impenetrable",
  13: "Reinforced",
  14: "Well-Fitted",
  15: "Training",
  16: "Infused",
  17: "Invigorating",
  18: "Divines",
  19: "Intricate",
  20: "Ornate",

  // Jewelry Traits (21-24, 27, 30-35)
  21: "Healthy",
  22: "Arcane",
  23: "Robust",
  24: "Intricate",
  25: "Nirnhoned",
  26: "Nirnhoned",
  27: "Ornate",
  28: "Protective",
  29: "Swift",
  30: "Triune",
  31: "Bloodthirsty",
  32: "Harmony",
  33: "Swift",
  34: "Protective",
  35: "Infused"
};

export const DEFAULT_TRAIT_DESCRIPTIONS = {
  // Weapon Traits
  1: "Increases healing done by up to 9%.",
  2: "Increases chance to apply status effects by up to 480%.",
  3: "Increases Weapon and Spell Critical by up to 7.7%.",
  4: "Increases weapon enchantment effect by up to 30% and reduces enchantment cooldown by up to 50%.",
  5: "Increases total Armor by up to 3276.",
  6: "Increases experience gained from kills by up to 9%.",
  7: "Increases Armor Penetration by up to 3276.",
  8: "Chance to gain 1 additional Ultimate when gaining Ultimate by up to 60%.",
  9: "Increases Inspiration gained from deconstruction by up to 300%.",
  10: "Increases sell price to merchants by 280%.",

  // Armor Traits
  11: "Reduces Block cost by up to 4%.",
  12: "Increases Critical Resistance by up to 127.",
  13: "Increases this item's Armor value by up to 16%.",
  14: "Reduces Sprint, Roll Dodge, and Sneak cost by up to 5%.",
  15: "Increases experience gained from kills by up to 11%.",
  16: "Increases Armor Enchantment effect by up to 20%.",
  17: "Increases Health, Magicka, and Stamina Recovery by up to 16.",
  18: "Increases Mundus Stone effects by up to 9.1%.",
  19: "Increases Inspiration gained from deconstruction by up to 300%.",
  20: "Increases sell price to merchants by 280%.",

  // Jewelry & Nirnhoned
  21: "Increases Maximum Health by up to 957.",
  22: "Increases Maximum Magicka by up to 870.",
  23: "Increases Maximum Stamina by up to 870.",
  24: "Increases Inspiration gained from deconstruction by up to 300%.",
  25: "Increases Spell and Physical Resistance by up to 301.",
  26: "Increases Weapon and Spell Damage by up to 15%.",
  27: "Increases sell price to merchants by 280%.",
  28: "Increases Spell and Physical Resistance by up to 1190.",
  29: "Increases your Movement Speed by up to 7%.",
  30: "Increases Maximum Health by up to 478, Maximum Magicka by up to 435, and Maximum Stamina by up to 435.",
  31: "Increases your Damage done against enemies under 25% Health by up to 350.",
  32: "Increases the damage, healing, resource restore, and damage shield strength of synergies you activate by up to 880.",
  33: "Increases your Movement Speed by up to 7%.",
  34: "Increases Spell and Physical Resistance by up to 1190.",
  35: "Increases Jewelry Enchantment effectiveness by up to 60%."
};

const getGearItemForSlot = (gearBySlot, slotDef) => {
  if (!gearBySlot || !slotDef) return null;
  if (gearBySlot[slotDef.slotId]) return gearBySlot[slotDef.slotId];
  if (slotDef.fallbackSlotIds) {
    for (const fId of slotDef.fallbackSlotIds) {
      if (gearBySlot[fId]) return gearBySlot[fId];
    }
  }
  return null;
};

const getTraitDisplayName = (item) => {
  if (!item) return null;
  if (item.trait_name && item.trait_name.trim() !== "") {
    const cleaned = cleanEsoText(item.trait_name);
    if (cleaned && cleaned !== "None" && cleaned !== "0") {
      return cleaned;
    }
  }
  if (item.trait_id && ESO_TRAIT_NAMES[item.trait_id] && ESO_TRAIT_NAMES[item.trait_id] !== "None") {
    return ESO_TRAIT_NAMES[item.trait_id];
  }
  return null;
};

const getTraitDescription = (item) => {
  if (!item) return null;
  if (item.trait_description && item.trait_description.trim() !== "") {
    return item.trait_description;
  }
  if (item.trait_id && DEFAULT_TRAIT_DESCRIPTIONS[item.trait_id]) {
    return DEFAULT_TRAIT_DESCRIPTIONS[item.trait_id];
  }
  return null;
};

const getItemLevelDisplay = (item) => {
  if (!item) return null;
  if (item.item_level && item.item_level > 50) return `CP ${item.item_level}`;
  if (item.item_level) return `Lvl ${item.item_level}`;
  return "CP 160";
};

/**
 * Robust Item Icon Component with CDN URL Normalization and Graceful Fallback
 */
function SlotItemIcon({ icon, itemName, iconType = "armor", className = "size-full object-contain" }) {
  const [imgFailed, setImgFailed] = useState(false);
  const normalizedUrl = getEsoIconUrl(icon);

  if (normalizedUrl && !imgFailed) {
    return (
      <img
        src={normalizedUrl}
        alt={cleanEsoText(itemName) || "Item Icon"}
        onError={() => setImgFailed(true)}
        className={className}
        loading="lazy"
      />
    );
  }

  if (iconType === "weapon") {
    return <Sword className="size-4 text-[#c5a059]" />;
  }
  if (iconType === "jewelry") {
    return <Sparkles className="size-4 text-[#c5a059]" />;
  }
  return <Shield className="size-4 text-[#8a8275]" />;
}

export function AnatomicalEquipmentDiagram({ gearBySlot = {}, activeBar = "front" }) {
  const [hoveredSlot, setHoveredSlot] = useState(null);

  const leftSlots = SLOT_DEFINITIONS.filter((s) => s.side === "left");
  const rightSlots = SLOT_DEFINITIONS.filter((s) => s.side === "right");

  const activeHoveredSlotDef = hoveredSlot !== null ? SLOT_DEFINITIONS.find((s) => s.slotId === hoveredSlot) : null;
  const activeHoveredItem = activeHoveredSlotDef ? getGearItemForSlot(gearBySlot, activeHoveredSlotDef) : null;

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
            const item = getGearItemForSlot(gearBySlot, slot);
            const quality = getQualityTheme(item?.quality, item);
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
                    <SlotItemIcon
                      icon={item?.item_icon}
                      itemName={item?.item_name}
                      iconType={slot.iconType}
                    />
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
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Left Column Lines */}
            {leftSlots.map((slot) => {
              const isHovered = hoveredSlot === slot.slotId;
              const hasItem = Boolean(getGearItemForSlot(gearBySlot, slot));
              return (
                <line
                  key={`line-left-${slot.slotId}`}
                  x1="0%"
                  y1={slot.anchorY}
                  x2={slot.lineTarget.x}
                  y2={slot.lineTarget.y}
                  stroke={isHovered ? "#c5a059" : hasItem ? "#c5a059" : "#4a4d5a"}
                  strokeOpacity={isHovered ? 1 : hasItem ? 0.45 : 0.2}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray={isHovered ? "none" : "3,3"}
                  className="transition-all duration-200"
                />
              );
            })}

            {/* Right Column Lines */}
            {rightSlots.map((slot) => {
              const isHovered = hoveredSlot === slot.slotId;
              const hasItem = Boolean(getGearItemForSlot(gearBySlot, slot));
              return (
                <line
                  key={`line-right-${slot.slotId}`}
                  x1="100%"
                  y1={slot.anchorY}
                  x2={slot.lineTarget.x}
                  y2={slot.lineTarget.y}
                  stroke={isHovered ? "#c5a059" : hasItem ? "#c5a059" : "#4a4d5a"}
                  strokeOpacity={isHovered ? 1 : hasItem ? 0.45 : 0.2}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray={isHovered ? "none" : "3,3"}
                  className="transition-all duration-200"
                />
              );
            })}
          </svg>
        </div>

        {/* Right Column: Jewelry & Weapons Slots */}
        <div className="md:col-span-2 space-y-3">
          {rightSlots.map((slot) => {
            const item = getGearItemForSlot(gearBySlot, slot);
            const quality = getQualityTheme(item?.quality, item);
            const isHovered = hoveredSlot === slot.slotId;
            const isWeaponBarActive = activeBar === "front" ? (slot.slotId === 4 || slot.slotId === 5) : (slot.slotId === 20 || slot.slotId === 21);
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
                    <SlotItemIcon
                      icon={item?.item_icon}
                      itemName={item?.item_name}
                      iconType={slot.iconType}
                    />
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
                <div className="size-6 border border-[#c5a059]/40 bg-[#0a0a0d] p-0.5 flex items-center justify-center">
                  <SlotItemIcon
                    icon={activeHoveredItem.item_icon}
                    itemName={activeHoveredItem.item_name}
                    iconType={activeHoveredSlotDef?.iconType || "armor"}
                  />
                </div>
                <span className="font-cinzel font-bold text-sm text-[#e0d8c3]">{cleanEsoText(activeHoveredItem.item_name)}</span>
              </div>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 border ${getQualityTheme(activeHoveredItem.quality, activeHoveredItem).border} ${getQualityTheme(activeHoveredItem.quality, activeHoveredItem).text}`}>
                {getQualityTheme(activeHoveredItem.quality, activeHoveredItem).label}
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
              {getTraitDisplayName(activeHoveredItem) && (
                <div className="text-[#e0d8c3] col-span-2 sm:col-span-1 bg-[#0a0a0d]/60 p-2 border border-[#2a2c33]">
                  <span className="font-semibold text-[#60a5fa] block text-[10px] uppercase mb-0.5 flex items-center justify-between">
                    <span>Item Trait: {getTraitDisplayName(activeHoveredItem)}</span>
                    <Sparkles className="size-3 text-[#60a5fa]" />
                  </span>
                  {getTraitDescription(activeHoveredItem) ? (
                    <div className="text-[11px] text-[#93c5fd] leading-snug">{renderEsoFormattedText(getTraitDescription(activeHoveredItem))}</div>
                  ) : (
                    <p className="text-[11px] text-[#8a8275] italic">Active {getTraitDisplayName(activeHoveredItem)} trait bonus applied.</p>
                  )}
                </div>
              )}
              {activeHoveredItem.enchantment_description && (
                <div className="text-[#e0d8c3] col-span-2 sm:col-span-1 bg-[#0a0a0d]/60 p-2 border border-[#2a2c33]">
                  <span className="font-semibold text-[#c5a059] block text-[10px] uppercase mb-0.5 flex items-center justify-between">
                    <span>Enchantment Glyph</span>
                    <Zap className="size-3 text-[#c5a059]" />
                  </span>
                  <div className="text-[11px] text-[#e0d8c3] leading-snug">
                    {renderEsoFormattedText(activeHoveredItem.enchantment_description)}
                  </div>
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
