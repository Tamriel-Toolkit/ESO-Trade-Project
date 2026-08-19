import React, { useState } from "react";
import { 
    X, Shield, Sparkles, Sword, Plus, Trash2, Check, Search, AlertTriangle, 
    Lock, ShoppingCart, Info, Save
} from "lucide-react";
import { createCustomBuild } from "@/api/api";

const ESO_CLASSES = ["Arcanist", "Dragonknight", "Necromancer", "Nightblade", "Sorcerer", "Templar", "Warden", "All"];
const ESO_ROLES = ["Magicka DPS", "Stamina DPS", "Tank", "Healer", "Solo / Arena", "PvP"];

const DEFAULT_SLOTS = [
    { slot_id: 0, slot_name: "Head", item_name: "Monster Helm or Set Hat", set_name: "Stormfist", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 0, source_location: "Dungeon - Tempest Island" },
    { slot_id: 3, slot_name: "Shoulders", item_name: "Monster Shoulders", set_name: "Stormfist", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 0, source_location: "Undaunted Pledge Master" },
    { slot_id: 2, slot_name: "Chest", item_name: "Order's Wrath Jerkin", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 16, slot_name: "Hands", item_name: "Order's Wrath Bracers", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 6, slot_name: "Waist", item_name: "Order's Wrath Belt", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 7, slot_name: "Legs", item_name: "Order's Wrath Guards", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 8, slot_name: "Feet", item_name: "Order's Wrath Boots", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 1, slot_name: "Neck", item_name: "Deadly Necklace", set_name: "Deadly Strike", item_type: "Necklace", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Cyrodiil / Guild Traders" },
    { slot_id: 9, slot_name: "Ring 1", item_name: "Deadly Ring", set_name: "Deadly Strike", item_type: "Ring", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Cyrodiil / Guild Traders" },
    { slot_id: 11, slot_name: "Ring 2", item_name: "Deadly Ring", set_name: "Deadly Strike", item_type: "Ring", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Cyrodiil / Guild Traders" },
    { slot_id: 4, slot_name: "Main Hand 1", item_name: "Deadly Dagger", set_name: "Deadly Strike", item_type: "One-Handed Dagger", trait_name: "Nirnhoned", enchantment: "Flame Damage", quality: 5, is_tradeable: 1, source_location: "Cyrodiil / Guild Traders" },
    { slot_id: 5, slot_name: "Off Hand 1", item_name: "Deadly Dagger", set_name: "Deadly Strike", item_type: "One-Handed Dagger", trait_name: "Charged", enchantment: "Poison Damage", quality: 5, is_tradeable: 1, source_location: "Cyrodiil / Guild Traders" },
    { slot_id: 12, slot_name: "Main Hand 2", item_name: "Maelstrom Greatsword", set_name: "Merciless Charge", item_type: "Two-Handed Greatsword", trait_name: "Infused", enchantment: "Weapon Damage", quality: 5, is_tradeable: 0, source_location: "Arena - Maelstrom Arena" }
];

const POPULAR_SETS = [
    { name: "Order's Wrath", type: "Crafted", is_tradeable: 1, source: "Crafted - High Isle" },
    { name: "Deadly Strike", type: "Overland/PvP", is_tradeable: 1, source: "Cyrodiil / Guild Traders" },
    { name: "Briarheart", type: "Overland", is_tradeable: 1, source: "Overland - Wrothgar" },
    { name: "Frostbite", type: "Overland", is_tradeable: 1, source: "Overland - Blackwood" },
    { name: "Rallying Cry", type: "PvP", is_tradeable: 1, source: "Cyrodiil / Guild Traders" },
    { name: "Shattered Fate", type: "Crafted", is_tradeable: 1, source: "Crafted - Apocrypha" },
    { name: "Pillar of Nirn", type: "Dungeon", is_tradeable: 0, source: "Dungeon - Falkreath Hold" },
    { name: "Ansuul's Torment", type: "Trial", is_tradeable: 0, source: "Trial - Sanity's Edge" },
    { name: "Velothi Ur-Mage's Amulet", type: "Mythic", is_tradeable: 0, source: "Mythic - Antiquities" },
    { name: "Stormfist", type: "Monster", is_tradeable: 0, source: "Dungeon - Tempest Island" },
    { name: "Turning Tide", type: "Dungeon", is_tradeable: 0, source: "Dungeon - Shipwright's Regret" },
    { name: "Spell Power Cure", type: "Dungeon", is_tradeable: 0, source: "Dungeon - White-Gold Tower" }
];

const TRAITS_BY_SLOT = {
    Armor: ["Divines", "Infused", "Impenetrable", "Reinforced", "Sturdy", "Well-Fitted", "Training"],
    Weapon: ["Precise", "Nirnhoned", "Charged", "Infused", "Sharpened", "Decisive", "Powered", "Defending"],
    Jewelry: ["Bloodthirsty", "Infused", "Arcane", "Robust", "Triune", "Harmony", "Swift", "Protective"]
};

export function BuildCreatorModal({ onClose, onBuildCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [buildClass, setBuildClass] = useState("Arcanist");
    const [role, setRole] = useState("Stamina DPS");
    const [author, setAuthor] = useState("");
    const [sourceUrl, setSourceUrl] = useState("");
    const [slots, setSlots] = useState(DEFAULT_SLOTS);
    const [editingSlotIndex, setEditingSlotIndex] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // Slot Editor State
    const [searchTerm, setSearchTerm] = useState("");

    const handleOpenSlotPicker = (index) => {
        setEditingSlotIndex(index);
        setSearchTerm("");
    };

    const handleSelectSetForSlot = (setObj) => {
        if (editingSlotIndex === null) return;
        const currentSlot = slots[editingSlotIndex];
        const newSlots = [...slots];
        newSlots[editingSlotIndex] = {
            ...currentSlot,
            set_name: setObj.name,
            item_name: `${setObj.name} ${currentSlot.slot_name}`,
            is_tradeable: setObj.is_tradeable,
            source_location: setObj.source
        };
        setSlots(newSlots);
        setEditingSlotIndex(null);
    };

    const handleUpdateSlotField = (index, field, value) => {
        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
    };

    const handleSaveBuild = async () => {
        if (!title.trim()) {
            setError("Please provide a build title.");
            return;
        }

        setSaving(true);
        setError(null);

        const payload = {
            title: title.trim(),
            description: description.trim(),
            class: buildClass,
            role,
            author: author.trim() || undefined,
            source_url: sourceUrl.trim() || undefined,
            items: slots
        };

        const res = await createCustomBuild(payload);
        setSaving(false);

        if (res && res.success) {
            if (onBuildCreated) onBuildCreated(res.build_id);
            onClose();
        } else {
            setError(res?.error || "Failed to save custom build.");
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Create Custom Build"
        >
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#111116] border-2 border-[#c5a059]/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#c5a059]/30 bg-gradient-to-r from-[#181822] via-[#14141c] to-[#181822] flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                            Forge New Arsenal Loadout
                        </span>
                        <h2 className="text-xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#fce2a6] via-[#e6c278] to-[#c5a059]">
                            Create Custom Build & Kiosk Tracker
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#c5a059]/30"
                        aria-label="Close modal"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                            <AlertTriangle className="size-4 shrink-0 text-red-400" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Metadata Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] mb-1">
                                Build Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Stamina Arcanist Solo Arena Brawler"
                                className="w-full px-3.5 py-2 rounded-lg bg-[#0e0e13] border border-[#c5a059]/30 text-[#fce2a6] placeholder:text-muted-foreground text-sm focus:outline-none focus:border-[#c5a059]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] mb-1">
                                Class
                            </label>
                            <select
                                value={buildClass}
                                onChange={(e) => setBuildClass(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-lg bg-[#0e0e13] border border-[#c5a059]/30 text-[#fce2a6] text-sm focus:outline-none focus:border-[#c5a059]"
                            >
                                {ESO_CLASSES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] mb-1">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-lg bg-[#0e0e13] border border-[#c5a059]/30 text-[#fce2a6] text-sm focus:outline-none focus:border-[#c5a059]"
                            >
                                {ESO_ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] mb-1">
                                Description & Rotation Notes
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Brief overview of playstyle, skill rotation highlights, and set interactions..."
                                className="w-full px-3.5 py-2 rounded-lg bg-[#0e0e13] border border-[#c5a059]/30 text-[#fce2a6] placeholder:text-muted-foreground text-xs focus:outline-none focus:border-[#c5a059]"
                            />
                        </div>
                    </div>

                    {/* 12 Individual Slot Configuration */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#e6c278] uppercase flex items-center gap-1.5">
                                <Shield className="size-3.5" /> 12 Equipment Slots Architecture
                            </h3>
                            <span className="text-[11px] text-muted-foreground">
                                Click any slot to change set, trait, or tradeability.
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {slots.map((slot, idx) => {
                                const slotCategory = slot.slot_id === 1 || slot.slot_id === 9 || slot.slot_id === 11 
                                    ? "Jewelry" 
                                    : slot.slot_id === 4 || slot.slot_id === 5 || slot.slot_id === 12 
                                    ? "Weapon" 
                                    : "Armor";
                                const traits = TRAITS_BY_SLOT[slotCategory] || TRAITS_BY_SLOT.Armor;

                                return (
                                    <div 
                                        key={slot.slot_id}
                                        className="p-3.5 rounded-xl bg-[#14141c] border border-[#c5a059]/20 hover:border-[#c5a059]/50 transition-all space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059] bg-[#c5a059]/10 px-2 py-0.5 rounded border border-[#c5a059]/20">
                                                    {slot.slot_name}
                                                </span>
                                                <h4 className="font-cinzel font-bold text-sm text-[#fce2a6] mt-1">
                                                    {slot.set_name} ({slot.slot_name})
                                                </h4>
                                            </div>
                                            <button
                                                onClick={() => handleOpenSlotPicker(idx)}
                                                className="px-2.5 py-1 rounded bg-[#1c1c28] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel transition-all"
                                            >
                                                Change Set
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#c5a059]/10 text-xs">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">Trait:</label>
                                                <select
                                                    value={slot.trait_name}
                                                    onChange={(e) => handleUpdateSlotField(idx, "trait_name", e.target.value)}
                                                    className="w-full px-2 py-1 rounded bg-[#0e0e13] border border-white/10 text-gray-200 text-xs"
                                                >
                                                    {traits.map((t) => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-muted-foreground block mb-0.5">Enchant:</label>
                                                <input
                                                    type="text"
                                                    value={slot.enchantment}
                                                    onChange={(e) => handleUpdateSlotField(idx, "enchantment", e.target.value)}
                                                    className="w-full px-2 py-1 rounded bg-[#0e0e13] border border-white/10 text-gray-200 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                                            {slot.is_tradeable ? (
                                                <span className="text-emerald-400 flex items-center gap-1">
                                                    <ShoppingCart className="size-3" /> Tradeable on Guild Kiosks
                                                </span>
                                            ) : (
                                                <span className="text-red-400 flex items-center gap-1">
                                                    <Lock className="size-3" /> Bind on Pickup
                                                </span>
                                            )}
                                            <span className="italic truncate max-w-[140px]">
                                                {slot.source_location}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#c5a059]/30 bg-[#0e0e13] flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-xs font-cinzel font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveBuild}
                        disabled={saving}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#c5a059] to-[#e6c278] hover:from-[#d4af37] hover:to-[#fce2a6] text-black font-cinzel font-bold text-xs shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="size-4" /> {saving ? "Saving Build..." : "Save Custom Build"}
                    </button>
                </div>
            </div>

            {/* Nested Slot Set Picker Modal */}
            {editingSlotIndex !== null && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#14141c] border border-[#c5a059]/40 rounded-xl p-5 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-[#c5a059]/20 pb-3">
                            <h3 className="font-cinzel font-bold text-[#fce2a6] text-sm">
                                Select Set for {slots[editingSlotIndex]?.slot_name}
                            </h3>
                            <button
                                onClick={() => setEditingSlotIndex(null)}
                                className="text-muted-foreground hover:text-white"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="relative">
                            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search sets (e.g. Order's Wrath, Pillar of Nirn)..."
                                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0e0e13] border border-[#c5a059]/30 text-xs text-[#fce2a6] placeholder:text-muted-foreground focus:outline-none focus:border-[#c5a059]"
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                            {POPULAR_SETS.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((setObj) => (
                                <button
                                    key={setObj.name}
                                    onClick={() => handleSelectSetForSlot(setObj)}
                                    className="w-full p-2.5 rounded-lg bg-[#0e0e13] hover:bg-[#c5a059]/10 border border-white/5 hover:border-[#c5a059]/40 transition-all text-left flex items-center justify-between group"
                                >
                                    <div>
                                        <div className="font-cinzel font-bold text-xs text-[#fce2a6] group-hover:text-white">
                                            {setObj.name}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {setObj.source} • {setObj.type}
                                        </div>
                                    </div>
                                    {setObj.is_tradeable ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                                            Tradeable
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/40 text-red-400 border border-red-500/30">
                                            BOP
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default BuildCreatorModal;
