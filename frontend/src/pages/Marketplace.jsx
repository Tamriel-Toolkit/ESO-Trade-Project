import { useEffect, useState, useMemo } from "react";
import {
  Search,
  X,
  Tag,
  Store,
  MapPin,
  TrendingUp,
  Sparkles,
  Zap,
  Info
} from "lucide-react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";

import Navbar from "@/components/ui/navbar";
import { useTheme } from "@/components/theme-provider";
import { fetchTaxonomy, fetchMarketListings, fetchMarketPrices } from "@/api/api";

const RARITY_MAP = {
  1: { label: "Normal", color: "border-gray-500 text-gray-400 bg-gray-500/10" },
  2: { label: "Fine", color: "border-green-500 text-green-400 bg-green-500/10" },
  3: { label: "Superior", color: "border-blue-500 text-blue-400 bg-blue-500/10" },
  4: { label: "Epic", color: "border-purple-500 text-purple-400 bg-purple-500/10" },
  5: { label: "Legendary", color: "border-amber-500 text-amber-400 bg-amber-500/10" },
};

function Marketplace() {
  const { serverLocation, platform } = useTheme();

  // State Management
  const [viewMode, setViewMode] = useState("listings"); // "listings" | "prices"
  const [taxonomy, setTaxonomy] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedRarity, setSelectedRarity] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("value_index");
  const [dealsOnly, setDealsOnly] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Data & Selection State
  const [itemsData, setItemsData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Fetch Taxonomy on Mount
  useEffect(() => {
    fetchTaxonomy().then((data) => {
      if (data) setTaxonomy(data);
    });
  }, []);

  // Fetch Market Data when filters/server/page change
  useEffect(() => {
    setIsLoading(true);
    const offset = (currentPage - 1) * itemsPerPage;

    const params = {
      server: serverLocation,
      limit: itemsPerPage,
      offset: offset,
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedSubcategory && { subcategory: selectedSubcategory }),
      ...(selectedRarity && { rarity: selectedRarity }),
      ...(sortOption && { sort: sortOption }),
    };

    if (viewMode === "listings") {
      if (dealsOnly) params.min_value_index = 1.2;
      fetchMarketListings(params).then((res) => {
        setItemsData(res.listings || []);
        setTotalItems(res.total || 0);
        setIsLoading(false);
      });
    } else {
      fetchMarketPrices(params).then((res) => {
        setItemsData(res.items || []);
        setTotalItems(res.total || 0);
        setIsLoading(false);
      });
    }
  }, [
    serverLocation,
    viewMode,
    selectedCategory,
    selectedSubcategory,
    selectedRarity,
    searchQuery,
    sortOption,
    dealsOnly,
    currentPage
  ]);

  // Derived subcategories list based on selected category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategory || !taxonomy[selectedCategory]) return [];
    return taxonomy[selectedCategory];
  }, [selectedCategory, taxonomy]);

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const formatGold = (num) => {
    if (num === null || num === undefined) return "N/A";
    return num.toLocaleString() + "g";
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedRarity("");
    setSearchQuery("");
    setSortOption("value_index");
    setDealsOnly(false);
    setCurrentPage(1);
    setSelectedItem(null);
  };

  return (
    <div className="body">
      <Navbar />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Store className="size-8 text-primary" />
            <span>Marketplace Directory</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time market analytics, active guild trader listings, and deal intelligence for{" "}
            <span className="font-semibold text-foreground">{platform} - {serverLocation}</span>.
          </p>
        </div>

        {/* View Mode Toggle: Listings vs Catalog Price Index */}
        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border border-border">
          <Button
            variant={viewMode === "listings" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setViewMode("listings");
              setCurrentPage(1);
            }}
            className="gap-1.5"
          >
            <Tag className="size-4" />
            <span>Active Listings ({totalItems})</span>
          </Button>
          <Button
            variant={viewMode === "prices" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setViewMode("prices");
              setCurrentPage(1);
            }}
            className="gap-1.5"
          >
            <TrendingUp className="size-4" />
            <span>Catalog Price Index</span>
          </Button>
        </div>
      </div>

      {/* Control Bar: Search & NativeSelect Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 p-4 rounded-xl bg-card border border-border shadow-sm">
        {/* Search Bar Input */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search items by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category NativeSelect */}
        <NativeSelect
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedSubcategory("");
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <NativeSelectOption value="">All Categories</NativeSelectOption>
          <NativeSelectOptGroup label="Categories">
            {Object.keys(taxonomy).map((cat) => (
              <NativeSelectOption key={cat} value={cat}>
                {cat}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        </NativeSelect>

        {/* Subcategory NativeSelect */}
        <NativeSelect
          value={selectedSubcategory}
          onChange={(e) => {
            setSelectedSubcategory(e.target.value);
            setCurrentPage(1);
          }}
          disabled={availableSubcategories.length === 0}
          className="w-full"
        >
          <NativeSelectOption value="">
            {availableSubcategories.length > 0 ? "All Subcategories" : "Subcategory"}
          </NativeSelectOption>
          {availableSubcategories.length > 0 && (
            <NativeSelectOptGroup label="Subcategories">
              {availableSubcategories.map((sub) => (
                <NativeSelectOption key={sub} value={sub}>
                  {sub}
                </NativeSelectOption>
              ))}
            </NativeSelectOptGroup>
          )}
        </NativeSelect>

        {/* Rarity NativeSelect */}
        <NativeSelect
          value={selectedRarity}
          onChange={(e) => {
            setSelectedRarity(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <NativeSelectOption value="">Any Quality</NativeSelectOption>
          <NativeSelectOptGroup label="Rarity">
            {Object.entries(RARITY_MAP).map(([key, val]) => (
              <NativeSelectOption key={key} value={key}>
                {val.label}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        </NativeSelect>

        {/* Sort Option NativeSelect */}
        <NativeSelect
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <NativeSelectOptGroup label="Sort By">
            {viewMode === "listings" ? (
              <>
                <NativeSelectOption value="value_index">🔥 Best Value Deals</NativeSelectOption>
                <NativeSelectOption value="rarity_desc">Rarity: Legendary → Normal</NativeSelectOption>
                <NativeSelectOption value="rarity_asc">Rarity: Normal → Legendary</NativeSelectOption>
                <NativeSelectOption value="price_asc">Price: Low to High</NativeSelectOption>
                <NativeSelectOption value="price_desc">Price: High to Low</NativeSelectOption>
                <NativeSelectOption value="newest">Recently Discovered</NativeSelectOption>
              </>
            ) : (
              <>
                <NativeSelectOption value="suggested_desc">Suggested Price: High to Low</NativeSelectOption>
                <NativeSelectOption value="rarity_desc">Rarity: Legendary → Normal</NativeSelectOption>
                <NativeSelectOption value="rarity_asc">Rarity: Normal → Legendary</NativeSelectOption>
                <NativeSelectOption value="price_asc">Suggested Price: Low to High</NativeSelectOption>
                <NativeSelectOption value="name_asc">Item Name (A-Z)</NativeSelectOption>
              </>
            )}
          </NativeSelectOptGroup>
        </NativeSelect>
      </div>

      {/* Filter Quick Tags & Deals Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          {viewMode === "listings" && (
            <Button
              variant={dealsOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDealsOnly(!dealsOnly);
                setCurrentPage(1);
              }}
              className="gap-1.5 font-semibold text-xs border-amber-500/50"
            >
              <Sparkles className="size-3.5 text-amber-400" />
              <span>Only Deals (1.2x+ Value)</span>
            </Button>
          )}

          {(selectedCategory || selectedSubcategory || selectedRarity || searchQuery || dealsOnly) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="size-3" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Showing page <span className="font-semibold text-foreground">{currentPage}</span> of{" "}
          <span className="font-semibold text-foreground">{totalPages}</span> ({totalItems} total results)
        </div>
      </div>

      {/* Main Grid & Selected Item Details Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Listings / Prices Grid (Takes 2 Columns if Item Selected, 3 if None) */}
        <div className={selectedItem ? "lg:col-span-2 space-y-4" : "lg:col-span-3 space-y-4"}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
              <p className="text-sm text-muted-foreground">Loading market intelligence...</p>
            </div>
          ) : itemsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border text-center">
              <Info className="size-10 text-muted-foreground mb-2" />
              <h3 className="text-lg font-semibold mb-1">No market entries found</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Try adjusting your search keywords, category filters, or switching servers in the top navbar.
              </p>
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
              {itemsData.map((item, idx) => {
                const isSelected = selectedItem && (
                  (item.listing_id && selectedItem.listing_id === item.listing_id) ||
                  (item.game_item_id && selectedItem.game_item_id === item.game_item_id && !item.listing_id)
                );
                const rarityInfo = RARITY_MAP[item.item_rarity] || RARITY_MAP[1];

                return (
                  <Card
                    key={item.listing_id || `${item.game_item_id}-${idx}`}
                    onClick={() => setSelectedItem(item)}
                    className={`cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-md border-l-4 ${rarityInfo.color.split(" ")[0]} ${
                      isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : ""
                    }`}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {item.item_icon ? (
                            <img
                              src={item.item_icon}
                              alt={item.item_name}
                              className="size-10 rounded border border-border object-contain bg-background p-1"
                              onError={(e) => (e.target.style.display = "none")}
                            />
                          ) : (
                            <div className="size-10 rounded border border-border bg-muted flex items-center justify-center font-bold text-xs">
                              ESO
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-sm font-bold text-left line-clamp-1">
                              {item.item_name}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${rarityInfo.color}`}>
                                {rarityInfo.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.item_category} {item.item_subcategory ? `• ${item.item_subcategory}` : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Value Index Badge */}
                        {item.value_index && item.value_index >= 1.1 && (
                          <span className="shrink-0 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Zap className="size-3 fill-emerald-400" />
                            {item.value_index.toFixed(1)}x Deal
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2">
                      {viewMode === "listings" ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between border-t border-border/50 pt-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Unit Price:</span>
                              {item.quantity > 1 && (
                                <span className="bg-secondary text-secondary-foreground font-mono font-semibold px-1.5 py-0.5 rounded text-[10px]">
                                  x{item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-base text-primary block">
                                {formatGold(item.price)}
                                <span className="text-[10px] text-muted-foreground font-normal ml-0.5">/ea</span>
                              </span>
                              {item.quantity > 1 && (
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  Total: {formatGold(item.price * item.quantity)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Suggested Value:</span>
                            <span className="font-medium text-foreground">
                              {formatGold(item.suggested_price)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                            <span className="flex items-center gap-1 truncate max-w-[160px]" title={item.guild_name}>
                              <Store className="size-3 text-muted-foreground shrink-0" />
                              {item.guild_name || "Guild Trader"}
                            </span>
                            <span className="flex items-center gap-1 truncate" title={item.location}>
                              <MapPin className="size-3 text-muted-foreground shrink-0" />
                              {item.location || "Unknown"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 text-xs border-t border-border/50 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Suggested Price:</span>
                            <span className="font-bold text-primary">{formatGold(item.suggested_price)}</span>
                          </div>
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span>Avg Market Price:</span>
                            <span>{formatGold(item.avg_price)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Price Range:</span>
                            <span>{formatGold(item.min_price)} - {formatGold(item.max_price)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Item Detail Sidebar / Drawer (Appears when item selected) */}
        {selectedItem && (
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-2 border-primary/40 bg-card shadow-lg">
              <CardHeader className="p-4 pb-2 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {selectedItem.item_icon && (
                      <img
                        src={selectedItem.item_icon}
                        alt={selectedItem.item_name}
                        className="size-12 rounded border border-border p-1 bg-background object-contain"
                      />
                    )}
                    <div>
                      <CardTitle className="text-base font-extrabold">{selectedItem.item_name}</CardTitle>
                      <CardDescription className="text-xs">
                        ID: {selectedItem.game_item_id} • {selectedItem.item_category}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedItem(null)}
                    aria-label="Close detail panel"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-xs">
                {/* Price Breakdown */}
                <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block">
                    Market Valuation ({serverLocation})
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
                    <div>
                      <span className="text-muted-foreground text-xs font-normal block">Suggested</span>
                      <span className="text-primary">{formatGold(selectedItem.suggested_price)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs font-normal block">Average</span>
                      <span>{formatGold(selectedItem.avg_price)}</span>
                    </div>
                  </div>
                  {selectedItem.price && (
                    <div className="pt-2 border-t border-border/40 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Stack Quantity:</span>
                        <span className="font-bold text-foreground bg-secondary px-2 py-0.5 rounded text-xs">
                          {selectedItem.quantity || 1} units
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Unit Price:</span>
                        <span className="font-semibold text-foreground">{formatGold(selectedItem.price)} / ea</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-muted-foreground font-semibold">Total Listing Price:</span>
                        <span className="font-extrabold text-base text-emerald-400">
                          {formatGold(selectedItem.price * (selectedItem.quantity || 1))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Listing Details if applicable */}
                {selectedItem.guild_name && (
                  <div className="space-y-1.5 p-3 rounded-lg border border-border">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground block">
                      Trader Location
                    </span>
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-primary shrink-0" />
                      <span className="font-semibold">{selectedItem.guild_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="size-4 shrink-0" />
                      <span>{selectedItem.location || "Unknown Location"}</span>
                    </div>
                  </div>
                )}

                {/* Metadata details (Set / Trait / Crafting) */}
                {selectedItem.item_metadata && (
                  <div className="space-y-2">
                    {selectedItem.item_metadata.set && (
                      <div className="p-3 rounded-lg border border-border bg-card">
                        <span className="font-bold text-xs text-amber-400 block mb-1">
                          Set: {selectedItem.item_metadata.set.name}
                        </span>
                        <ul className="space-y-1 text-[11px] text-muted-foreground pl-2 border-l border-amber-500/30">
                          {selectedItem.item_metadata.set.bonuses?.slice(0, 3).map((bonus, bIdx) => (
                            <li key={bIdx}>• {bonus}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedItem.item_metadata.trait_description && (
                      <div className="p-2.5 rounded-lg border border-border bg-card">
                        <span className="font-semibold text-xs block text-foreground">
                          Trait Description
                        </span>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {selectedItem.item_metadata.trait_description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 pt-0 border-t border-border/50 mt-2 flex gap-2">
                <Button variant="default" size="sm" className="w-full font-semibold">
                  Track in Watchlist
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>

      {/* Existing Pagination Component Controls */}
      <div className="mt-auto pt-6 border-t border-border flex items-center justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            <PaginationItem>
              <PaginationLink className="font-bold">{currentPage}</PaginationLink>
            </PaginationItem>

            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

export default Marketplace;