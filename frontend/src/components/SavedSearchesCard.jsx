import { useId, useState } from "react";
import { Bookmark, LogIn, Pin, Plus, Search, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function describeFilters(filters = {}, fallbackSearch = "") {
  const details = [
    filters.search && `“${filters.search}”`,
    filters.category,
    filters.subcategory,
    filters.trait && `Trait ${filters.trait}`,
    filters.rarity && `Quality ${filters.rarity}`,
    filters.location,
    filters.deals_only && "Deals only",
  ].filter(Boolean);

  return details.length
    ? details.slice(0, 3).join(" · ")
    : fallbackSearch
      ? `“${fallbackSearch}”`
      : "All active listings";
}

export function PinnedSearchChips({ searches, onApply }) {
  const pinnedSearches = searches.filter((search) => search.is_pinned);
  if (!pinnedSearches.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Pinned saved searches">
      <span className="text-xs font-sans font-bold text-muted-foreground">
        Pinned
      </span>
      {pinnedSearches.map((search) => (
        <Button
          key={search.id}
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onApply(search)}
          className="rounded-none border-primary/50 bg-primary/10 text-primary hover:border-primary hover:bg-primary/20"
        >
          <Pin className="size-3 fill-current" />
          {search.name}
        </Button>
      ))}
    </div>
  );
}

export default function SavedSearchesCard({
  user,
  searches,
  isLoading,
  isMutating,
  error,
  onSave,
  onApply,
  onTogglePin,
  onDelete,
  onLogin,
  onClose,
}) {
  const [name, setName] = useState("");
  const nameInputId = useId();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const wasSaved = await onSave(name);
    if (wasSaved) setName("");
  };

  return (
    <Card className="exchange-saved-searches">
      <CardHeader className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm text-foreground">
            <Bookmark className="size-4 text-primary" />
            Saved searches
          </CardTitle>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Close saved searches"
              className="rounded-none text-muted-foreground hover:text-foreground"
            >
              <X />
            </Button>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Keep a search for your next trader visit.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 px-4 py-4">
        {!user ? (
          <div className="border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
            <LogIn className="mx-auto mb-2 size-5 text-primary" />
            <p className="text-xs font-sans font-bold text-foreground">
              Sign in to save filters
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your presets stay private to your account.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onLogin}
              className="mt-3 w-full rounded-none bg-primary text-recess hover:bg-primary"
            >
              Sign In
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-2">
              <label htmlFor={nameInputId} className="text-xs font-sans font-bold text-muted-foreground">
                Search name
              </label>
              <input
                id={nameInputId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                placeholder="Name this search"
                className="h-9 w-full rounded-none border border-border bg-recess px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                No filters selected? The name becomes your item search.
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={isMutating || !name.trim()}
                className="w-full rounded-none bg-primary text-recess hover:bg-primary"
              >
                <Plus />
                Save search
              </Button>
            </form>

            {error && (
              <p
                role="alert"
                className="border border-red-900/60 bg-red-950/30 px-2.5 py-2 text-xs text-red-300"
              >
                {error}
              </p>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold text-muted-foreground">
                  Saved searches
                </span>
                <span className="font-mono text-xs text-muted-foreground">{searches.length}</span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center border border-border py-6">
                  <div className="size-5 animate-spin rounded-full border-2 border-border border-b-primary" />
                  <span className="sr-only">Loading saved searches</span>
                </div>
              ) : searches.length === 0 ? (
                <div className="border border-dashed border-border px-3 py-5 text-center">
                  <Search className="mx-auto mb-2 size-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">No saved searches yet.</p>
                </div>
              ) : (
                <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                  {searches.map((search) => {
                    const description = describeFilters(search.filter_params, search.name);
                    return (
                      <li key={search.id} className="border border-border bg-recess p-3 hover:border-primary/50">
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onApply(search)}
                            aria-label={`Apply ${search.name}`}
                            className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          >
                            <span className="block truncate text-xs font-semibold text-foreground">{search.name}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{description}</span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={isMutating}
                              onClick={() => onTogglePin(search)}
                              aria-label={`${search.is_pinned ? "Unpin" : "Pin"} ${search.name}`}
                              className={`rounded-none ${search.is_pinned ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
                            >
                              <Pin className={search.is_pinned ? "fill-current" : ""} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              disabled={isMutating}
                              onClick={() => onDelete(search)}
                              aria-label={`Delete ${search.name}`}
                              className="rounded-none text-muted-foreground hover:bg-red-950/30 hover:text-red-400"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
