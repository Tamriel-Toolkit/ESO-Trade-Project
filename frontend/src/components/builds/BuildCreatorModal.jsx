import React, { useState, useEffect, useMemo } from "react";
import { 
    X, Shield, Sparkles, Sword, Plus, Trash2, Check, Search, AlertTriangle, 
    Lock, ShoppingCart, Info, Save, Layers, RefreshCw
} from "lucide-react";
import { createCustomBuild, fetchSets } from "@/api/api";

const ESO_CLASSES = ["Arcanist", "Dragonknight", "Necromancer", "Nightblade", "Sorcerer", "Templar", "Warden", "All"];
const ESO_ROLES = ["Magicka DPS", "Stamina DPS", "Tank", "Healer", "Solo / Arena", "PvP"];

const DEFAULT_SLOTS = [
    { slot_id: 0, slot_name: "Head", item_name: "Monster Helm or Set Hat", set_name: "Stormfist", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 0, source_location: "Veteran Dungeon / Undaunted Pledges" },
    { slot_id: 3, slot_name: "Shoulders", item_name: "Monster Shoulders", set_name: "Stormfist", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 0, source_location: "Veteran Dungeon / Undaunted Pledges" },
    { slot_id: 2, slot_name: "Chest", item_name: "Order's Wrath Jerkin", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 16, slot_name: "Hands", item_name: "Order's Wrath Bracers", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 6, slot_name: "Waist", item_name: "Order's Wrath Belt", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 7, slot_name: "Legs", item_name: "Order's Wrath Guards", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 8, slot_name: "Feet", item_name: "Order's Wrath Boots", set_name: "Order's Wrath", item_type: "Medium Armor", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 1, slot_name: "Neck", item_name: "Deadly Strike Necklace", set_name: "Deadly Strike", item_type: "Necklace", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 9, slot_name: "Ring 1", item_name: "Deadly Strike Ring", set_name: "Deadly Strike", item_type: "Ring", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 11, slot_name: "Ring 2", item_name: "Deadly Strike Ring", set_name: "Deadly Strike", item_type: "Ring", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 4, slot_name: "Main Hand 1", item_name: "Deadly Strike Dagger", set_name: "Deadly Strike", item_type: "One-Handed Dagger", trait_name: "Nirnhoned", enchantment: "Flame Damage", quality: 5, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 5, slot_name: "Off Hand 1", item_name: "Deadly Strike Dagger", set_name: "Deadly Strike", item_type: "One-Handed Dagger", trait_name: "Charged", enchantment: "Poison Damage", quality: 5, is_tradeable: 1, source_location: "Craftable or Zone Kiosks" },
    { slot_id: 12, slot_name: "Main Hand 2", item_name: "Maelstrom Greatsword", set_name: "Merciless Charge", item_type: "Two-Handed Greatsword", trait_name: "Infused", enchantment: "Weapon Damage", quality: 5, is_tradeable: 0, source_location: "Arena / Special Drop" }
];

const SET_CATEGORIES = [
    { label: "All Sets", value: "All" },
    { label: "🛒 Tradeable", value: "Tradeable" },
    { label: "🔒 Bind on Pickup", value: "BOP" },
    { label: "Crafted / Overland", value: "Crafted / Overland" },
    { label: "Dungeon / Trial", value: "Dungeon / Trial" },
    { label: "Monster (2pc)", value: "Monster" },
    { label: "Mythic (1pc)", value: "Mythic" },
    { label: "Arena / Special", value: "Arena / Special" }
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

    // All 712 ESO Sets State
    const [allSets, setAllSets] = useState([]);
    const [setsLoading, setSetsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    useEffect(() => {
        setSetsLoading(true);
        fetchSets({ limit: 1000 }).then((res) => {
            if (res && res.success && Array.isArray(res.sets)) {
                setAllSets(res.sets);
            }
            setSetsLoading(false);
        }).catch(() => setSetsLoading(false));
    }, []);

    const handleOpenSlotPicker = (index) => {
        setEditingSlotIndex(index);
        setSearchTerm("");
        // If Head or Shoulders, default to Monster or All
        const slot = slots[index];
        if (slot?.slot_id === 0 || slot?.slot_id === 3) {
            setSelectedCategory("All");
        } else {
            setSelectedCategory("All");
        }
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

    // Filter sets based on search and category
    const filteredSets = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return allSets.filter((s) => {
            // Category check
            if (selectedCategory === "Tradeable" && s.is_tradeable !== 1) return false;
            if (selectedCategory === "BOP" && s.is_tradeable !== 0) return false;
            if (
                selectedCategory !== "All" && 
                selectedCategory !== "Tradeable" && 
                selectedCategory !== "BOP" && 
                s.category !== selectedCategory
            ) {
                return false;
            }

            // Search query check
            if (!q) return true;
            return (
                s.name.toLowerCase().includes(q) ||
                (s.category && s.category.toLowerCase().includes(q)) ||
                (s.source && s.source.toLowerCase().includes(q)) ||
                (s.bonuses && s.bonuses.some(b => b.toLowerCase().includes(q)))
            );
        });
    }, [allSets, searchTerm, selectedCategory]);

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Create Custom Build"
        >
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#111116] border-2 border-[#c5a059]/50 rounded-none shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#2a2c33] bg-[#161620] flex items-center justify-between relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent pointer-events-none" />
                    <div>
                        <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                            Forge New Arsenal Loadout
                        </span>
                        <h2 className="text-xl font-cinzel font-bold text-[#e0d8c3] tracking-wide">
                            Create Custom Build & Kiosk Tracker
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-none text-muted-foreground hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#c5a059]/30"
                        aria-label="Close modal"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0a0a0d]">
                    {error && (
                        <div className="p-3 rounded-none bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                            <AlertTriangle className="size-4 shrink-0 text-red-400" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Metadata Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] uppercase tracking-wider mb-1">
                                Build Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Stamina Arcanist Solo Arena Brawler"
                                className="w-full px-3.5 py-2 rounded-none bg-[#14141c] border border-[#2a2c33] text-[#e0d8c3] placeholder:text-muted-foreground text-sm focus:outline-none focus:border-[#c5a059] font-cinzel"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] uppercase tracking-wider mb-1">
                                Class
                            </label>
                            <select
                                value={buildClass}
                                onChange={(e) => setBuildClass(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-none bg-[#14141c] border border-[#2a2c33] text-[#e0d8c3] text-sm focus:outline-none focus:border-[#c5a059] font-cinzel"
                            >
                                {ESO_CLASSES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] uppercase tracking-wider mb-1">
                                Role
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-none bg-[#14141c] border border-[#2a2c33] text-[#e0d8c3] text-sm focus:outline-none focus:border-[#c5a059] font-cinzel"
                            >
                                {ESO_ROLES.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] uppercase tracking-wider mb-1">
                                Description & Rotation Notes
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Brief overview of playstyle, skill rotation highlights, and set interactions..."
                                className="w-full px-3.5 py-2 rounded-none bg-[#14141c] border border-[#2a2c33] text-[#e0d8c3] placeholder:text-muted-foreground text-xs focus:outline-none focus:border-[#c5a059]"
                            />
                        </div>
                    </div>

                    {/* 12 Individual Slot Configuration */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#c5a059] uppercase flex items-center gap-1.5">
                                <Shield className="size-3.5" /> 12 Equipment Slots Architecture
                            </h3>
                            <span className="text-[11px] text-muted-foreground font-cinzel">
                                Click any slot to choose from all 712 ESO sets.
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
                                        className="p-3.5 rounded-none bg-[#13131b] border border-[#2a2c33] hover:border-[#c5a059]/50 transition-all space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059] bg-[#0a0a0d] px-2 py-0.5 rounded-none border border-[#2a2c33]">
                                                    {slot.slot_name}
                                                </span>
                                                <h4 className="font-cinzel font-bold text-sm text-[#e0d8c3] mt-1">
                                                    {slot.set_name} ({slot.slot_name})
                                                </h4>
                                            </div>
                                            <button
                                                onClick={() => handleOpenSlotPicker(idx)}
                                                className="px-2.5 py-1 rounded-none bg-[#1c1c28] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel uppercase tracking-wider transition-all"
                                            >
                                                Change Set
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#2a2c33] text-xs">
                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-cinzel uppercase tracking-wider block mb-0.5">Trait:</label>
                                                <select
                                                    value={slot.trait_name}
                                                    onChange={(e) => handleUpdateSlotField(idx, "trait_name", e.target.value)}
                                                    className="w-full px-2 py-1 rounded-none bg-[#0a0a0d] border border-[#2a2c33] text-gray-200 text-xs font-cinzel"
                                                >
                                                    {traits.map((t) => (
                                                        <option key={t} value={t}>{t}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-[10px] text-muted-foreground font-cinzel uppercase tracking-wider block mb-0.5">Enchant:</label>
                                                <input
                                                    type="text"
                                                    value={slot.enchantment}
                                                    onChange={(e) => handleUpdateSlotField(idx, "enchantment", e.target.value)}
                                                    className="w-full px-2 py-1 rounded-none bg-[#0a0a0d] border border-[#2a2c33] text-gray-200 text-xs font-cinzel"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 font-cinzel">
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
                <div className="px-6 py-4 border-t border-[#2a2c33] bg-[#0e0e13] flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-none text-xs font-cinzel font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition-all uppercase tracking-wider"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveBuild}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="size-4" /> {saving ? "Saving Build..." : "Save Custom Build"}
                    </button>
                </div>
            </div>

            {/* Nested Slot Set Picker Modal (All 712 ESO Sets) */}
            {editingSlotIndex !== null && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="w-full max-w-2xl max-h-[85vh] bg-[#14141c] border-2 border-[#c5a059]/50 rounded-none p-5 shadow-2xl space-y-3.5 flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-[#2a2c33] pb-3">
                            <div>
                                <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                                    Tamriel Set Catalog ({allSets.length} Sets Total)
                                </span>
                                <h3 className="font-cinzel font-bold text-[#e0d8c3] text-base uppercase tracking-wider">
                                    Select Set for {slots[editingSlotIndex]?.slot_name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setEditingSlotIndex(null)}
                                className="p-1 rounded-none text-muted-foreground hover:text-white hover:bg-white/5"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search all 712 sets by name, bonus, or drop location..."
                                autoFocus
                                className="w-full pl-10 pr-4 py-2.5 rounded-none bg-[#0a0a0d] border border-[#c5a059]/40 text-xs text-[#e0d8c3] placeholder:text-muted-foreground focus:outline-none focus:border-[#c5a059] font-cinzel"
                            />
                        </div>

                        {/* Category Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            {SET_CATEGORIES.map((cat) => {
                                const active = selectedCategory === cat.value;
                                return (
                                    <button
                                        key={cat.value}
                                        onClick={() => setSelectedCategory(cat.value)}
                                        className={`px-2.5 py-1 rounded-none text-[11px] font-cinzel font-semibold whitespace-nowrap uppercase tracking-wider transition-all ${
                                            active
                                                ? "bg-[#c5a059] text-black font-bold shadow-md"
                                                : "bg-[#0a0a0d] text-[#a89f91] hover:text-[#e0d8c3] border border-[#2a2c33] hover:border-[#c5a059]/40"
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Sets List */}
                        <div className="flex-1 max-h-96 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {setsLoading ? (
                                <div className="py-16 text-center text-muted-foreground font-cinzel text-xs">
                                    <RefreshCw className="size-6 animate-spin text-[#c5a059] mx-auto mb-2" />
                                    Querying 712 Tamriel sets...
                                </div>
                            ) : filteredSets.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground font-cinzel text-xs">
                                    No sets matching "{searchTerm}".
                                </div>
                            ) : (
                                filteredSets.map((setObj) => (
                                    <button
                                        key={setObj.name}
                                        onClick={() => handleSelectSetForSlot(setObj)}
                                        className="w-full p-3 rounded-none bg-[#0a0a0d] hover:bg-[#181824] border border-[#2a2c33] hover:border-[#c5a059]/60 transition-all text-left flex flex-col gap-1.5 group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-cinzel font-bold text-sm text-[#e0d8c3] group-hover:text-[#d4af37] transition-colors">
                                                    {setObj.name}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {setObj.category} • <span className="text-gray-300">{setObj.source}</span>
                                                </div>
                                            </div>
                                            {setObj.is_tradeable ? (
                                                <span className="shrink-0 px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-cinzel uppercase tracking-wider">
                                                    Tradeable
                                                </span>
                                            ) : (
                                                <span className="shrink-0 px-2 py-0.5 rounded-none text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-500/30 font-cinzel uppercase tracking-wider">
                                                    Bind on Pickup
                                                </span>
                                            )}
                                        </div>

                                        {/* Set Bonuses Preview */}
                                        {setObj.bonuses && setObj.bonuses.length > 0 && (
                                            <div className="text-[11px] text-[#8e8576] line-clamp-2 leading-relaxed bg-[#111116] p-1.5 border border-white/5">
                                                {setObj.bonuses.join(" • ")}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Set Count Status Footer */}
                        <div className="text-[11px] text-muted-foreground font-cinzel flex items-center justify-between pt-2 border-t border-[#2a2c33]">
                            <span>Showing {filteredSets.length} of {allSets.length} sets</span>
                            <span className="text-[#c5a059]">Click any set to equip to slot</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default BuildCreatorModal;
