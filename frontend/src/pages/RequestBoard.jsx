import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ScrollText, 
  Hammer, 
  ShoppingCart, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  Check, 
  Coins, 
  RefreshCw, 
  User, 
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { 
  fetchTradeRequests, 
  fetchTradeRequestStats, 
  claimTradeRequest, 
  unclaimTradeRequest, 
  fulfillTradeRequest, 
  cancelTradeRequest 
} from "../api/api";
import { useAuth } from "../context/AuthContext";
import { RequestCard } from "../components/requests/RequestCard";
import { RequestModal } from "../components/requests/RequestModal";
import { EsoTooltip } from "../components/ui/tooltip";
import Navbar from "@/components/ui/navbar";

const CATEGORIES = [
  "All Categories",
  "Weapons",
  "Apparel",
  "Jewelry",
  "Consumables",
  "Materials",
  "Glyphs",
  "Furnishings",
  "Miscellaneous"
];

export function RequestBoard() {
  const { user } = useAuth();

  const [server, setServer] = useState("NA");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, CRAFTING, WTB, MY_ORDERS
  
  // Data state
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total_open: 0, total_in_progress: 0, total_fulfilled: 0, total_gold_offered: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE"); // ACTIVE (Open/In-Progress), OPEN, IN_PROGRESS, FULFILLED, ALL
  const [sortOption, setSortOption] = useState("newest"); // newest, gold_desc, gold_asc, expiring_soon
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load request stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchTradeRequestStats(server);
      if (res && res.total_open !== undefined) {
        setStats(res);
      }
    } catch (e) {
      console.error("Failed to load request stats:", e);
    } finally {
      setStatsLoading(false);
    }
  }, [server]);

  // Load trade requests
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        server,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize
      };

      // Tab filter
      if (activeTab === "CRAFTING") params.request_type = "CRAFTING";
      else if (activeTab === "WTB") params.request_type = "WTB";
      else if (activeTab === "MY_ORDERS" && user) {
        // Will be filtered or queried
        params.status = "ALL";
      }

      // Status filter
      if (activeTab !== "MY_ORDERS") {
        if (selectedStatus === "ACTIVE") params.status = "OPEN,IN_PROGRESS";
        else if (selectedStatus !== "ALL") params.status = selectedStatus;
        else params.status = "ALL";
      }

      // Category filter
      if (selectedCategory && selectedCategory !== "All Categories") {
        params.category = selectedCategory;
      }

      // Search filter
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      // Sort
      if (sortOption !== "newest") {
        params.sort = sortOption;
      }

      const res = await fetchTradeRequests(params);
      if (res && res.requests) {
        let list = res.requests;
        if (activeTab === "MY_ORDERS" && user) {
          list = list.filter(r => r.user_id === user.id || r.claimed_by_user_id === user.id);
        }
        setRequests(list);
        setTotalCount(activeTab === "MY_ORDERS" ? list.length : (res.total || 0));
      }
    } catch (e) {
      console.error("Failed to load requests:", e);
    } finally {
      setLoading(false);
    }
  }, [server, activeTab, selectedStatus, selectedCategory, searchQuery, sortOption, currentPage, user]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Handlers for claim / unclaim / fulfill / cancel
  const handleClaim = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await claimTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to claim request.");
      }
    } catch (e) {
      alert("Error claiming request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnclaim = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await unclaimTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to release claim.");
      }
    } catch (e) {
      alert("Error releasing claim: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleFulfill = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await fulfillTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to fulfill request.");
      }
    } catch (e) {
      alert("Error fulfilling request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this trade request?")) return;
    setActionLoadingId(id);
    try {
      const res = await cancelTradeRequest(id);
      if (res && res.success) {
        loadRequests();
        loadStats();
      } else {
        alert(res?.error || "Failed to cancel request.");
      }
    } catch (e) {
      alert("Error canceling request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All Categories");
    setSelectedStatus("ACTIVE");
    setSortOption("newest");
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col font-sans selection:bg-[#c5a059] selection:text-black">
      <Navbar />

      {/* Top Banner Header */}
      <header className="border-b border-[#2a2c33] bg-[#121218]/90 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-cinzel font-bold tracking-wider text-[#e0d8c3] flex items-center gap-2.5">
              <ScrollText className="size-7 text-[#c5a059]" />
              <span>Public Crafting & WTB Request Board</span>
            </h1>
            <p className="text-[#a89f91] text-xs md:text-sm mt-1">
              Asynchronous matchmaking for custom crafted set loadouts and bulk material bounties across Tamriel.
            </p>
          </div>

          {/* Controls: Megaserver & Post Request CTA */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Server Selector */}
            <div className="flex rounded-none border border-[#2a2c33] bg-[#0e0e13] p-0.5">
              <button
                onClick={() => { setServer("NA"); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-cinzel font-bold tracking-wider transition-all cursor-pointer ${
                  server === "NA"
                    ? "bg-[#c5a059] text-black shadow font-extrabold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                NA
              </button>
              <button
                onClick={() => { setServer("EU"); setCurrentPage(1); }}
                className={`px-3 py-1.5 text-xs font-cinzel font-bold tracking-wider transition-all cursor-pointer ${
                  server === "EU"
                    ? "bg-[#c5a059] text-black shadow font-extrabold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                EU
              </button>
            </div>

            {/* Post Request CTA */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              <span>Post Request</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-[#121218] border border-emerald-500/30 flex items-center gap-3 shadow">
            <div className="size-10 bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-cinzel uppercase text-emerald-400 block font-bold">
                Open Requests
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {statsLoading ? "..." : stats.total_open}
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#121218] border border-amber-500/30 flex items-center gap-3 shadow">
            <div className="size-10 bg-amber-950/40 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Clock className="size-5 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-cinzel uppercase text-amber-400 block font-bold">
                In Progress (Claimed)
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {statsLoading ? "..." : stats.total_in_progress}
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#121218] border border-purple-500/30 flex items-center gap-3 shadow">
            <div className="size-10 bg-purple-950/40 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Check className="size-5 text-purple-400" />
            </div>
            <div>
              <span className="text-[10px] font-cinzel uppercase text-purple-400 block font-bold">
                Fulfilled Orders
              </span>
              <span className="font-mono text-xl font-bold text-white">
                {statsLoading ? "..." : stats.total_fulfilled}
              </span>
            </div>
          </div>

          <div className="p-4 bg-[#121218] border border-[#c5a059]/40 flex items-center gap-3 shadow">
            <div className="size-10 bg-[#c5a059]/15 border border-[#c5a059]/40 flex items-center justify-center shrink-0">
              <Coins className="size-5 text-[#e6c278]" />
            </div>
            <div>
              <span className="text-[10px] font-cinzel uppercase text-[#c5a059] block font-bold">
                Active Gold Bounty
              </span>
              <span className="font-mono text-xl font-bold text-[#e6c278]">
                {statsLoading ? "..." : `${stats.total_gold_offered.toLocaleString()}g`}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#2a2c33] bg-[#0e0e13] px-2 overflow-x-auto gap-2">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => { setActiveTab("ALL"); setCurrentPage(1); }}
              className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                activeTab === "ALL"
                  ? "bg-[#c5a059] text-black shadow-md font-extrabold"
                  : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
              }`}
            >
              All Requests
            </button>

            <button
              onClick={() => { setActiveTab("CRAFTING"); setCurrentPage(1); }}
              className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "CRAFTING"
                  ? "bg-[#c5a059] text-black shadow-md font-extrabold"
                  : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
              }`}
            >
              <Hammer className="size-3.5" />
              Crafting Orders
            </button>

            <button
              onClick={() => { setActiveTab("WTB"); setCurrentPage(1); }}
              className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === "WTB"
                  ? "bg-blue-600 text-white shadow-md font-extrabold"
                  : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
              }`}
            >
              <ShoppingCart className="size-3.5" />
              Want-To-Buy (WTB)
            </button>

            {user && (
              <button
                onClick={() => { setActiveTab("MY_ORDERS"); setCurrentPage(1); }}
                className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  activeTab === "MY_ORDERS"
                    ? "bg-purple-600 text-white border-purple-400 shadow-md font-extrabold"
                    : "text-purple-400 border-purple-500/30 hover:bg-purple-950/20"
                }`}
              >
                <User className="size-3.5" />
                My Orders & Claims
              </button>
            )}
          </div>

          <span className="text-xs font-mono text-muted-foreground hidden sm:block">
            Showing <strong className="text-white">{requests.length}</strong> of {totalCount} requests
          </span>
        </div>

        {/* Control Filter Bar */}
        <div className="p-4 bg-[#121218] border border-[#2a2c33] shadow-lg grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 items-center">
          {/* Search Query */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search by item, set, or @handle..."
              className="w-full pl-9 pr-8 py-2 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] placeholder:text-muted-foreground font-cinzel focus:outline-none focus:border-[#c5a059]"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
            >
              <option value="ACTIVE">Active (Open & Claimed)</option>
              <option value="OPEN">Open Only</option>
              <option value="IN_PROGRESS">In Progress Only</option>
              <option value="FULFILLED">Fulfilled (History)</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={sortOption}
              onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
              className="w-full py-2 px-3 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
            >
              <option value="newest">Newest First</option>
              <option value="gold_desc">Highest Gold Bounty</option>
              <option value="gold_asc">Lowest Gold Bounty</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="quality_desc">Highest Quality</option>
            </select>
          </div>
        </div>

        {/* Request Cards Grid */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="size-8 animate-spin mx-auto text-[#c5a059]" />
            <p className="text-xs font-cinzel text-muted-foreground uppercase tracking-wider">
              Loading Public Trade Board...
            </p>
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center bg-[#121218] border border-[#2a2c33] p-8 max-w-xl mx-auto space-y-4 shadow-xl">
            <ScrollText className="size-12 text-[#c5a059] mx-auto opacity-70" />
            <h3 className="font-cinzel font-bold text-lg text-[#e0d8c3]">
              No Matching Trade Requests Found
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              No active crafting orders or WTB bounties match your current server and filter criteria.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-[#161620] hover:bg-[#1c1c26] border border-[#2a2c33] text-xs font-cinzel text-muted-foreground hover:text-white uppercase transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-colors shadow"
              >
                + Post the First Request
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                currentUser={user}
                onClaim={handleClaim}
                onUnclaim={handleUnclaim}
                onFulfill={handleFulfill}
                onCancel={handleCancel}
                isClaiming={actionLoadingId === req.id}
                isCanceling={actionLoadingId === req.id}
              />
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#2a2c33] pt-4 px-2">
            <span className="text-xs text-muted-foreground font-cinzel">
              Page <strong className="text-white font-mono">{currentPage}</strong> of {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-[#121218] border border-[#2a2c33] hover:border-[#c5a059] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-cinzel cursor-pointer transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-[#121218] border border-[#2a2c33] hover:border-[#c5a059] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-cinzel cursor-pointer transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Create Request Modal */}
      <RequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultServer={server}
        onRequestCreated={() => {
          loadRequests();
          loadStats();
        }}
      />
    </div>
  );
}

export default RequestBoard;
