import React, { useState, useEffect, useMemo } from "react";
import { 
    X, Shield, Sparkles, Sword, Plus, Trash2, Check, Search, AlertTriangle, 
    Lock, ShoppingCart, Info, Save, Layers, RefreshCw
} from "lucide-react";
import { createCustomBuild, fetchSets, resolveSetItem } from "@/api/api";
import { getEsoIconUrl, cleanEsoText } from "@/lib/utils";

const ESO_CLASSES = ["Arcanist", "Dragonknight", "Necromancer", "Nightblade", "Sorcerer", "Templar", "Warden", "All"];
const ESO_ROLES = ["Magicka DPS", "Stamina DPS", "Tank", "Healer", "Solo / Arena", "PvP"];

const DEFAULT_SLOTS = [
    { slot_id: 0, slot_name: "Head", item_name: "Stormfist Mask", set_name: "Stormfist", item_type: "Medium Armor", armor_weight: "Medium", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_undauntedstormatronach_head_a.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 0, source_location: "Tempest Island" },
    { slot_id: 3, slot_name: "Shoulders", item_name: "Stormfist Arm Cops", set_name: "Stormfist", item_type: "Medium Armor", armor_weight: "Medium", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_undauntedstormatronach_shoulder_a.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 0, source_location: "Undaunted Pledge" },
    { slot_id: 2, slot_name: "Chest", item_name: "Order's Wrath Jerkin", set_name: "Order's Wrath", item_type: "Light Armor", armor_weight: "Light", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_light_shirt_d.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 16, slot_name: "Hands", item_name: "Order's Wrath Bracers", set_name: "Order's Wrath", item_type: "Medium Armor", armor_weight: "Medium", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_medium_hands_d.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 6, slot_name: "Waist", item_name: "Order's Wrath Belt", set_name: "Order's Wrath", item_type: "Medium Armor", armor_weight: "Medium", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_medium_waist_d.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 7, slot_name: "Legs", item_name: "Order's Wrath Guards", set_name: "Order's Wrath", item_type: "Medium Armor", armor_weight: "Medium", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_medium_legs_d.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 8, slot_name: "Feet", item_name: "Order's Wrath Boots", set_name: "Order's Wrath", item_type: "Medium Armor", armor_weight: "Medium", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_medium_feet_d.png", trait_name: "Divines", enchantment: "Max Stamina", quality: 4, is_tradeable: 1, source_location: "Crafted - High Isle" },
    { slot_id: 1, slot_name: "Neck", item_name: "Deadly Necklace", set_name: "Deadly Strike", item_type: "Necklace", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_neck_a.png", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Cyrodiil / Traders" },
    { slot_id: 9, slot_name: "Ring 1", item_name: "Deadly Ring", set_name: "Deadly Strike", item_type: "Ring", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_ring_a.png", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Cyrodiil / Traders" },
    { slot_id: 11, slot_name: "Ring 2", item_name: "Deadly Ring", set_name: "Deadly Strike", item_type: "Ring", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_ring_a.png", trait_name: "Bloodthirsty", enchantment: "Weapon Damage", quality: 4, is_tradeable: 1, source_location: "Cyrodiil / Traders" },
    { slot_id: 4, slot_name: "Main Hand 1", item_name: "Deadly Dagger", set_name: "Deadly Strike", item_type: "One-Handed Dagger", weapon_type: "Dagger", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_dagger_d.png", trait_name: "Nirnhoned", enchantment: "Flame Damage", quality: 5, is_tradeable: 1, source_location: "Cyrodiil / Traders" },
    { slot_id: 5, slot_name: "Off Hand 1", item_name: "Deadly Dagger", set_name: "Deadly Strike", item_type: "One-Handed Dagger", weapon_type: "Dagger", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_dagger_d.png", trait_name: "Charged", enchantment: "Poison Damage", quality: 5, is_tradeable: 1, source_location: "Cyrodiil / Traders" },
    { slot_id: 12, slot_name: "Main Hand 2", item_name: "Maelstrom Greatsword", set_name: "Merciless Charge", item_type: "Two-Handed Greatsword", weapon_type: "Greatsword", item_icon: "https://esoicons.uesp.net/esoui/art/icons/gear_breton_staff_d.png", trait_name: "Infused", enchantment: "Weapon Damage", quality: 5, is_tradeable: 0, source_location: "Maelstrom Arena" }
];

const SET_CATEGORIES = [
    { label: "All Sets", value: "All" },
    { label: "Tradeable", value: "Tradeable" },
    { label: "Bound", value: "BOP" },
    { label: "Crafted / Overland", value: "Crafted / Overland" },
    { label: "Dungeon / Trial", value: "Dungeon / Trial" },
    { label: "Monster (2pc)", value: "Monster" },
    { label: "Mythic (1pc)", value: "Mythic" },
    { label: "Arena", value: "Arena / Special" }
];

const TRAITS_BY_SLOT = {
    Armor: ["Divines", "Infused", "Impenetrable", "Reinforced", "Sturdy", "Well-Fitted", "Training"],
    Weapon: ["Precise", "Nirnhoned", "Charged", "Infused", "Sharpened", "Decisive", "Powered", "Defending"],
    Jewelry: ["Bloodthirsty", "Infused", "Arcane", "Robust", "Triune", "Harmony", "Swift", "Protective"]
};

const WEAPON_OPTIONS = [
    "Dagger", "Sword", "Axe", "Mace", "Bow", 
    "Inferno Staff", "Lightning Staff", "Ice Staff", "Restoration Staff", 
    "Greatsword", "Battleaxe", "Maul", "Shield"
];

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
        setSelectedCategory("All");
    };

    const handleSelectSetForSlot = async (setObj) => {
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

        try {
            const res = await resolveSetItem({
                set: setObj.name,
                slot_id: currentSlot.slot_id,
                slot_name: currentSlot.slot_name,
                weight: currentSlot.armor_weight || "Medium",
                weapon: currentSlot.weapon_type || "Dagger"
            });
            if (res && res.success && res.item_name) {
                setSlots((prev) => {
                    const copy = [...prev];
                    copy[editingSlotIndex] = {
                        ...copy[editingSlotIndex],
                        item_name: res.item_name,
                        item_icon: res.item_icon,
                        game_item_id: res.game_item_id
                    };
                    return copy;
                });
            }
        } catch (e) {
            console.error("Failed to resolve set item:", e);
        }
    };

    const handleWeightOrWeaponChange = async (index, field, value) => {
        const currentSlot = slots[index];
        const newSlots = [...slots];
        newSlots[index] = { ...currentSlot, [field]: value };
        setSlots(newSlots);

        if (currentSlot.set_name) {
            try {
                const res = await resolveSetItem({
                    set: currentSlot.set_name,
                    slot_id: currentSlot.slot_id,
                    slot_name: currentSlot.slot_name,
                    weight: field === "armor_weight" ? value : currentSlot.armor_weight || "Medium",
                    weapon: field === "weapon_type" ? value : currentSlot.weapon_type || "Dagger"
                });
                if (res && res.success && res.item_name) {
                    setSlots((prev) => {
                        const copy = [...prev];
                        copy[index] = {
                            ...copy[index],
                            item_name: res.item_name,
                            item_icon: res.item_icon,
                            game_item_id: res.game_item_id
                        };
                        return copy;
                    });
                }
            } catch (e) {
                console.error("Failed to re-resolve item on weight/weapon change:", e);
            }
        }
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
            setError(res?.error || "Failed to save build.");
        }
    };

    const filteredSets = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return allSets.filter((s) => {
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
                <div className="px-6 py-4 border-b border-[#2a2c33] bg-[#161620] flex items-center justify-between relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent pointer-events-none" />
                    <div>
                        <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059]">
                            Custom Loadout
                        </span>
                        <h2 className="text-xl font-cinzel font-bold text-[#e0d8c3] tracking-wide">
                            Create Custom Build
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-none text-muted-foreground hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-[#c5a059]/30 cursor-pointer"
                        aria-label="Close modal"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3 rounded-none bg-red-950/40 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 font-cinzel">
                            <AlertTriangle className="size-4 shrink-0 text-red-400" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-cinzel font-bold text-[#fce2a6] uppercase tracking-wider mb-1">
                                Build Title *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Stamina Arcanist Solo Brawler"
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
                                Notes & Rotation
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Playstyle notes, skill highlights, and set interactions..."
                                className="w-full px-3.5 py-2 rounded-none bg-[#14141c] border border-[#2a2c33] text-[#e0d8c3] placeholder:text-muted-foreground text-xs focus:outline-none focus:border-[#c5a059]"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-cinzel font-bold tracking-wider text-[#c5a059] uppercase flex items-center gap-1.5">
                                <Shield className="size-3.5" /> Equipment Slots
                            </h3>
                            <span className="text-[11px] text-muted-foreground font-cinzel">
                                Choose from all 712 ESO sets with custom weights and weapon types.
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {slots.map((slot, idx) => {
                                const isJewelry = slot.slot_id === 1 || slot.slot_id === 9 || slot.slot_id === 11;
                                const isWeapon = slot.slot_id === 4 || slot.slot_id === 5 || slot.slot_id === 12;
                                const slotCategory = isJewelry ? "Jewelry" : isWeapon ? "Weapon" : "Armor";
                                const traits = TRAITS_BY_SLOT[slotCategory] || TRAITS_BY_SLOT.Armor;
                                const itemIconUrl = getEsoIconUrl(slot.item_icon);

                                return (
                                    <div 
                                        key={slot.slot_id}
                                        className="p-3.5 rounded-none bg-[#13131b] border border-[#2a2c33] hover:border-[#c5a059]/50 transition-all space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2.5">
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="size-10 shrink-0 border border-[#2a2c33] bg-[#0a0a0d] p-1 flex items-center justify-center">
                                                    {itemIconUrl ? (
                                                        <img src={itemIconUrl} alt="" className="size-full object-contain" />
                                                    ) : (
                                                        <Shield className="size-4 text-[#8a8275]" />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-cinzel font-bold uppercase tracking-wider text-[#c5a059] bg-[#0a0a0d] px-2 py-0.5 rounded-none border border-[#2a2c33]">
                                                            {slot.slot_name}
                                                        </span>
                                                        {slot.armor_weight && !isWeapon && !isJewelry && (
                                                            <span className="text-[9px] font-cinzel font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-none bg-[#1a1a24] text-[#c5a059] border border-[#c5a059]/30">
                                                                {slot.armor_weight}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="font-cinzel font-bold text-sm text-[#e0d8c3] mt-0.5 truncate" title={slot.item_name}>
                                                        {slot.item_name}
                                                    </h4>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        Set: <span className="text-gray-300 font-medium">{slot.set_name}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleOpenSlotPicker(idx)}
                                                className="px-2.5 py-1 rounded-none bg-[#1c1c28] hover:bg-[#c5a059]/20 text-[#e6c278] border border-[#c5a059]/30 text-xs font-cinzel uppercase tracking-wider transition-all cursor-pointer shrink-0"
                                            >
                                                Change Set
                                            </button>
                                        </div>

                                        {!isJewelry && (
                                            <div className="pt-1.5 border-t border-[#2a2c33]/60 flex items-center justify-between gap-2 text-xs">
                                                <span className="text-[10px] font-cinzel uppercase tracking-wider text-muted-foreground">
                                                    {isWeapon ? "Weapon Type:" : "Armor Weight:"}
                                                </span>

                                                {isWeapon ? (
                                                    <select
                                                        value={slot.weapon_type || "Dagger"}
                                                        onChange={(e) => handleWeightOrWeaponChange(idx, "weapon_type", e.target.value)}
                                                        className="px-2 py-0.5 rounded-none bg-[#0a0a0d] border border-[#2a2c33] text-[#e0d8c3] text-[11px] font-cinzel uppercase focus:border-[#c5a059]"
                                                    >
                                                        {WEAPON_OPTIONS.map((w) => (
                                                            <option key={w} value={w}>{w}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-1 bg-[#0a0a0d] p-0.5 border border-[#2a2c33]">
                                                        {["Light", "Medium", "Heavy"].map((w) => (
                                                            <button
                                                                key={w}
                                                                type="button"
                                                                onClick={() => handleWeightOrWeaponChange(idx, "armor_weight", w)}
                                                                className={`px-2 py-0.5 text-[10px] font-cinzel font-bold uppercase transition-all cursor-pointer ${
                                                                    (slot.armor_weight || "Medium") === w
                                                                        ? "bg-[#c5a059] text-black shadow-sm"
                                                                        : "text-muted-foreground hover:text-white"
                                                                }`}
                                                            >
                                                                {w}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

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
                                                    <ShoppingCart className="size-3" /> Tradeable
                                                </span>
                                            ) : (
                                                <span className="text-red-400 flex items-center gap-1">
                                                    <Lock className="size-3" /> Bound
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
                        className="px-4 py-2 rounded-none text-xs font-cinzel font-semibold text-muted-foreground hover:text-white hover:bg-white/5 transition-all uppercase tracking-wider cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveBuild}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-none bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="size-4" /> {saving ? "Saving..." : "Save Build"}
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
                                    Set Catalog ({allSets.length} Sets)
                                </span>
                                <h3 className="font-cinzel font-bold text-[#e0d8c3] text-base uppercase tracking-wider">
                                    Select Set ({slots[editingSlotIndex]?.slot_name})
                                </h3>
                            </div>
                            <button
                                onClick={() => setEditingSlotIndex(null)}
                                className="p-1 rounded-none text-muted-foreground hover:text-white hover:bg-white/5 cursor-pointer"
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
                                placeholder="Search 712 sets by name, bonus, or source..."
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
                                        className={`px-2.5 py-1 rounded-none text-[11px] font-cinzel font-semibold whitespace-nowrap uppercase tracking-wider transition-all cursor-pointer ${
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
                                    Loading sets...
                                </div>
                            ) : filteredSets.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground font-cinzel text-xs">
                                    No sets found for "{searchTerm}".
                                </div>
                            ) : (
                                filteredSets.map((setObj) => (
                                    <button
                                        key={setObj.name}
                                        onClick={() => handleSelectSetForSlot(setObj)}
                                        className="w-full p-3 rounded-none bg-[#0a0a0d] hover:bg-[#181824] border border-[#2a2c33] hover:border-[#c5a059]/60 transition-all text-left flex flex-col gap-1.5 group cursor-pointer"
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
                                                    Bound
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
                            <span className="text-[#c5a059]">Click a set to equip</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default BuildCreatorModal;
