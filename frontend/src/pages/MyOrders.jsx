import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  Hammer, 
  ShoppingCart, 
  Search, 
  Clock, 
  Check, 
  Coins, 
  RefreshCw, 
  User, 
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  AlertCircle
} from "lucide-react";
import { 
  fetchTradeRequests, 
  claimTradeRequest, 
  unclaimTradeRequest, 
  completeTradeRequest,
  fulfillTradeRequest, 
  cancelTradeRequest 
} from "../api/api";
import { useAuth } from "../context/AuthContext";
import { RequestCard } from "../components/requests/RequestCard";
import Navbar from "@/components/ui/navbar";

export function MyOrders() {
  const { user } = useAuth();

  const [server, setServer] = useState("NA");
  const [subTab, setSubTab] = useState("ALL"); // ALL, POSTED, CLAIMED, FULFILLED
  
  // Data state
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Load user's trade requests
  const loadRequests = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = {
        server,
        status: "ALL",
        limit: 100 // Load user's orders
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (sortOption !== "newest") {
        params.sort = sortOption;
      }

      const res = await fetchTradeRequests(params);
      if (res && Array.isArray(res.requests)) {
        // Filter strictly for orders created by user OR claimed by user
        let userOrders = res.requests.filter(
          r => r.user_id === user.id || r.claimed_by_user_id === user.id
        );

        setAllOrders(userOrders);
      } else {
        setAllOrders([]);
      }
    } catch (e) {
      console.error("Failed to load user orders:", e);
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [server, searchQuery, sortOption, user?.id]);

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
      } else {
        alert(res?.error || "Failed to release claim.");
      }
    } catch (e) {
      alert("Error releasing claim: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (id) => {
    setActionLoadingId(id);
    try {
      const res = await completeTradeRequest(id);
      if (res && res.success) {
        loadRequests();
      } else {
        alert(res?.error || "Failed to mark order as completed.");
      }
    } catch (e) {
      alert("Error completing order: " + e.message);
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
      } else {
        alert(res?.error || "Failed to cancel request.");
      }
    } catch (e) {
      alert("Error canceling request: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Compute User-Specific Global Stats across all user orders
  const postedCount = allOrders.filter(r => r.user_id === user?.id).length;
  const claimedCount = allOrders.filter(r => r.claimed_by_user_id === user?.id).length;
  const fulfilledCount = allOrders.filter(r => r.status === "FULFILLED").length;
  const totalGold = allOrders.reduce((acc, r) => acc + ((r.offered_gold_price || 0) * (r.quantity || 1)), 0);

  // Filter orders for active sub-tab and search query
  const filteredRequests = useMemo(() => {
    let list = allOrders;
    if (subTab === "POSTED") {
      list = list.filter(r => r.user_id === user?.id);
    } else if (subTab === "CLAIMED") {
      list = list.filter(r => r.claimed_by_user_id === user?.id);
    } else if (subTab === "FULFILLED") {
      list = list.filter(r => r.status === "FULFILLED");
    }
    return list;
  }, [allOrders, subTab, user?.id]);

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#e0d8c3] flex flex-col font-sans selection:bg-[#c5a059] selection:text-black">
      <Navbar />

      {/* Top Banner Header */}
      <header className="border-b border-[#2a2c33] bg-[#121218]/90 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-cinzel font-bold tracking-wider text-[#e0d8c3] flex items-center gap-2.5">
              <Package className="size-7 text-[#c5a059]" />
              <span>My Trade Orders & Claims</span>
            </h1>
            <p className="text-[#a89f91] text-xs md:text-sm mt-1">
              Manage your posted WTB requests, track 24h crafter fulfillment timers, and complete deliveries.
            </p>
          </div>

          {/* Controls: Megaserver & Link to Public Board */}
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

            {/* Navigation to Public Requests */}
            <Link
              to="/requests"
              className="px-4 py-2 bg-[#161620] hover:bg-[#1f1f2e] border border-[#c5a059]/40 hover:border-[#c5a059] text-xs font-cinzel font-bold text-[#e6c278] hover:text-white uppercase tracking-wider transition-all flex items-center gap-1.5 shadow"
            >
              <ShoppingCart className="size-3.5 text-[#c5a059]" />
              <span>Browse Public Requests →</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {!user ? (
          /* Unauthenticated State */
          <div className="py-20 text-center bg-[#121218] border border-[#2a2c33] p-8 max-w-xl mx-auto space-y-4 shadow-xl">
            <User className="size-12 text-[#c5a059] mx-auto opacity-70" />
            <h3 className="font-cinzel font-bold text-lg text-[#e0d8c3]">
              Authentication Required
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Please log in or register to manage your custom crafting requests, claim open bounties, and track your in-game deliveries.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                to="/login"
                className="px-5 py-2.5 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center gap-1.5"
              >
                <LogIn className="size-4" />
                <span>Log In / Register</span>
              </Link>
              <Link
                to="/requests"
                className="px-4 py-2.5 bg-[#161620] hover:bg-[#1c1c26] border border-[#2a2c33] text-xs font-cinzel text-muted-foreground hover:text-white uppercase transition-colors"
              >
                Browse Public Requests
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* User Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 bg-[#121218] border border-[#c5a059]/30 flex items-center gap-3 shadow">
                <div className="size-10 bg-[#c5a059]/15 border border-[#c5a059]/40 flex items-center justify-center shrink-0">
                  <ShoppingCart className="size-5 text-[#e6c278]" />
                </div>
                <div>
                  <span className="text-[10px] font-cinzel uppercase text-[#c5a059] block font-bold">
                    Requests I Posted
                  </span>
                  <span className="font-mono text-xl font-bold text-white">
                    {loading ? "..." : (postedCount || 0)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#121218] border border-amber-500/30 flex items-center gap-3 shadow">
                <div className="size-10 bg-amber-950/40 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <Hammer className="size-5 text-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-cinzel uppercase text-amber-400 block font-bold">
                    Bounties I Claimed
                  </span>
                  <span className="font-mono text-xl font-bold text-white">
                    {loading ? "..." : (claimedCount || 0)}
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
                    {loading ? "..." : (fulfilledCount || 0)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#121218] border border-emerald-500/30 flex items-center gap-3 shadow">
                <div className="size-10 bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Coins className="size-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-cinzel uppercase text-emerald-400 block font-bold">
                    Total Order Value
                  </span>
                  <span className="font-mono text-xl font-bold text-[#e6c278]">
                    {loading ? "..." : `${(totalGold || 0).toLocaleString()}g`}
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-[#2a2c33] bg-[#0e0e13] px-2 overflow-x-auto gap-2">
              <div className="flex items-center gap-1 py-2">
                <button
                  onClick={() => { setSubTab("ALL"); setCurrentPage(1); }}
                  className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                    subTab === "ALL"
                      ? "bg-[#c5a059] text-black shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
                  }`}
                >
                  All Activity ({allOrders.length})
                </button>

                <button
                  onClick={() => { setSubTab("POSTED"); setCurrentPage(1); }}
                  className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    subTab === "POSTED"
                      ? "bg-[#c5a059] text-black shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
                  }`}
                >
                  <ShoppingCart className="size-3.5" />
                  My Posted Requests ({postedCount})
                </button>

                <button
                  onClick={() => { setSubTab("CLAIMED"); setCurrentPage(1); }}
                  className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    subTab === "CLAIMED"
                      ? "bg-amber-600 text-white shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
                  }`}
                >
                  <Hammer className="size-3.5" />
                  My Claimed Orders ({claimedCount})
                </button>

                <button
                  onClick={() => { setSubTab("FULFILLED"); setCurrentPage(1); }}
                  className={`px-3.5 py-2 text-xs font-cinzel font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    subTab === "FULFILLED"
                      ? "bg-purple-600 text-white shadow-md font-extrabold"
                      : "text-muted-foreground hover:text-[#e0d8c3] hover:bg-white/5"
                  }`}
                >
                  <Check className="size-3.5" />
                  Completed History ({fulfilledCount})
                </button>
              </div>

              <Link
                to="/requests"
                className="text-xs font-cinzel text-[#c5a059] hover:underline hidden sm:flex items-center gap-1"
              >
                <span>Browse Public Request Feed</span>
                <span>→</span>
              </Link>
            </div>

            {/* Filter Search & Sort Bar */}
            <div className="p-4 bg-[#121218] border border-[#2a2c33] shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Filter your orders by item name, set, or notes..."
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

              <div className="sm:w-56">
                <select
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
                  className="w-full py-2 px-3 bg-[#0e0e13] border border-[#2a2c33] text-xs text-[#e0d8c3] font-cinzel focus:outline-none focus:border-[#c5a059]"
                >
                  <option value="newest">Newest First</option>
                  <option value="gold_desc">Highest Gold Bounty</option>
                  <option value="gold_asc">Lowest Gold Bounty</option>
                  <option value="expiring_soon">Expiring Soon</option>
                </select>
              </div>
            </div>

            {/* Orders Grid */}
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <RefreshCw className="size-8 animate-spin mx-auto text-[#c5a059]" />
                <p className="text-xs font-cinzel text-muted-foreground uppercase tracking-wider">
                  Loading Your Orders...
                </p>
              </div>
            ) : paginatedRequests.length === 0 ? (
              <div className="py-16 text-center bg-[#121218] border border-[#2a2c33] p-8 max-w-xl mx-auto space-y-4 shadow-xl">
                <Package className="size-12 text-[#c5a059] mx-auto opacity-70" />
                <h3 className="font-cinzel font-bold text-lg text-[#e0d8c3]">
                  No Orders in this View
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  You have not posted or claimed any orders matching this category yet.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Link
                    to="/requests"
                    className="px-5 py-2.5 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-colors shadow flex items-center gap-1.5"
                  >
                    <ShoppingCart className="size-4" />
                    <span>Browse Public Requests</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    request={req}
                    currentUser={user}
                    onClaim={handleClaim}
                    onUnclaim={handleUnclaim}
                    onComplete={handleComplete}
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
          </>
        )}
      </main>
    </div>
  );
}

export default MyOrders;
