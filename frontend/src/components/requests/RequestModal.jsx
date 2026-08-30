import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Hammer, 
  ShoppingCart, 
  Search, 
  Coins, 
  Sparkles, 
  AlertCircle, 
  Check, 
  ShieldAlert,
  Loader2
} from "lucide-react";
import { createTradeRequest, fetchCraftableSets } from "../../api/api";
import { useAuth } from "../../context/AuthContext";

const TRAITS = [
  "None",
  "Divines",
  "Infused",
  "Precise",
  "Sharpened",
  "Charged",
  "Defending",
  "Powered",
  "Training",
  "Decisive",
  "Sturdy",
  "Impenetrable",
  "Reinforced",
  "Well-Fitted",
  "Invigorating",
  "Nirnhoned",
  "Arcane",
  "Healthy",
  "Robust",
  "Triune",
  "Bloodthirsty",
  "Harmony",
  "Swift",
  "Protective"
];

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
  { value: 5, label: "Legendary (Gold)", color: "text-[#e6c278]" }
];

export function RequestModal({ isOpen, onClose, defaultServer = "NA", onRequestCreated }) {
  const { user } = useAuth();

  const [requestType, setRequestType] = useState("CRAFTING");
  const [server, setServer] = useState(defaultServer);
  
  // Item search & selection
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Attribute specs
  const [craftableSets, setCraftableSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [selectedTrait, setSelectedTrait] = useState("Divines");
  const [selectedStyle, setSelectedStyle] = useState("Any Style");
  const [selectedQuality, setSelectedQuality] = useState(4); // Default Epic
  const [quantity, setQuantity] = useState(1);
  const [levelType, setLevelType] = useState("CP160");

  // Financials & Delivery
  const [offeredGold, setOfferedGold] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState(0);
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
        const res = await fetch(`http://localhost:5001/api/items?search=${encodeURIComponent(searchQuery)}&limit=10`);
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

  // Fetch suggested market price when item is selected
  useEffect(() => {
    if (!selectedItem) {
      setSuggestedPrice(0);
      return;
    }

    const fetchPrice = async () => {
      try {
        const res = await fetch(
          `http://localhost:5001/api/market/prices?search=${encodeURIComponent(selectedItem.name)}&server=${server}&limit=1`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            setSuggestedPrice(data.items[0].suggested_price || 0);
          } else {
            setSuggestedPrice(0);
          }
        }
      } catch (e) {
        console.error("Price check failed:", e);
      }
    };

    fetchPrice();
  }, [selectedItem, server]);

  if (!isOpen) return null;

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchQuery("");
    setSearchResults([]);

    // Auto-configure defaults based on category
    if (item.category === "Materials" || item.category === "Consumables") {
      setRequestType("WTB");
    } else {
      setRequestType("CRAFTING");
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
      setErrorMsg("Please search and select an authentic item from the catalog.");
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
        trait_name: requestType === "CRAFTING" ? selectedTrait : null,
        style_name: requestType === "CRAFTING" ? selectedStyle : null,
        set_name: (requestType === "CRAFTING" && selectedSet) ? selectedSet : null,
        level_req: levelType === "CP160" ? 50 : 50,
        cp_req: levelType === "CP160" ? 160 : 0,
        offered_gold_price: gold,
        suggested_price: suggestedPrice,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121218] border border-[#2a2c33] w-full max-w-2xl shadow-2xl relative overflow-hidden my-8">
        {/* Gold Trim Accent Top */}
        <div className="h-1 bg-gradient-to-r from-transparent via-[#c5a059] to-transparent w-full" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2a2c33] bg-[#0e0e13]">
          <div className="flex items-center gap-2.5">
            {requestType === "CRAFTING" ? (
              <Hammer className="size-6 text-[#c5a059]" />
            ) : (
              <ShoppingCart className="size-6 text-blue-400" />
            )}
            <div>
              <h3 className="font-cinzel font-bold text-lg text-[#e0d8c3]">
                Post Public Trade Request
              </h3>
              <p className="text-xs text-muted-foreground">
                Asynchronous matchmaking with in-game C.O.D. mail delivery.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Request Type Toggle & Megaserver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1.5 font-bold">
                Order Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRequestType("CRAFTING")}
                  className={`py-2 px-3 text-xs font-cinzel font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    requestType === "CRAFTING"
                      ? "bg-[#c5a059] text-black border-[#c5a059] shadow font-extrabold"
                      : "bg-[#0e0e13] border-[#2a2c33] text-muted-foreground hover:text-white"
                  }`}
                >
                  <Hammer className="size-3.5" />
                  Crafting
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType("WTB")}
                  className={`py-2 px-3 text-xs font-cinzel font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                    requestType === "WTB"
                      ? "bg-blue-600 text-white border-blue-500 shadow font-extrabold"
                      : "bg-[#0e0e13] border-[#2a2c33] text-muted-foreground hover:text-white"
                  }`}
                >
                  <ShoppingCart className="size-3.5" />
                  WTB
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1.5 font-bold">
                Megaserver
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setServer("NA")}
                  className={`py-2 px-3 text-xs font-cinzel font-bold transition-all cursor-pointer border ${
                    server === "NA"
                      ? "bg-[#c5a059] text-black border-[#c5a059] shadow font-extrabold"
                      : "bg-[#0e0e13] border-[#2a2c33] text-muted-foreground hover:text-white"
                  }`}
                >
                  North America (NA)
                </button>
                <button
                  type="button"
                  onClick={() => setServer("EU")}
                  className={`py-2 px-3 text-xs font-cinzel font-bold transition-all cursor-pointer border ${
                    server === "EU"
                      ? "bg-[#c5a059] text-black border-[#c5a059] shadow font-extrabold"
                      : "bg-[#0e0e13] border-[#2a2c33] text-muted-foreground hover:text-white"
                  }`}
                >
                  Europe (EU)
                </button>
              </div>
            </div>
          </div>

          {/* Item Catalog Selection (Dropdown-only Constraint) */}
          <div>
            <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1.5 font-bold">
              Target Item (Authoritative Catalog)
            </label>

            {selectedItem ? (
              <div className="p-3 bg-[#0e0e13] border border-[#c5a059] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-black/40 border border-[#2a2c33] p-1 flex items-center justify-center shrink-0">
                    {selectedItem.icon_url ? (
                      <img src={selectedItem.icon_url} alt="" className="size-full object-contain" />
                    ) : (
                      <Hammer className="size-5 text-[#c5a059]" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-sm text-[#e0d8c3]">
                      {selectedItem.name}
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      {selectedItem.category} {selectedItem.subcategory ? `• ${selectedItem.subcategory}` : ""}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="text-xs text-muted-foreground hover:text-red-400 uppercase font-cinzel font-bold cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item catalog by name (e.g. Rubedite Cuirass, Dreugh Wax, Kuta)..."
                  className="w-full pl-9 pr-8 py-2.5 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] placeholder:text-muted-foreground font-cinzel focus:outline-none focus:border-[#c5a059]"
                />
                {isSearching && (
                  <Loader2 className="size-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#c5a059]" />
                )}

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#121218] border border-[#2a2c33] max-h-56 overflow-y-auto z-20 shadow-2xl divide-y divide-[#2a2c33]/50">
                    {searchResults.map((item) => (
                      <div
                        key={item.game_item_id}
                        onClick={() => handleSelectItem(item)}
                        className="p-2.5 hover:bg-[#1c1c26] flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.icon_url}
                            alt=""
                            className="size-7 object-contain bg-black/40 p-0.5 border border-[#2a2c33]"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                          <div>
                            <span className="font-cinzel text-xs text-[#e0d8c3] block font-bold">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {item.category} • {item.subcategory || "Item"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[#c5a059]">
                          ID: {item.game_item_id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Conditional Attributes Builder */}
          {requestType === "CRAFTING" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#0a0a0d] border border-[#2a2c33]">
              {/* Craftable Set Selector */}
              <div className="sm:col-span-2">
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Craftable Set (Optional)
                </label>
                <select
                  value={selectedSet}
                  onChange={(e) => setSelectedSet(e.target.value)}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="">No Set (Standard Item)</option>
                  {craftableSets.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.category || "Crafted"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Trait Selector */}
              <div>
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Armor / Weapon Trait
                </label>
                <select
                  value={selectedTrait}
                  onChange={(e) => setSelectedTrait(e.target.value)}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  {TRAITS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Style Motif Selector */}
              <div>
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Style Motif
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  {STYLES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quality Selector */}
              <div>
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Target Quality
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  {QUALITIES.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level / CP */}
              <div>
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Item Level
                </label>
                <select
                  value={levelType}
                  onChange={(e) => setLevelType(e.target.value)}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="CP160">Champion Point 160 (Max)</option>
                  <option value="CP150">Champion Point 150</option>
                  <option value="LVL50">Level 50</option>
                  <option value="LVL1">Level 1-49 (Leveling Gear)</option>
                </select>
              </div>
            </div>
          ) : (
            /* WTB Mode Attribute Inputs */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#0a0a0d] border border-[#2a2c33]">
              <div>
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Desired Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-mono focus:outline-none focus:border-[#c5a059]"
                />
              </div>

              <div>
                <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                  Item Quality
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  {QUALITIES.map((q) => (
                    <option key={q.value} value={q.value}>
                      {q.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Financials & Market Guidance */}
          <div className="p-4 bg-[#0e0e13] border border-[#2a2c33] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="text-xs font-cinzel uppercase text-[#c5a059] block mb-1 font-bold flex items-center gap-1">
                  <Coins className="size-3.5" />
                  Offered Gold Bounty (Per Unit)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={offeredGold}
                    onChange={(e) => setOfferedGold(e.target.value)}
                    placeholder="e.g. 25000"
                    className="w-full py-2 px-3 bg-[#121218] border border-[#2a2c33] text-sm text-[#e6c278] font-mono font-bold focus:outline-none focus:border-[#c5a059]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    gold
                  </span>
                </div>
              </div>

              {/* Total Calculation & Guidance */}
              <div className="sm:w-56 text-right">
                <span className="text-[10px] uppercase font-cinzel text-muted-foreground block">
                  Total Bounty Payout
                </span>
                <span className="font-mono text-xl font-extrabold text-[#e6c278] block">
                  {((parseInt(offeredGold, 10) || 0) * (quantity || 1)).toLocaleString()}g
                </span>
                {suggestedPrice > 0 && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    TTC Suggested: {(suggestedPrice * (quantity || 1)).toLocaleString()}g
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* In-Game Handle & Delivery Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                In-Game ESO Handle (@Handle)
              </label>
              <input
                type="text"
                value={inGameHandle}
                onChange={(e) => setInGameHandle(e.target.value)}
                placeholder="@YourAccountHandle"
                className="w-full py-2 px-3 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] font-mono focus:outline-none focus:border-[#c5a059]"
              />
            </div>

            <div>
              <label className="text-xs font-cinzel uppercase text-muted-foreground block mb-1 font-bold">
                Optional Delivery Instructions
              </label>
              <input
                type="text"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Please send C.O.D. by 8pm EST!"
                className="w-full py-2 px-3 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] placeholder:text-muted-foreground focus:outline-none focus:border-[#c5a059]"
              />
            </div>
          </div>

          {/* Footer CTA */}
          <div className="pt-4 border-t border-[#2a2c33] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#161620] hover:bg-[#1c1c26] border border-[#2a2c33] text-xs font-cinzel text-muted-foreground hover:text-white uppercase transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Publishing Order...</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  <span>Publish Trade Request</span>
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
