import React, { useState, useEffect, useMemo } from "react";
import { X, Award, Sparkles, CheckCircle2, Layers } from "lucide-react";
import { fetchCharacterProfile } from "@/api/api";
import { AnatomicalEquipmentDiagram, ESO_TRAIT_NAMES } from "./AnatomicalEquipmentDiagram";
import { getAllianceIcon } from "@/components/ui/alliance-icons";
import { cleanEsoText } from "@/lib/utils";
import { useDialogFocus } from "@/hooks/useDialogFocus";

const ALLIANCE_NAMES = {
  1: { name: "Aldmeri Dominion", color: "text-[#e6c15a] border-[#e6c15a]/40 bg-amber-950/20" },
  2: { name: "Ebonheart Pact", color: "text-red-400 border-red-600/40 bg-red-950/20" },
  3: { name: "Daggerfall Covenant", color: "text-blue-400 border-blue-600/40 bg-blue-950/20" }
};

export function CharacterProfileModal({ character, onClose }) {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [activeWeaponBar, setActiveWeaponBar] = useState("front"); // "front" or "back"
  const dialogRef = useDialogFocus(Boolean(character), onClose);

  useEffect(() => {
    if (character?.id) {
      setLoading(true);
      fetchCharacterProfile(character.id).then((res) => {
        if (res && res.success) {
          setProfileData(res);
        }
        setLoading(false);
      });
    }
  }, [character]);

  const gearBySlot = profileData?.gear || {};

  // Set Bonus Intelligence Counter (with ESO 2H Weapon Rule = 2 pieces)
  const setBonusAnalysis = useMemo(() => {
    const counts = {};

    // Standard Armor & Jewelry items ALWAYS active:
    const activeItems = [
      gearBySlot[0], // Head
      gearBySlot[1], // Neck
      gearBySlot[2], // Chest
      gearBySlot[3], // Shoulders
      gearBySlot[16] || gearBySlot[13], // Hands
      gearBySlot[6], // Waist
      gearBySlot[8] || gearBySlot[7], // Legs
      gearBySlot[9] || gearBySlot[8], // Feet
      gearBySlot[11] || gearBySlot[9], // Ring 1
      gearBySlot[12] || gearBySlot[10], // Ring 2
    ].filter(Boolean);

    activeItems.forEach((item) => {
      if (item && item.set_name) {
        const sName = cleanEsoText(item.set_name);
        counts[sName] = (counts[sName] || 0) + 1;
      }
    });

    // Active Weapon Bar Slots
    const mainWeapon = activeWeaponBar === "front" ? gearBySlot[4] : (gearBySlot[20] || gearBySlot[12]);
    const offWeapon = activeWeaponBar === "front" ? gearBySlot[5] : (gearBySlot[21] || gearBySlot[13]);

    if (mainWeapon && mainWeapon.set_name) {
      const sName = cleanEsoText(mainWeapon.set_name);
      // Check if 2H weapon (Staff, Bow, Greatsword, etc. or if offhand slot is empty/2H)
      const is2H = !offWeapon || mainWeapon.item_category?.includes("Two Handed") || mainWeapon.item_category?.includes("Staff") || mainWeapon.item_category?.includes("Bow");
      const weight = is2H ? 2 : 1;
      counts[sName] = (counts[sName] || 0) + weight;
    }

    if (offWeapon && offWeapon.set_name) {
      const sName = cleanEsoText(offWeapon.set_name);
      counts[sName] = (counts[sName] || 0) + 1;
    }

    return counts;
  }, [gearBySlot, activeWeaponBar]);

  // Trait Breakdown Analytics
  const traitAnalysis = useMemo(() => {
    const traits = {};
    Object.values(gearBySlot).forEach((item) => {
      if (item.trait_name || item.trait_id) {
        const tName = item.trait_name ? cleanEsoText(item.trait_name) : (ESO_TRAIT_NAMES[item.trait_id] || `Trait #${item.trait_id}`);
        if (tName && tName !== "None" && tName !== "0") {
          traits[tName] = (traits[tName] || 0) + 1;
        }
      }
    });
    return traits;
  }, [gearBySlot]);

  // Escape key handler, focus return, and dialog tab order use useDialogFocus.

  if (!character) return null;

  const allianceInfo = ALLIANCE_NAMES[character.alliance] || ALLIANCE_NAMES[1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Character Equipment Profile for ${character.name}`}
      className="character-profile-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
    >
      <div ref={dialogRef} tabIndex={-1} className="character-profile-panel w-full max-w-6xl rounded-none bg-[#19191b] border border-[#e6c15a]/60 text-[#efe5cf] shadow-2xl">
        {/* Header Bar */}
        <div className="character-profile-heading flex items-center justify-between border-b border-[#403c33] p-6">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-none border-2 border-[#e6c15a] bg-[#111214] flex items-center justify-center p-1" aria-hidden="true">
              {getAllianceIcon(character.alliance, "size-8")}
            </div>
            <div>
              <p className="exchange-eyebrow mb-2">{allianceInfo.name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-cinzel text-xl font-extrabold text-[#efe5cf] uppercase tracking-wide">
                  {character.name}
                </h2>
                {Boolean(character.master_crafter_unlocked) && (
                  <span className="px-2 py-0.5 bg-[#e6c15a]/20 border border-[#e6c15a] text-[#e6c15a] text-xs font-cinzel font-bold uppercase flex items-center gap-1">
                    <Award className="size-3 text-[#e6c15a]" aria-hidden="true" /> Master Crafter
                  </span>
                )}
              </div>
              <p className="text-xs text-[#afa797] font-mono mt-0.5">
                Level {character.level || 50} • {character.class || "Dragonknight"}
              </p>
            </div>
          </div>

          <div className="character-profile-actions flex items-center gap-3">
            {/* Active Bar Toggle */}
            <div className="flex items-center gap-1 bg-[#111214] p-1 border border-[#403c33]" role="group" aria-label="Weapon Bar Selection">
              <button
                type="button"
                onClick={() => setActiveWeaponBar("front")}
                aria-pressed={activeWeaponBar === "front"}
                className={`px-3 py-1 text-xs font-cinzel font-bold uppercase border transition-all cursor-pointer ${
                  activeWeaponBar === "front" ? "bg-[#e6c15a] text-[#111214] border-[#e6c15a]" : "text-[#afa797] border-transparent hover:text-[#efe5cf]"
                }`}
              >
                Front Bar
              </button>
              <button
                type="button"
                onClick={() => setActiveWeaponBar("back")}
                aria-pressed={activeWeaponBar === "back"}
                className={`px-3 py-1 text-xs font-cinzel font-bold uppercase border transition-all cursor-pointer ${
                  activeWeaponBar === "back" ? "bg-[#e6c15a] text-[#111214] border-[#e6c15a]" : "text-[#afa797] border-transparent hover:text-[#efe5cf]"
                }`}
              >
                Back Bar
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close character profile modal"
              className="p-1.5 rounded-none text-[#afa797] hover:text-[#efe5cf] hover:bg-[#202022] cursor-pointer"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        {loading ? (
          <div className="py-20 text-center font-cinzel text-xs text-[#e6c15a] uppercase tracking-wider flex flex-col items-center gap-2">
            <div className="animate-spin size-8 border-b-2 border-[#e6c15a]"></div>
            <span>Loading equipment...</span>
          </div>
        ) : (
          <div className="character-profile-body grid grid-cols-1 lg:grid-cols-3 gap-5 p-6">
            {/* Left Col (2/3): Anatomical Equipment Diagram */}
            <div className="lg:col-span-2">
              <AnatomicalEquipmentDiagram gearBySlot={gearBySlot} activeBar={activeWeaponBar} />
            </div>

            {/* Right Col (1/3): Active Set Bonuses & Trait Analytics Sidebar */}
            <div className="space-y-4 text-xs">
              {/* Active Set Bonus Counter */}
              <div className="p-4 bg-[#111214] border border-[#403c33] space-y-3">
                <span className="font-cinzel font-bold text-xs text-[#e6c15a] uppercase tracking-wider block flex items-center justify-between">
                  <span>Set bonuses · {activeWeaponBar === "front" ? "Front bar" : "Back bar"}</span>
                  <Layers className="size-4 text-[#e6c15a]" />
                </span>

                {Object.keys(setBonusAnalysis).length === 0 ? (
                  <p className="text-xs text-[#afa797] italic">No active set pieces logged for this loadout.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(setBonusAnalysis).map(([sName, count]) => {
                      const isActive5Piece = count >= 5;
                      const isMonster = count === 2;

                      return (
                        <div
                          key={sName}
                          className={`p-2.5 border ${
                            isActive5Piece
                              ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-300"
                              : isMonster
                              ? "border-amber-500/50 bg-amber-950/20 text-[#e6c15a]"
                              : "border-[#403c33] bg-[#19191b] text-[#efe5cf]"
                          }`}
                        >
                          <div className="flex items-center justify-between font-cinzel font-bold text-xs">
                            <span>{sName}</span>
                            <span className="font-mono bg-[#111214] px-1.5 py-0.5 border border-[#403c33]">
                              {count} Pieces
                            </span>
                          </div>
                          <div className="text-xs text-[#afa797] mt-1 flex items-center gap-1 font-mono">
                            <CheckCircle2 className="size-3 text-emerald-400" />
                            <span>{count >= 5 ? "Full 5-Piece Bonus Active" : `${count} Set Bonuses Active`}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Armor & Weapon Trait Analytics */}
              <div className="p-4 bg-[#111214] border border-[#403c33] space-y-3">
                <span className="font-cinzel font-bold text-xs text-[#e6c15a] uppercase tracking-wider block flex items-center justify-between">
                  <span>Equipped traits</span>
                  <Sparkles className="size-4 text-[#e6c15a]" />
                </span>

                {Object.keys(traitAnalysis).length === 0 ? (
                  <p className="text-xs text-[#afa797] italic">No trait data parsed for this loadout.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(traitAnalysis).map(([tName, count]) => (
                      <div key={tName} className="p-2 border border-[#403c33] bg-[#19191b] flex items-center justify-between">
                        <span className="font-semibold text-[#efe5cf]">{tName}</span>
                        <span className="font-mono text-[#e6c15a] font-bold">x{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
