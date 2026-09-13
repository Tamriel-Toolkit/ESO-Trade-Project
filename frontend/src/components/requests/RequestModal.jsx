import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Hammer, 
  ShoppingCart, 
  Search, 
  Coins, 
  Sparkles, 
  AlertCircle,
  Loader2,
  Package
} from "lucide-react";
import { createTradeRequest, fetchCraftableSets, apiFetch } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { getEsoIconUrl } from "@/lib/utils";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import "@/styles/requests-builds.css";

function getItemSetName(item, setsList = []) {
  if (!item) return null;
  if (item.set_name) return item.set_name;
  if (item.metadata?.set?.name) return item.metadata.set.name;
  if (item.metadata?.setName) return item.metadata.setName;
  if (item.metadata?.set_name) return item.metadata.set_name;

  const itemName = item.name || "";
  if (itemName.includes(" of ")) {
    const suffix = itemName.split(" of ").pop().trim();
    const match = setsList.find(s => s.name.toLowerCase() === suffix.toLowerCase());
    if (match) return match.name;
  }
  const exactSet = setsList.find(s => itemName.toLowerCase().includes(s.name.toLowerCase()));
  if (exactSet) return exactSet.name;
  return null;
}

export const ARMOR_TRAITS = [
  "None",
  "Divines",
  "Infused",
  "Impenetrable",
  "Reinforced",
  "Sturdy",
  "Training",
  "Well-Fitted",
  "Invigorating",
  "Nirnhoned"
];

export const WEAPON_TRAITS = [
  "None",
  "Charged",
  "Defending",
  "Infused",
  "Nirnhoned",
  "Powered",
  "Precise",
  "Sharpened",
  "Training",
  "Decisive"
];

export const JEWELRY_TRAITS = [
  "None",
  "Arcane",
  "Bloodthirsty",
  "Harmony",
  "Healthy",
  "Infused",
  "Protective",
  "Robust",
  "Swift",
  "Triune"
];

export function getApplicableTraits(item) {
  if (!item) return ARMOR_TRAITS;
  const cat = (item.category || "").toLowerCase();
  const subcat = (item.subcategory || "").toLowerCase();
  const itemType = (item.item_type || "").toLowerCase();

  if (cat.includes("weapon") || itemType.includes("weapon")) {
    return WEAPON_TRAITS;
  }
  if (cat.includes("jewelry") || subcat.includes("ring") || subcat.includes("necklace") || itemType.includes("jewelry")) {
    return JEWELRY_TRAITS;
  }
  return ARMOR_TRAITS;
}

const STYLES = [
  "Any Style",
  "Breton",
  "Redguard",
  "Orc",
  "High Elf",
  "Wood Elf",
  "Khajiit",
  "Nord",
  "Dark Elf",
  "Argonian",
  "Imperial",
  "Ancient Elf",
  "Barbaric",
  "Primal",
  "Daedric",
  "Dwemer",
  "Glass",
  "Xivkyn",
  "Mercenary",
  "Dremora",
  "Outlaw",
  "Minotaur",
  "Order of the Hour",
  "Ancestral High Elf",
  "Ancestral Nord",
  "Ancestral Orc"
];

const QUALITIES = [
  { value: 1, label: "Normal (White)", color: "text-gray-300" },
  { value: 2, label: "Fine (Green)", color: "text-emerald-400" },
  { value: 3, label: "Superior (Blue)", color: "text-blue-400" },
  { value: 4, label: "Epic (Purple)", color: "text-purple-400" },
  { value: 5, label: "Legendary (Gold)", color: "text-primary" }
];

export function RequestModal({ isOpen, onClose, defaultServer, onRequestCreated }) {
  const searchRef = useRef(null);
  const dialogRef = useDialogFocus(isOpen, onClose, searchRef);
  const { user } = useAuth();
  const { serverLocation } = useTheme();

  // Assume the megaserver is the one selected in user settings
  const server = defaultServer || serverLocation || "NA";
  
  // Item search & selection from catalog
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Dynamic attribute specs (derived automatically from selected item)
  const [requestType, setRequestType] = useState("WTB"); // Auto-set to CRAFTING or WTB based on item
  const [craftableSets, setCraftableSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [selectedTrait, setSelectedTrait] = useState("Divines");
  const [selectedStyle, setSelectedStyle] = useState("Any Style");
  const [selectedQuality, setSelectedQuality] = useState(4); // Default Epic
  const [quantity, setQuantity] = useState(1);
  const [levelType, setLevelType] = useState("CP160");

  // Financials & Delivery
  const [offeredGold, setOfferedGold] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [inGameHandle, setInGameHandle] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize handle and load craftable sets
  useEffect(() => {
    if (user) {
      setInGameHandle(user.eso_handle || user.username || "");
    }
    fetchCraftableSets().then((sets) => {
      if (Array.isArray(sets)) setCraftableSets(sets);
    });
  }, [user]);

  // Debounced item catalog search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiFetch(`/api/items?search=${encodeURIComponent(searchQuery)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.items || []);
        }
      } catch (e) {
        console.error("Item search failed:", e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  // Dynamically classify item into Gear/Crafting vs Materials/Items
  const isGearItem = selectedItem && (
    ["Weapons", "Apparel", "Jewelry", "Weapon", "Armor"].includes(selectedItem.category) ||
    selectedItem.category?.toLowerCase().includes("weapon") ||
    selectedItem.category?.toLowerCase().includes("armor") ||
    selectedItem.category?.toLowerCase().includes("apparel") ||
    selectedItem.category?.toLowerCase().includes("jewelry")
  );

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchQuery("");
    setSearchResults([]);

    const inherentSet = getItemSetName(item, craftableSets);
    if (inherentSet) {
      setSelectedSet(inherentSet);
    } else {
      setSelectedSet("");
    }

    const isGear = ["Weapons", "Apparel", "Jewelry", "Weapon", "Armor"].includes(item.category) ||
      item.category?.toLowerCase().includes("weapon") ||
      item.category?.toLowerCase().includes("armor") ||
      item.category?.toLowerCase().includes("apparel") ||
      item.category?.toLowerCase().includes("jewelry");

    const applicableTraits = getApplicableTraits(item);
    if (!applicableTraits.includes(selectedTrait)) {
      const cat = (item.category || "").toLowerCase();
      if (cat.includes("weapon") || (item.item_type || "").toLowerCase().includes("weapon")) {
        setSelectedTrait("Precise");
      } else if (cat.includes("jewelry") || (item.subcategory || "").toLowerCase().includes("ring") || (item.subcategory || "").toLowerCase().includes("necklace")) {
        setSelectedTrait("Bloodthirsty");
      } else {
        setSelectedTrait("Divines");
      }
    }

    if (isGear) {
      setRequestType("CRAFTING");
      setSelectedQuality(4); // Default Epic for gear
      setQuantity(1);
    } else {
      setRequestType("WTB");
      setSelectedQuality(1);
      setQuantity(item.category === "Materials" ? 8 : 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!user) {
      setErrorMsg("You must be logged in to create a trade request.");
      return;
    }

    if (!selectedItem) {
      setErrorMsg("Please search and select an item from the catalog.");
      return;
    }

    const gold = parseInt(offeredGold, 10);
    if (isNaN(gold) || gold <= 0) {
      setErrorMsg("Please enter a valid positive gold offer.");
      return;
    }

    if (!inGameHandle.trim()) {
      setErrorMsg("Please enter your in-game @Handle for C.O.D. delivery.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        request_type: requestType,
        server,
        buyer_display_handle: inGameHandle.trim(),
        game_item_id: selectedItem.game_item_id,
        item_name: selectedItem.name,
        category: selectedItem.category,
        subcategory: selectedItem.subcategory,
        quantity: parseInt(quantity, 10) || 1,
        quality: parseInt(selectedQuality, 10) || 1,
        trait_name: isGearItem ? selectedTrait : null,
        style_name: isGearItem ? selectedStyle : null,
        set_name: (isGearItem && selectedSet) ? selectedSet : null,
        level_req: levelType === "CP160" ? 50 : 50,
        cp_req: levelType === "CP160" ? 160 : 0,
        offered_gold_price: gold,
        delivery_notes: deliveryNotes.trim()
      };

      const res = await createTradeRequest(payload);
      if (res && res.success) {
        if (onRequestCreated) onRequestCreated();
        onClose();
      } else {
        setErrorMsg(res?.error || "Failed to create trade request.");
      }
    } catch (err) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exchange-modal-backdrop">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="request-modal-title" className="exchange-modal rb-modal max-w-2xl">
        {/* Gold Trim Accent Top */}
        <div className="h-px bg-primary/50" />

        {/* Modal Header */}
        <div className="exchange-modal-heading">
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="size-6 text-primary" />
            <div>
              <h2 id="request-modal-title">Post request</h2>
              <p className="text-sm text-muted-foreground">
                Choose an item, set your offer, and arrange delivery.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="exchange-close"
            aria-label="Close request form"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="rb-modal-body rb-request-form">
          {errorMsg && (
            <div role="alert" className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 text-sm flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Item Catalog Search (Primary Input) */}
          <div>
            <label htmlFor="request-item-search" className="text-sm text-muted-foreground block mb-1.5">
              Item
            </label>

            {selectedItem ? (
              <div className="rb-selected-item">
                <div className="flex items-center gap-3">
                  <div className="size-11 bg-black/50 border border-border p-1 flex items-center justify-center shrink-0">
                    {selectedItem.icon_url ? (
                      <img src={getEsoIconUrl(selectedItem.icon_url)} alt="" className="size-full object-contain" />
                    ) : (
                      <Package className="size-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-sans font-bold text-sm text-foreground">
                        {selectedItem.name}
                      </h4>
                      {isGearItem ? (
                        <span className="px-1.5 py-0.5 bg-primary/20 border border-primary/40 text-primary text-xs font-sans font-bold">
                          Gear request
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-blue-950/40 border border-blue-500/40 text-blue-300 text-xs font-sans font-bold">
                          Item request
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {selectedItem.category} {selectedItem.subcategory ? `• ${selectedItem.subcategory}` : ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-2 py-1 bg-secondary hover:bg-red-950/40 border border-border hover:border-red-500/40 text-sm text-muted-foreground hover:text-red-300 font-sans font-bold cursor-pointer transition-colors"
                >
                  Change item
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  id="request-item-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the item catalog"
                  className="w-full pl-9 pr-8 py-2.5 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground font-sans focus:outline-none focus:border-primary"
                  ref={searchRef}
                />
                {isSearching && (
                  <Loader2 className="size-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
                )}

                {/* Search Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="rb-catalog-results" aria-label="Catalog search results">
                    {searchResults.map((item) => (
                      <button type="button"
                        key={item.game_item_id}
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getEsoIconUrl(item.icon_url)}
                            alt=""
                            className="size-7 object-contain bg-black/40 p-0.5 border border-border"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                          <div>
                            <span className="font-sans text-sm text-foreground block font-bold">
                              {item.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {item.category} • {item.subcategory || "Item"}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs tabular-nums text-primary">
                          ID: {item.game_item_id}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. DYNAMIC ATTRIBUTE CONTROLS: Automatically Adapts to Selected Item */}
          {selectedItem && (
            isGearItem ? (
              /* Gear / Crafted Set Controls */
              <div className="rb-form-section">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <Hammer className="size-4 text-primary" />
                  <span className="text-sm font-sans font-bold tracking-normal text-primary">
                    Equipment details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* If item is already part of a set, show badge and omit selector; otherwise show craftable set dropdown */}
                  {getItemSetName(selectedItem, craftableSets) ? (
                    <div className="sm:col-span-2 p-2.5 bg-card border border-primary/40 flex items-center justify-between shadow-inner">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-sm font-sans text-foreground">
                          Set Piece: <strong className="text-primary">{getItemSetName(selectedItem, craftableSets)}</strong>
                        </span>
                      </div>
                      <span className="text-xs font-sans text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-800/40 font-bold">
                        Inherent Set Item
                      </span>
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                        Crafted set (optional)
                      </label>
                      <select
                        value={selectedSet}
                        aria-label="Crafted set"
                        onChange={(e) => setSelectedSet(e.target.value)}
                        className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                      >
                        <option value="">No set</option>
                        {craftableSets.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name} ({s.category || "Crafted"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Trait Selector (Filtered to applicable item discipline) */}
                  <div>
                    <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold flex items-center justify-between">
                      <span>Trait</span>
                      <span className="text-xs text-primary tabular-nums lowercase">
                        {getApplicableTraits(selectedItem) === WEAPON_TRAITS ? "weapon traits" : getApplicableTraits(selectedItem) === JEWELRY_TRAITS ? "jewelry traits" : "armor traits"}
                      </span>
                    </label>
                    <select
                      value={selectedTrait}
                      aria-label="Trait"
                      onChange={(e) => setSelectedTrait(e.target.value)}
                      className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                    >
                      {getApplicableTraits(selectedItem).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Style Motif Selector (Hidden for Jewelry) */}
                  {getApplicableTraits(selectedItem) !== JEWELRY_TRAITS && (
                    <div>
                      <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                        Style Motif
                      </label>
                      <select
                        value={selectedStyle}
                        aria-label="Style motif"
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                      >
                        {STYLES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Quality Selector */}
                  <div>
                    <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                      Target Quality
                    </label>
                    <select
                      value={selectedQuality}
                      aria-label="Target quality"
                      onChange={(e) => setSelectedQuality(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                    >
                      {QUALITIES.map((q) => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Level / CP */}
                  <div>
                    <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                      Item Level
                    </label>
                    <select
                      value={levelType}
                      aria-label="Item level"
                      onChange={(e) => setLevelType(e.target.value)}
                      className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                    >
                      <option value="CP160">Champion Point 160 (Max)</option>
                      <option value="CP150">Champion Point 150</option>
                      <option value="LVL50">Level 50</option>
                      <option value="LVL1">Level 1-49 (Leveling Gear)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Materials / Consumables / Items Controls */
              <div className="rb-form-section">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <ShoppingCart className="size-4 text-blue-400" />
                  <span className="text-sm font-sans font-bold tracking-normal text-blue-300">
                    Item details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                      Desired Quantity
                    </label>
                    <input
                      type="number"
                      aria-label="Desired quantity"
                      min="1"
                      max="5000"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground tabular-nums focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                      Item Quality
                    </label>
                    <select
                      value={selectedQuality}
                      aria-label="Item quality"
                      onChange={(e) => setSelectedQuality(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-card border border-border text-sm text-foreground font-sans focus:outline-none focus:border-primary"
                    >
                      {QUALITIES.map((q) => (
                        <option key={q.value} value={q.value}>{q.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )
          )}

          {/* 3. Financials & Market Guidance */}
          <div className="p-4 bg-background border border-border space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-sans text-primary block mb-1 font-bold flex items-center gap-1">
                  <Coins className="size-3.5" />
                  Gold offer per item
                </label>
                <div className="relative">
                  <input
                    type="number"
                    aria-label="Gold offer per item"
                    min="1"
                    value={offeredGold}
                    onChange={(e) => setOfferedGold(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full py-2 px-3 bg-card border border-border text-sm text-primary tabular-nums font-bold focus:outline-none focus:border-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm tabular-nums text-muted-foreground">
                    gold
                  </span>
                </div>
              </div>

              {/* Total Calculation & Guidance */}
              <div className="sm:w-56 text-right">
                <span className="text-xs font-sans text-muted-foreground block">
                  Total offer
                </span>
                <span className="tabular-nums text-xl font-semibold text-primary block">
                  {((parseInt(offeredGold, 10) || 0) * (quantity || 1)).toLocaleString()}g
                </span>
              </div>
            </div>
          </div>

          {/* 4. In-Game Handle & Delivery Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                In-Game ESO Handle (@Handle)
              </label>
              <input
                type="text"
                aria-label="In-game ESO handle"
                value={inGameHandle}
                onChange={(e) => setInGameHandle(e.target.value)}
                placeholder="@YourAccountHandle"
                className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground tabular-nums focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm font-sans text-muted-foreground block mb-1 font-bold">
                Optional Delivery Instructions
              </label>
              <input
                type="text"
                aria-label="Delivery instructions"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Please send C.O.D. by 8pm EST!"
                className="w-full py-2 px-3 bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Footer CTA */}
          <div className="rb-modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="exchange-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedItem}
              className="exchange-primary disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Publishing…</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Publish request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RequestModal;
