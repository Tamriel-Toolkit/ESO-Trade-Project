import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Marketplace from '../pages/Marketplace';
import SavedSearchesCard from '../components/SavedSearchesCard';
import * as api from '../api/api';
import { SettingsProvider, useSettings } from '../context/SettingsContext';

vi.mock('../components/ui/navbar', () => ({ default: () => <nav aria-label="Test navigation" /> }));
const auth = vi.hoisted(() => ({ user: null }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/theme-provider', () => ({
  useTheme: () => {
    const [serverLocation, setServerLocation] = React.useState('NA');
    const [platform, setPlatform] = React.useState('PC');
    return { serverLocation, platform, setServerLocation, setPlatform };
  },
}));
// Keep the removed catalog helper as a mock-only tripwire: this page must never call it.
vi.mock('../api/api', () => ({ fetchTaxonomy: vi.fn(), fetchMarketListings: vi.fn(), fetchCatalogItems: vi.fn(), clearAllListings: vi.fn(), fetchSavedSearches: vi.fn(), createSavedSearch: vi.fn(), setSavedSearchPinned: vi.fn(), deleteSavedSearch: vi.fn() }));

// Existing native observation read from the isolated SQLite copy on 7 September 2026.
// No fabricated listings are inserted into the application or a database.
const ring = { listing_id: 10000950, game_item_id: 219321, item_name: 'Coup De Grâce Ring', item_category: 'Jewelry', item_subcategory: 'Ring', item_icon: 'gear_breton_ring_a.png', price: 1999, quantity: 1, active_stacks: 1, quality: 4, seller_name: '@Danielzzz', guild_name: 'Lost Ark', location: 'Gonfalon Bay, High Isle', discovered_at: '2026-09-03 01:30:58', observed_min_price: 1999, observed_max_price: 15000, observed_avg_price: 8500, value_index: 4.252126063031516 };
function CurrentLocation() {
  const location = useLocation();
  return <output aria-label="Current location" data-route-state={JSON.stringify(location.state)}>{location.pathname}{location.search}{location.hash}</output>;
}
const openMarket = (path = '/marketplace', controls = null) => render(<MemoryRouter initialEntries={[path]}><SettingsProvider>{controls}<Marketplace /><CurrentLocation /></SettingsProvider></MemoryRouter>);

function PreferenceControls() {
  const settings = useSettings();
  return <>
    <button onClick={() => settings.setItemsPerPage('50')}>Use 50 results</button>
    <button onClick={() => settings.setItemsPerPage('100')}>Use 100 results</button>
    <button onClick={() => settings.setDefaultMinDealScore('1.5')}>Use 1.5 score</button>
    <button onClick={() => settings.setDefaultMinDealScore('1.0')}>Use 1.0 score</button>
    <button onClick={() => settings.setLayoutMode('compact')}>Use compact layout</button>
    <button onClick={() => settings.setAutoRefreshInterval('off')}>Disable refresh</button>
  </>;
}

beforeEach(() => {
  localStorage.clear();
  auth.user = null;
  api.fetchTaxonomy.mockResolvedValue({ Jewelry: ['Ring'], Materials: ['Style Material'] });
  api.fetchMarketListings.mockResolvedValue({ listings: [ring], total: 278 });
  api.fetchCatalogItems.mockResolvedValue({ items: [], total: 0 });
  api.fetchSavedSearches.mockResolvedValue({ success: true, saved_searches: [] });
});
afterEach(() => vi.useRealTimers());

describe('marketplace preference behavior', () => {
  it('applies persisted preferences and resets offsets on live page-size and threshold changes', async () => {
    localStorage.setItem('eso-setting-items-per-page', '50');
    localStorage.setItem('eso-setting-min-deal-score', '1.25');
    localStorage.setItem('eso-setting-layout-mode', 'compact');
    const user = userEvent.setup();
    openMarket('/marketplace', <PreferenceControls />);
    const card = await screen.findByRole('button', { name: 'View Coup De Grâce Ring' });
    expect(card.parentElement).toHaveClass('is-compact');
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 50, offset: 0 }));
    await user.click(screen.getByLabelText('Go to next page'));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 50 })));
    await user.click(screen.getByRole('button', { name: 'Use 100 results' }));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100, offset: 0 })));
    await user.click(screen.getByRole('button', { name: 'Deals only · 1.25x+ value' }));
    await user.click(screen.getByLabelText('Go to next page'));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 100, min_value_index: 1.25 })));
    await user.click(screen.getByRole('button', { name: 'Use 1.5 score' }));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100, offset: 0, min_value_index: 1.5 })));
    expect(screen.getByRole('button', { name: 'Deals only · 1.5x+ value' })).toHaveAttribute('aria-pressed', 'true');
    // The client must not truncate or re-filter results returned by the API.
    expect(screen.getByRole('button', { name: 'View Coup De Grâce Ring' })).toBeVisible();
  });

  it('changes the layout immediately without an unnecessary API request', async () => {
    const user = userEvent.setup();
    openMarket('/marketplace', <PreferenceControls />);
    const card = await screen.findByRole('button', { name: 'View Coup De Grâce Ring' });
    expect(card.parentElement).not.toHaveClass('is-compact');
    const count = api.fetchMarketListings.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Use compact layout' }));
    expect(card.parentElement).toHaveClass('is-compact');
    expect(api.fetchMarketListings).toHaveBeenCalledTimes(count);
  });

  it('serializes refreshes, preserves cards/focus on failure, retries, and stops when disabled', async () => {
    vi.useFakeTimers();
    localStorage.setItem('eso-setting-auto-refresh', '15');
    const view = openMarket('/marketplace', <PreferenceControls />);
    await act(async () => {});
    const card = screen.getByRole('button', { name: 'View Coup De Grâce Ring' });
    act(() => card.focus());
    let finishRefresh;
    api.fetchMarketListings.mockImplementationOnce(() => new Promise(resolve => { finishRefresh = resolve; }));
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(api.fetchMarketListings).toHaveBeenCalledTimes(2);
    expect(card).toHaveFocus();
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(api.fetchMarketListings).toHaveBeenCalledTimes(2);
    await act(async () => finishRefresh({ error: 'API unavailable', total: 0, listings: [] }));
    expect(card).toHaveFocus();
    expect(card).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('last successful request');
    await act(() => vi.advanceTimersByTimeAsync(15000));
    expect(api.fetchMarketListings).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Disable refresh' })));
    const count = api.fetchMarketListings.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(120000));
    expect(api.fetchMarketListings).toHaveBeenCalledTimes(count);
    view.unmount();
  });

  it('ignores old-query responses and clears polling when unmounted', async () => {
    vi.useFakeTimers();
    localStorage.setItem('eso-setting-auto-refresh', '30');
    const view = openMarket();
    await act(async () => {});
    let finishOldQuery;
    api.fetchMarketListings.mockImplementationOnce(() => new Promise(resolve => { finishOldQuery = resolve; }));
    await act(() => vi.advanceTimersByTimeAsync(30000));
    api.fetchMarketListings.mockResolvedValue({ total: 0, listings: [] });
    await act(async () => fireEvent.change(screen.getByRole('combobox', { name: 'Category' }), { target: { value: 'Materials' } }));
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'Materials' }));
    await act(async () => finishOldQuery({ total: 278, listings: [ring] }));
    expect(screen.queryByRole('button', { name: 'View Coup De Grâce Ring' })).not.toBeInTheDocument();
    view.unmount();
    const count = api.fetchMarketListings.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(120000));
    expect(api.fetchMarketListings).toHaveBeenCalledTimes(count);
  });

  it('returns to a valid page if refreshed observations reduce the page count', async () => {
    vi.useFakeTimers();
    localStorage.setItem('eso-setting-auto-refresh', '60');
    openMarket();
    await act(async () => {});
    await act(async () => fireEvent.click(screen.getByLabelText('Go to next page')));
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 20 }));
    api.fetchMarketListings.mockResolvedValue({ total: 1, listings: [ring] });
    await act(() => vi.advanceTimersByTimeAsync(60000));
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0 }));
    expect(screen.getByRole('button', { name: 'View Coup De Grâce Ring' })).toBeVisible();
  });

  it('shows a retryable error instead of claiming an initial API failure is an empty market', async () => {
    api.fetchMarketListings.mockResolvedValueOnce({ total: 0, listings: [], error: 'Unavailable' });
    const user = userEvent.setup();
    openMarket();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to refresh listings');
    expect(screen.queryByText('No Guild Trader Scans Logged')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry listings' }));
    expect(await screen.findByRole('button', { name: 'View Coup De Grâce Ring' })).toBeVisible();
  });
});

describe('marketplace presentation parity', () => {
  it('preserves the historical feathers example: three stacks, 300 items, and separate unit/stack prices', async () => {
    // Same observed record as docs/design/issue-132/fixtures.js; read from the isolated API copy.
    api.fetchMarketListings.mockResolvedValue({ total: 1, listings: [{ listing_id: 10000762, game_item_id: 212134, item_name: 'Tide-Born Feathers', item_icon: 'styleitemicon_u46_solsticeargonians.png', item_category: 'Materials', item_subcategory: 'Style Material', price: 2100, quantity: 100, active_stacks: 3, quality: 1, guild_name: 'Lost Ark', seller_name: '@wangpm001', location: 'Gonfalon Bay, High Isle', discovered_at: '2026-09-03 01:32:23', observed_avg_price: 2100, value_index: 1 }] });
    openMarket('/marketplace', <PreferenceControls />);
    const offer = await screen.findByRole('button', { name: 'View Tide-Born Feathers' });
    expect(offer).toHaveTextContent('3 stacks');
    expect(offer).toHaveTextContent('100 each · 300 items total');
    expect(offer).toHaveTextContent('2,100g / item');
    expect(offer).toHaveTextContent('210,000g / stack');
    expect(offer).not.toHaveTextContent(/\dx deal/);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Use 1.0 score' }));
    expect(await screen.findByText('1.0x deal')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Use 1.5 score' }));
    await screen.findByRole('button', { name: 'View Tide-Born Feathers' });
    expect(screen.queryByText('1.0x deal')).not.toBeInTheDocument();
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

  it('opens legacy catalog links as listings without losing other query parameters', async () => {
    openMarket({ pathname: '/marketplace', search: '?view=catalog&search=ring&category=Jewelry&subcategory=Ring&rarity=4&trait=Infused&location=Summerset&sort=price_asc&source=bookmark', hash: '#offers', state: { from: '/characters' } });
    await screen.findByRole('button', { name: 'View Coup De Grâce Ring' });
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith({ limit: 20, offset: 0, server: 'NA', search: 'ring', category: 'Jewelry', subcategory: 'Ring', rarity: '4', trait: 'Infused', location: 'Summerset', sort: 'price_asc' });
    const location = new URL(screen.getByLabelText('Current location').textContent, 'https://example.test');
    expect(Object.fromEntries(location.searchParams)).toEqual({ view: 'listings', search: 'ring', category: 'Jewelry', subcategory: 'Ring', rarity: '4', trait: 'Infused', location: 'Summerset', sort: 'price_asc', source: 'bookmark' });
    expect(location.hash).toBe('#offers');
    expect(screen.getByLabelText('Current location')).toHaveAttribute('data-route-state', JSON.stringify({ from: '/characters' }));
    expect(screen.getByRole('heading', { name: 'Marketplace', level: 1 })).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Trait' })).toHaveValue('Infused');
    expect(screen.getByRole('combobox', { name: 'Last seen' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Item catalog' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Marketplace view' })).not.toBeInTheDocument();
    expect(api.fetchCatalogItems).not.toHaveBeenCalled();
  });

  it('shows the listing empty state for legacy catalog links, without requesting catalog items', async () => {
    api.fetchMarketListings.mockResolvedValue({ listings: [], total: 0 });
    openMarket('/marketplace?view=catalog');
    expect(await screen.findByText('No Guild Trader Scans Logged')).toBeVisible();
    expect(api.fetchMarketListings).toHaveBeenLastCalledWith({ limit: 20, offset: 0, server: 'NA', sort: 'value_index' });
    expect(screen.queryByText(/No Catalog Items/)).not.toBeInTheDocument();
    expect(api.fetchCatalogItems).not.toHaveBeenCalled();
  });

  it('applies legacy catalog presets to listings and saves new presets with the listings view', async () => {
    const user = userEvent.setup();
    auth.user = { id: 1 };
    const filters = { view: 'catalog', search: 'ring', category: 'Jewelry', subcategory: 'Ring', rarity: '4', trait: 'Infused', location: 'Summerset', max_age: '7', sort: 'price_asc', deals_only: true, server: 'EU', platform: 'PlayStation' };
    api.fetchSavedSearches.mockResolvedValue({ success: true, saved_searches: [{ id: 1, name: 'Legacy search', filter_params: filters }] });
    api.createSavedSearch.mockImplementation(async (name, filter_params) => ({ success: true, saved_search: { id: 2, name, filter_params } }));
    openMarket();
    await user.click(await screen.findByRole('button', { name: 'Apply Legacy search' }));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith({ limit: 20, offset: 0, server: 'EU', search: 'ring', category: 'Jewelry', subcategory: 'Ring', rarity: '4', trait: 'Infused', location: 'Summerset', max_age: '7', sort: 'price_asc', min_value_index: 1.2 }));
    expect(screen.getByText('PlayStation · EU')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Last seen' })).toHaveValue('7');
    expect(screen.getByRole('button', { name: 'Deals only · 1.2x+ value' })).toHaveAttribute('aria-pressed', 'true');
    await user.type(screen.getByRole('textbox', { name: 'Search name' }), 'Current search');
    await user.click(screen.getByRole('button', { name: 'Save search' }));
    expect(api.createSavedSearch).toHaveBeenCalledWith('Current search', { ...filters, view: 'listings' });
    expect(api.fetchCatalogItems).not.toHaveBeenCalled();
  });

  it('retains the name-as-item-search fallback for a legacy catalog-only preset', async () => {
    const user = userEvent.setup();
    auth.user = { id: 1 };
    api.fetchSavedSearches.mockResolvedValue({ success: true, saved_searches: [{ id: 1, name: 'ring', filter_params: { view: 'catalog' } }] });
    openMarket();
    await user.click(await screen.findByRole('button', { name: 'Apply ring' }));
    await waitFor(() => expect(api.fetchMarketListings).toHaveBeenLastCalledWith({ limit: 20, offset: 0, server: 'NA', search: 'ring', sort: 'value_index' }));
    expect(api.fetchCatalogItems).not.toHaveBeenCalled();
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

  it('renders trait badge and displays trait description in detail panel', async () => {
    const user = userEvent.setup();
    const traitedItem = {
      listing_id: 10000999,
      game_item_id: 1129,
      item_name: "Rubedite Cuirass",
      item_category: "Armor",
      item_subcategory: "Heavy Armor",
      item_icon: "gear_rubedite_cuirass.png",
      price: 5000,
      quantity: 1,
      active_stacks: 1,
      quality: 4,
      trait_id: 18,
      trait_name: "Divines",
      trait_description: "Increases Mundus Stone effects by up to 9.1%.",
      seller_name: "@Crafter",
      guild_name: "Lost Ark",
      location: "Gonfalon Bay",
      discovered_at: "2026-09-03 01:30:58",
      observed_min_price: 5000,
      observed_max_price: 5000,
      observed_avg_price: 5000,
      value_index: 1.0,
      item_metadata: {}
    };
    api.fetchMarketListings.mockResolvedValue({ total: 1, listings: [traitedItem] });
    openMarket();
    const card = await screen.findByRole('button', { name: 'View Rubedite Cuirass' });
    expect(within(card).getByText('Trait: Divines')).toBeVisible();

    await user.click(card);
    const detail = document.getElementById('market-item-detail');
    expect(within(detail).getByText('• Trait: Divines')).toBeVisible();
    expect(within(detail).getByText('Trait: Divines')).toBeVisible();
    expect(within(detail).getByText('Increases Mundus Stone effects by up to 9.1%.')).toBeVisible();
  });

  it('renders trait name from item_metadata fallback and above trait description', async () => {
    const user = userEvent.setup();
    const catalogTraitedItem = {
      listing_id: 10000998,
      game_item_id: 45348,
      item_name: "homespun shoes^p",
      item_category: "Apparel",
      item_subcategory: "Light Armor",
      item_icon: "gear_breton_light_feet_a.png",
      price: 9,
      quantity: 1,
      active_stacks: 1,
      quality: 1,
      trait_id: 0,
      seller_name: "@ADS8688",
      guild_name: "Lost Ark",
      location: "Gonfalon Bay, High Isle",
      discovered_at: "2026-09-03 01:30:58",
      observed_min_price: 9,
      observed_max_price: 84,
      observed_avg_price: 47,
      value_index: 5.2,
      item_metadata: {
        trait_id: 20,
        trait_description: "Increases inspiration gained from deconstruction of this item by 280-300%, and gain additional refined material upon deconstruction of this item."
      }
    };
    api.fetchMarketListings.mockResolvedValue({ total: 1, listings: [catalogTraitedItem] });
    openMarket();
    const card = await screen.findByRole('button', { name: 'View homespun shoes' });
    expect(within(card).getByText('homespun shoes')).toBeVisible();
    expect(screen.queryByText(/homespun shoes\^p/)).not.toBeInTheDocument();
    expect(within(card).getByText('Trait: Intricate')).toBeVisible();

    await user.click(card);
    const detail = document.getElementById('market-item-detail');
    expect(within(detail).getByText('homespun shoes')).toBeVisible();
    expect(within(detail).getByText('• Trait: Intricate')).toBeVisible();
    expect(within(detail).getByText('Trait: Intricate')).toBeVisible();
    expect(within(detail).getByText(/Increases inspiration gained from deconstruction/)).toBeVisible();
  });

  it('strips ESO grammatical suffixes like ^n, ^p, and ^ns from item titles and search command', async () => {
    const user = userEvent.setup();
    const suffixItems = [
      {
        listing_id: 10000801,
        game_item_id: 45348,
        item_name: "homespun shoes^p",
        item_category: "Apparel",
        price: 10,
        quantity: 1,
        active_stacks: 1,
        quality: 1,
        trait_id: 20,
        trait_name: "Intricate",
        seller_name: "@Tester",
        guild_name: "Lost Ark",
        location: "Gonfalon Bay"
      },
      {
        listing_id: 10000802,
        game_item_id: 45349,
        item_name: "oak bow^n",
        item_category: "Weapon",
        price: 20,
        quantity: 1,
        active_stacks: 1,
        quality: 1,
        trait_id: 6,
        trait_name: "Training",
        seller_name: "@Tester",
        guild_name: "Lost Ark",
        location: "Gonfalon Bay"
      }
    ];
    api.fetchMarketListings.mockResolvedValue({ total: 2, listings: suffixItems });
    openMarket();

    const shoesCard = await screen.findByRole('button', { name: 'View homespun shoes' });
    expect(within(shoesCard).getByText('homespun shoes')).toBeVisible();
    expect(screen.queryByText(/homespun shoes\^p/)).not.toBeInTheDocument();

    const bowCard = await screen.findByRole('button', { name: 'View oak bow' });
    expect(within(bowCard).getByText('oak bow')).toBeVisible();
    expect(screen.queryByText(/oak bow\^n/)).not.toBeInTheDocument();

    await user.click(shoesCard);
    const detail = document.getElementById('market-item-detail');
    expect(within(detail).getByText('homespun shoes')).toBeVisible();

    await user.click(within(detail).getByRole('button', { name: 'Copy in-game search' }));
    expect(await navigator.clipboard.readText()).toBe('/script TradingHouseSearch("homespun shoes")');
  });

  it('preserves exact stack purchase prices and fractional unit prices without rounding inflation (#138)', async () => {
    const user = userEvent.setup();
    const lockpicks = {
      listing_id: 10000999,
      game_item_id: 1234,
      item_name: 'Lockpicks',
      item_category: 'Consumables',
      price: 3.72,
      total_price: 744,
      quantity: 200,
      active_stacks: 1,
      quality: 1,
      seller_name: '@Locksmith',
      guild_name: 'Thieves Guild',
      location: "Abah's Landing",
      discovered_at: '2026-09-19 20:00:00',
    };
    api.fetchMarketListings.mockResolvedValue({ total: 1, listings: [lockpicks] });
    openMarket();

    const offer = await screen.findByRole('button', { name: 'View Lockpicks' });
    // Unit price displays 3.72g / item, stack price displays exact 744g / stack (not 800g)
    expect(offer).toHaveTextContent('3.72g / item');
    expect(offer).toHaveTextContent('744g / stack');

    await user.click(offer);
    const detail = document.getElementById('market-item-detail');
    expect(within(detail).getByText('3.72g / ea')).toBeVisible();
    expect(within(detail).getByText('744g')).toBeVisible();
    expect(within(detail).queryByText('800g')).not.toBeInTheDocument();
  });
});
