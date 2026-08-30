import React, { useState, useEffect } from "react";
import { 
  Hammer, 
  ShoppingCart, 
  Clock, 
  Check, 
  X, 
  Copy, 
  ExternalLink, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles,
  Coins,
  User,
  MessageSquare
} from "lucide-react";
import { EsoTooltip } from "../ui/tooltip";

const RARITY_COLORS = {
  1: "border-gray-500 text-gray-300",
  2: "border-emerald-500 text-emerald-400",
  3: "border-blue-500 text-blue-400",
  4: "border-purple-500 text-purple-400",
  5: "border-[#c5a059] text-[#e6c278]"
};

const RARITY_BG = {
  1: "bg-gray-950/40",
  2: "bg-emerald-950/40",
  3: "bg-blue-950/40",
  4: "bg-purple-950/40",
  5: "bg-[#c5a059]/15"
};

const RARITY_NAMES = {
  1: "Normal",
  2: "Fine",
  3: "Superior",
  4: "Epic",
  5: "Legendary"
};

export function RequestCard({
  request,
  currentUser,
  onClaim,
  onUnclaim,
  onComplete,
  onFulfill,
  onCancel,
  isClaiming = false,
  isCanceling = false
}) {
  const [copiedType, setCopiedType] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  const isOwner = currentUser && (currentUser.id === request.user_id);
  const isClaimedByMe = currentUser && (currentUser.id === request.claimed_by_user_id);

  // 24-hour Claim Timer Countdown
  useEffect(() => {
    if (request.status !== "IN_PROGRESS" || !request.claim_expires_at) {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const diff = new Date(request.claim_expires_at) - new Date();
      if (diff <= 0) {
        setTimeRemaining("Claim Expired (Reverting)");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${mins}m ${secs}s left`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [request.status, request.claim_expires_at]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  if (!request) return null;

  const whisperText = `/w ${request.buyer_display_handle || 'Buyer'} Hello! I can fulfill your ${
    request.request_type === "CRAFTING" ? "crafting order" : "WTB request"
  } for ${request.quantity > 1 ? `${request.quantity}x ` : ""}${request.item_name || 'Item'} (${(request.offered_gold_price || 0).toLocaleString()}g C.O.D.).`;

  const mailCodText = `${request.quantity > 1 ? `${request.quantity}x ` : ""}${request.item_name || 'Item'}${
    request.set_name ? ` (${request.set_name})` : ""
  } - Requested on ESO Trade Platform`;

  const quality = request.quality || 1;
  const rarityClass = RARITY_COLORS[quality] || RARITY_COLORS[1];
  const rarityBg = RARITY_BG[quality] || RARITY_BG[1];

  // Price Guidance Calculation
  const offeredGold = request.offered_gold_price || 0;
  const suggestedPrice = request.current_suggested_price || request.suggested_price || 0;
  const totalPrice = offeredGold * (request.quantity || 1);
  const totalSuggested = suggestedPrice * (request.quantity || 1);

  let priceIndicator = null;
  if (suggestedPrice > 0 && offeredGold > 0) {
    const ratio = offeredGold / suggestedPrice;
    if (ratio >= 1.25) {
      priceIndicator = {
        label: `High Bounty (+${Math.round((ratio - 1) * 100)}%)`,
        className: "text-emerald-400 bg-emerald-950/40 border-emerald-500/30"
      };
    } else if (ratio <= 0.6) {
      priceIndicator = {
        label: "Low Offer",
        className: "text-red-400 bg-red-950/40 border-red-500/30"
      };
    } else {
      priceIndicator = {
        label: "Fair Market Offer",
        className: "text-[#c5a059] bg-[#c5a059]/10 border-[#c5a059]/30"
      };
    }
  }

  return (
    <div className="bg-[#121218] border border-[#2a2c33] hover:border-[#c5a059]/50 transition-all flex flex-col justify-between relative overflow-hidden shadow-lg group">
      {/* Top Header Row */}
      <div className="p-4 border-b border-[#2a2c33]/70 space-y-3">
        {/* Badges & Status */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {request.request_type === "CRAFTING" ? (
              <span className="px-2 py-0.5 bg-[#c5a059]/20 border border-[#c5a059]/50 text-[#e6c278] text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1">
                <Hammer className="size-3" />
                Crafting Order
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-blue-950/40 border border-blue-500/40 text-blue-300 text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1">
                <ShoppingCart className="size-3" />
                Want To Buy
              </span>
            )}

            <span className="px-1.5 py-0.5 bg-[#0a0a0d] border border-[#2a2c33] text-[10px] font-mono text-[#8a8275]">
              {request.server}
            </span>
          </div>

          {/* Status Badge */}
          {request.status === "OPEN" && (
            <span className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Open
            </span>
          )}
          {request.status === "IN_PROGRESS" && (
            <span className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/40 text-amber-300 text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1">
              <Clock className="size-3" />
              In Progress
            </span>
          )}
          {request.status === "COMPLETED" && (
            <span className="px-2 py-0.5 bg-blue-950/40 border border-blue-500/40 text-blue-300 text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1">
              <Check className="size-3 text-blue-400" />
              Completed / Sent
            </span>
          )}
          {request.status === "FULFILLED" && (
            <span className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/40 text-purple-300 text-[10px] font-cinzel font-bold uppercase tracking-wider flex items-center gap-1">
              <Check className="size-3" />
              Fulfilled
            </span>
          )}
          {request.status === "CANCELLED" && (
            <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 text-gray-400 text-[10px] font-cinzel font-bold uppercase tracking-wider">
              Cancelled
            </span>
          )}
          {request.status === "EXPIRED" && (
            <span className="px-2 py-0.5 bg-red-950/30 border border-red-500/30 text-red-400 text-[10px] font-cinzel font-bold uppercase tracking-wider">
              Expired
            </span>
          )}
        </div>

        {/* Item Primary Display */}
        <div className="flex items-start gap-3">
          <div className={`size-12 rounded-none border-2 shrink-0 flex items-center justify-center p-1 ${rarityClass} ${rarityBg}`}>
            {request.icon_url ? (
              <img
                src={request.icon_url}
                alt={request.item_name}
                className="size-full object-contain"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <Hammer className="size-6 text-[#c5a059]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={`font-cinzel font-bold text-sm truncate ${rarityClass}`}>
              {request.quantity > 1 ? `${request.quantity}x ` : ""}{request.item_name}
            </h4>

            {request.set_name && (
              <p className="text-xs font-cinzel text-[#c5a059] truncate mt-0.5">
                Set: <span className="font-bold text-[#e6c278]">{request.set_name}</span>
              </p>
            )}

            {/* Spec pills */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
              <span className={`px-1.5 py-0.2 border ${rarityClass} bg-black/40`}>
                {RARITY_NAMES[quality]}
              </span>
              {request.trait_name && request.trait_name !== "None" && (
                <span className="px-1.5 py-0.2 border border-[#2a2c33] text-amber-300/90 bg-black/40">
                  Trait: {request.trait_name}
                </span>
              )}
              {request.style_name && (
                <span className="px-1.5 py-0.2 border border-[#2a2c33] text-[#a89f91] bg-black/40">
                  Style: {request.style_name}
                </span>
              )}
              {request.cp_req > 0 ? (
                <span className="px-1.5 py-0.2 border border-[#2a2c33] text-purple-300 bg-black/40 font-mono">
                  CP {request.cp_req}
                </span>
              ) : request.level_req ? (
                <span className="px-1.5 py-0.2 border border-[#2a2c33] text-gray-300 bg-black/40 font-mono">
                  Lvl {request.level_req}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Delivery Notes */}
        {request.delivery_notes && (
          <div className="p-2 bg-[#0a0a0d] border border-[#2a2c33] text-[11px] text-[#a89f91] italic leading-relaxed">
            "{request.delivery_notes}"
          </div>
        )}
      </div>

      {/* Financials & Buyer Details */}
      <div className="p-4 bg-[#0e0e13] space-y-3">
        {/* Offered Gold & Market Comparison */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-cinzel text-muted-foreground block">
              Offered Gold Bounty
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-extrabold text-[#e6c278] flex items-center gap-1">
                <Coins className="size-4 text-[#c5a059]" />
                {(totalPrice || 0).toLocaleString()}g
              </span>
              {request.quantity > 1 && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({(offeredGold || 0).toLocaleString()}g/ea)
                </span>
              )}
            </div>
          </div>

          {priceIndicator && (
            <span className={`px-2 py-0.5 border text-[10px] font-cinzel font-bold uppercase tracking-wider ${priceIndicator.className}`}>
              {priceIndicator.label}
            </span>
          )}
        </div>

        {/* Suggested Market Price Callout */}
        {suggestedPrice > 0 && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-[#2a2c33]/50">
            <span>TTC Suggested Value:</span>
            <span className="font-mono text-[#a89f91]">
              {(totalSuggested || 0).toLocaleString()}g
            </span>
          </div>
        )}

        {/* Buyer & Claim Info */}
        <div className="pt-2 border-t border-[#2a2c33] flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="size-3 text-[#c5a059]" />
              Buyer:
            </span>
            <span className="font-mono text-white font-bold">
              {request.buyer_display_handle}
            </span>
          </div>

          {request.status === "IN_PROGRESS" && (
            <div className="flex items-center justify-between text-amber-300/90 text-[11px] bg-amber-950/20 p-1.5 border border-amber-500/20">
              <span className="flex items-center gap-1">
                <Hammer className="size-3 text-amber-400" />
                Claimed by: <strong className="font-mono text-white">{request.claimed_by_handle || "Crafter"}</strong>
              </span>
              <span className="font-mono font-bold text-amber-400">
                {timeRemaining}
              </span>
            </div>
          )}

          {(request.status === "COMPLETED" || request.status === "FULFILLED") && request.claimed_by_handle && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Hammer className="size-3 text-[#c5a059]" />
                Merchant:
              </span>
              <span className="font-mono text-white font-bold">
                {request.claimed_by_handle}
              </span>
            </div>
          )}
        </div>

        {/* In-Game C.O.D. Mail Helper Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          <EsoTooltip content="Copy in-game whisper command: /w @BuyerHandle ...">
            <button
              onClick={() => handleCopy(whisperText, "whisper")}
              className="flex-1 py-1 px-2 bg-[#161620] border border-[#2a2c33] hover:border-[#c5a059] text-[10px] font-cinzel text-[#d4af37] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              {copiedType === "whisper" ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Whisper Copied!</span>
                </>
              ) : (
                <>
                  <MessageSquare className="size-3 text-[#c5a059]" />
                  <span>Copy Whisper</span>
                </>
              )}
            </button>
          </EsoTooltip>

          <EsoTooltip content="Copy C.O.D. in-game mail note text">
            <button
              onClick={() => handleCopy(mailCodText, "mail")}
              className="py-1 px-2 bg-[#161620] border border-[#2a2c33] hover:border-[#c5a059] text-[10px] font-cinzel text-[#a89f91] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              {copiedType === "mail" ? (
                <>
                  <Check className="size-3 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>C.O.D. Note</span>
                </>
              )}
            </button>
          </EsoTooltip>
        </div>

        {/* Action Buttons */}
        <div className="pt-2">
          {request.status === "OPEN" && (
            isOwner ? (
              <button
                onClick={() => onCancel(request.id)}
                disabled={isCanceling}
                className="w-full py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="size-3.5" />
                <span>Cancel My Request</span>
              </button>
            ) : (
              <button
                onClick={() => onClaim(request.id)}
                disabled={isClaiming || !currentUser}
                className="w-full py-2 bg-[#c5a059] hover:bg-[#d4af37] text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Hammer className="size-3.5 text-black" />
                <span>{currentUser ? "Claim Crafting Order" : "Login to Claim"}</span>
              </button>
            )
          )}

          {request.status === "IN_PROGRESS" && (
            <div className="flex items-center gap-1.5">
              {isClaimedByMe && (
                <button
                  onClick={() => (onComplete ? onComplete(request.id) : onFulfill(request.id))}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Check className="size-3.5" />
                  <span>Mark Completed</span>
                </button>
              )}

              {isOwner && !isClaimedByMe && (
                <>
                  <button
                    onClick={() => onFulfill(request.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="size-3.5" />
                    <span>Confirm & Close</span>
                  </button>
                  <button
                    onClick={() => onUnclaim(request.id)}
                    className="py-2 px-3 bg-[#161620] hover:bg-amber-950/30 border border-[#2a2c33] hover:border-amber-500/40 text-amber-300 hover:text-amber-200 font-cinzel text-xs uppercase transition-all cursor-pointer"
                    title="Unassign this claimer and open request back to the public board"
                  >
                    Unassign
                  </button>
                </>
              )}

              {isClaimedByMe && (
                <button
                  onClick={() => onUnclaim(request.id)}
                  className="py-2 px-3 bg-[#161620] hover:bg-red-950/30 border border-[#2a2c33] hover:border-red-500/40 text-red-300 font-cinzel text-xs uppercase transition-all cursor-pointer"
                >
                  Release Claim
                </button>
              )}
            </div>
          )}

          {request.status === "COMPLETED" && (
            <div className="flex items-center gap-1.5">
              {isOwner ? (
                <>
                  <button
                    onClick={() => onFulfill(request.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-black font-cinzel font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check className="size-3.5" />
                    <span>Confirm Delivery & Close Order</span>
                  </button>
                  <button
                    onClick={() => onUnclaim(request.id)}
                    className="py-2 px-3 bg-[#161620] hover:bg-amber-950/30 border border-[#2a2c33] hover:border-amber-500/40 text-amber-300 hover:text-amber-200 font-cinzel text-xs uppercase transition-all cursor-pointer"
                    title="Unassign crafter and reopen request"
                  >
                    Unassign
                  </button>
                </>
              ) : isClaimedByMe ? (
                <>
                  <div className="flex-1 py-2 bg-blue-950/30 border border-blue-500/30 text-blue-300 font-cinzel font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                    <Clock className="size-3.5 text-blue-400" />
                    <span>Awaiting Buyer Close</span>
                  </div>
                  <button
                    onClick={() => onUnclaim(request.id)}
                    className="py-2 px-3 bg-[#161620] hover:bg-red-950/30 border border-[#2a2c33] hover:border-red-500/40 text-red-300 font-cinzel text-xs uppercase transition-all cursor-pointer"
                  >
                    Release
                  </button>
                </>
              ) : (
                <div className="w-full py-2 bg-blue-950/30 border border-blue-500/30 text-blue-300 font-cinzel font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                  <Check className="size-4 text-blue-400" />
                  <span>Completed by Crafter</span>
                </div>
              )}
            </div>
          )}

          {request.status === "FULFILLED" && (
            <div className="w-full py-2 bg-purple-950/30 border border-purple-500/30 text-purple-300 font-cinzel font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <Check className="size-4 text-purple-400" />
              <span>Order Fulfilled & Closed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestCard;
