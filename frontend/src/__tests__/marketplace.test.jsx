import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Marketplace from '../pages/Marketplace';
import SavedSearchesCard from '../components/SavedSearchesCard';
import * as api from '../api/api';

vi.mock('../components/ui/navbar', () => ({ default: () => <nav aria-label="Test navigation" /> }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../components/theme-provider', () => ({ useTheme: () => ({ serverLocation: 'NA', platform: 'PC', setServerLocation: vi.fn(), setPlatform: vi.fn() }) }));
vi.mock('../api/api', () => ({ fetchTaxonomy: vi.fn(), fetchMarketListings: vi.fn(), fetchCatalogItems: vi.fn(), clearAllListings: vi.fn(), fetchSavedSearches: vi.fn(), createSavedSearch: vi.fn(), setSavedSearchPinned: vi.fn(), deleteSavedSearch: vi.fn() }));

// Existing native observation read from the isolated SQLite copy on 7 September 2026.
// No fabricated listings are inserted into the application or a database.
const ring = { listing_id: 10000950, game_item_id: 219321, item_name: 'Coup De Grâce Ring', item_category: 'Jewelry', item_subcategory: 'Ring', item_icon: 'gear_breton_ring_a.png', price: 1999, quantity: 1, active_stacks: 1, quality: 4, seller_name: '@Danielzzz', guild_name: 'Lost Ark', location: 'Gonfalon Bay, High Isle', discovered_at: '2026-09-03 01:30:58', observed_min_price: 1999, observed_max_price: 15000, observed_avg_price: 8500, value_index: 4.252126063031516 };
const openMarket = (path = '/marketplace') => render(<MemoryRouter initialEntries={[path]}><Marketplace /></MemoryRouter>);

beforeEach(() => {
  api.fetchTaxonomy.mockResolvedValue({ Jewelry: ['Ring'], Materials: ['Style Material'] });
  api.fetchMarketListings.mockResolvedValue({ listings: [ring], total: 278 });
  api.fetchCatalogItems.mockResolvedValue({ items: [], total: 0 });
});

describe('marketplace presentation parity', () => {
  it('preserves the historical feathers example: three stacks, 300 items, and separate unit/stack prices', async () => {
    // Same observed record as docs/design/issue-132/fixtures.js; read from the isolated API copy.
    api.fetchMarketListings.mockResolvedValue({ total: 1, listings: [{ listing_id: 10000762, game_item_id: 212134, item_name: 'Tide-Born Feathers', item_icon: 'styleitemicon_u46_solsticeargonians.png', item_category: 'Materials', item_subcategory: 'Style Material', price: 2100, quantity: 100, active_stacks: 3, quality: 1, guild_name: 'Lost Ark', seller_name: '@wangpm001', location: 'Gonfalon Bay, High Isle', discovered_at: '2026-09-03 01:32:23', observed_avg_price: 2100, value_index: 1 }] });
    openMarket();
    const offer = await screen.findByRole('button', { name: 'View Tide-Born Feathers' });
    expect(offer).toHaveTextContent('3 stacks');
    expect(offer).toHaveTextContent('100 each · 300 items total');
    expect(offer).toHaveTextContent('2,100g / item');
    expect(offer).toHaveTextContent('210,000g / stack');
    expect(offer).not.toHaveTextContent(/\dx deal/);
  });
  it('keeps observed pricing and deal badges, opens details by keyboard, and retains the search command', async () => {
    const user = userEvent.setup();
    openMarket();
    const offer = await screen.findByRole('button', { name: 'View Coup De Grâce Ring' });
    expect(within(offer).getByText('4.3x deal')).toBeVisible();
    expect(offer).toHaveTextContent('1 stack');
    expect(offer).toHaveTextContent('1 each · 1 item total');
    expect(offer).toHaveTextContent('1,999g / item');
    expect(offer).toHaveTextContent('1,999g / stack');
    expect(offer).toHaveTextContent('Observed average8,500g / item');
    offer.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Close detail panel' })).toBeVisible();
    expect(screen.getByText('+5,906g')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Copy in-game search' }));
    expect(await navigator.clipboard.readText()).toBe('/script TradingHouseSearch("Coup De Grâce Ring")');
    expect(screen.getByRole('button', { name: 'Search command copied' })).toBeVisible();
  });

  it('retains query filters, resets pagination on refinement, and uses the existing deal threshold', async () => {
    const user = userEvent.setup();
    openMarket('/marketplace?search=ring&category=Jewelry&subcategory=Ring&rarity=4&sort=price_asc');
    await screen.findByRole('button', { name: 'View Coup De Grâce Ring' });
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith({ limit: 20, offset: 0, server: 'NA', search: 'ring', category: 'Jewelry', subcategory: 'Ring', rarity: '4', sort: 'price_asc' });
    await user.click(screen.getByLabelText('Go to next page'));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 })));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Category' }), 'Materials');
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Materials', offset: 0 })));
    expect(api.fetchMarketListings.mock.lastCall[0]).not.toHaveProperty('subcategory');
    await user.click(screen.getByRole('button', { name: 'Deals only · 1.2x+ value' }));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ min_value_index: 1.2 })));
    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith({ limit: 20, offset: 0, server: 'NA', sort: 'value_index' }));
  });

  it('keeps catalog mode independent of listing-only filters and shows the existing empty state', async () => {
    const user = userEvent.setup();
    openMarket();
    await screen.findByRole('button', { name: 'View Coup De Grâce Ring' });
    await user.click(screen.getByRole('button', { name: 'Item catalog' }));
    expect(await screen.findByText('No Catalog Items Found')).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Trait' })).not.toBeInTheDocument();
    expect(api.fetchCatalogItems).toHaveBeenLastCalledWith({ limit: 20, offset: 0 });
  });

  it('preserves saved-search submit, apply, pin, and delete callbacks', async () => {
    const user = userEvent.setup();
    const search = { id: 1, name: 'tide', is_pinned: false, filter_params: { search: 'tide' } };
    const callbacks = { onSave: vi.fn().mockResolvedValue(true), onApply: vi.fn(), onTogglePin: vi.fn(), onDelete: vi.fn() };
    render(<SavedSearchesCard user={{ id: 1 }} searches={[search]} {...callbacks} />);
    await user.type(screen.getByRole('textbox', { name: 'Search name' }), 'Materials');
    await user.click(screen.getByRole('button', { name: 'Save search' }));
    expect(callbacks.onSave).toHaveBeenCalledWith('Materials');
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    await user.click(screen.getByRole('button', { name: 'Apply tide' }));
    expect(callbacks.onApply).toHaveBeenCalledWith(search);
    await user.click(screen.getByRole('button', { name: 'Pin tide' }));
    await user.click(screen.getByRole('button', { name: 'Delete tide' }));
    expect(callbacks.onTogglePin).toHaveBeenCalledWith(search);
    expect(callbacks.onDelete).toHaveBeenCalledWith(search);
  });
});
