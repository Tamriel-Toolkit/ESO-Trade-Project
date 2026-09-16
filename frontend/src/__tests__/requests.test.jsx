import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RequestCard } from '../components/requests/RequestCard';
import { RequestModal } from '../components/requests/RequestModal';
import { RequestBoard } from '../pages/RequestBoard';
import { MyOrders } from '../pages/MyOrders';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 1, eso_handle: '@Blake' } },
  fetchTradeRequests: vi.fn(), fetchTradeRequestStats: vi.fn(), createTradeRequest: vi.fn(),
  fetchCraftableSets: vi.fn(), apiFetch: vi.fn(),
  claimTradeRequest: vi.fn(), unclaimTradeRequest: vi.fn(), completeTradeRequest: vi.fn(),
  fulfillTradeRequest: vi.fn(), cancelTradeRequest: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../components/theme-provider', () => ({ useTheme: () => ({ serverLocation: 'NA' }) }));
vi.mock('../components/ui/navbar', () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock('../api/api', () => mocks);

// Isolated request contract fixture based on the owner's request-board screenshot.
// No market listings are seeded or sent to a real API.
const request = {
  id: 1, user_id: 1, claimed_by_user_id: 2, buyer_display_handle: '@Blake',
  claimed_by_handle: '@Crafter', request_type: 'CRAFTING', server: 'NA', status: 'OPEN',
  item_name: "Jade General’s Helm", set_name: 'Green Pact', quality: 5, trait_name: 'Divines',
  style_name: 'Any Style', cp_req: 160, quantity: 1, offered_gold_price: 70000,
  icon_url: 'gear_breton_light_head_a.png',
};

beforeEach(() => {
  mocks.auth.user = { id: 1, eso_handle: '@Blake' };
  mocks.fetchTradeRequests.mockResolvedValue({ requests: [], total: 0 });
  mocks.fetchTradeRequestStats.mockResolvedValue({ total_open: 0, total_in_progress: 0 });
  mocks.fetchCraftableSets.mockResolvedValue([]);
  mocks.createTradeRequest.mockResolvedValue({ success: true });
  mocks.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });
});

function card(props = {}) {
  const handlers = { onClaim: vi.fn(), onUnclaim: vi.fn(), onComplete: vi.fn(), onFulfill: vi.fn(), onCancel: vi.fn() };
  render(<RequestCard request={request} currentUser={{ id: 1 }} {...handlers} {...props} />);
  return handlers;
}

describe('request-card role and value parity', () => {
  it.each([
    ['OPEN', 1, 'Cancel request', 'onCancel'],
    ['OPEN', 3, 'Claim order', 'onClaim'],
    ['IN_PROGRESS', 2, 'Mark completed', 'onComplete'],
    ['IN_PROGRESS', 2, 'Release claim', 'onUnclaim'],
    ['IN_PROGRESS', 1, 'Confirm & close', 'onFulfill'],
    ['IN_PROGRESS', 1, 'Unassign', 'onUnclaim'],
    ['COMPLETED', 1, 'Confirm delivery & close', 'onFulfill'],
    ['COMPLETED', 1, 'Unassign', 'onUnclaim'],
    ['COMPLETED', 2, 'Release', 'onUnclaim'],
  ])('retains %s role %s action %s', (status, id, label, handler) => {
    const handlers = card({ request: { ...request, status }, currentUser: { id } });
    fireEvent.click(screen.getByRole('button', { name: label, exact: true }));
    expect(handlers[handler]).toHaveBeenCalledExactlyOnceWith(request.id);
  });

  it('keeps signed-out claims and pending owner cancellation disabled', () => {
    const { unmount } = render(<RequestCard request={request} currentUser={null} />);
    expect(screen.getByRole('button', { name: 'Sign in to claim' })).toBeDisabled();
    unmount();
    card({ isCanceling: true });
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeDisabled();
  });

  it('keeps unit/total arithmetic, specs, icon cache path, and both clipboard commands', () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    card({ request: { ...request, quantity: 2 } });
    expect(screen.getByText('140,000g')).toBeVisible();
    expect(screen.getByText('70,000g each')).toBeVisible();
    expect(screen.getByText('CP 160')).toBeVisible();
    expect(screen.getByText('Trait: Divines')).toBeVisible();
    expect(new URL(screen.getByRole('img').src).pathname).toBe('/api/icons/gear_breton_light_head_a.png');
    fireEvent.click(screen.getByRole('button', { name: 'Copy whisper' }));
    expect(writeText).toHaveBeenLastCalledWith('/w @Blake Hello! I can fulfill your crafting order for 2x Jade General’s Helm (70,000g C.O.D.).');
    fireEvent.click(screen.getByRole('button', { name: 'Copy C.O.D. note' }));
    expect(writeText).toHaveBeenLastCalledWith('2x Jade General’s Helm (Green Pact) - Requested on ESO Marketplace');
  });

  it('retains claim expiry and terminal status without adding transactional actions', () => {
    card({ request: { ...request, status: 'IN_PROGRESS', claim_expires_at: '2000-01-01T00:00:00Z' }, currentUser: { id: 3 } });
    expect(screen.getByText('Claim Expired (Reverting)')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Claim order' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm & close' })).not.toBeInTheDocument();
  });
});

describe('request workflow parity', () => {
  it('retains server, all refinements, sort, and 12-row pagination query contracts', async () => {
    mocks.fetchTradeRequests.mockResolvedValue({ requests: [request], total: 25 });
    render(<MemoryRouter><RequestBoard /></MemoryRouter>);
    await screen.findByRole('article');
    fireEvent.change(screen.getByRole('combobox', { name: 'Request type' }), { target: { value: 'CRAFTING' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Request category' }), { target: { value: 'Apparel' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Request status' }), { target: { value: 'IN_PROGRESS' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort requests' }), { target: { value: 'gold_desc' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search requests by item, set, or handle' }), { target: { value: '  Jade  ' } });
    await waitFor(() => expect(mocks.fetchTradeRequests).toHaveBeenLastCalledWith({ server: 'NA', limit: 12, offset: 0, request_type: 'CRAFTING', category: 'Apparel', status: 'IN_PROGRESS', sort: 'gold_desc', search: 'Jade' }));
    await screen.findByRole('article');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(mocks.fetchTradeRequests.mock.lastCall[0].offset).toBe(12));
    fireEvent.click(screen.getByRole('button', { name: 'EU', exact: true }));
    await waitFor(() => expect(mocks.fetchTradeRequests.mock.lastCall[0]).toMatchObject({ server: 'EU', offset: 0 }));
    expect(screen.getByRole('link', { name: 'My orders & claims →' })).toHaveAttribute('href', '/my-orders');
  });

  it('keeps My Orders ownership/status tabs and signed-out routes', async () => {
    mocks.fetchTradeRequests.mockResolvedValue({ requests: [request, { ...request, id: 2, user_id: 3, claimed_by_user_id: 1, status: 'IN_PROGRESS' }, { ...request, id: 3, status: 'FULFILLED' }, { ...request, id: 4, user_id: 4, claimed_by_user_id: 5 }], total: 4 });
    const { unmount } = render(<MemoryRouter><MyOrders /></MemoryRouter>);
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(2));
    fireEvent.click(screen.getByRole('button', { name: 'Posted (1)' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Claimed (1)' }));
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Fulfilled (1)' }));
    expect(screen.getByText('Fulfilled & closed')).toBeVisible();
    unmount();
    mocks.auth.user = null;
    render(<MemoryRouter><MyOrders /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Sign in or register' })).toHaveAttribute('href', '/login');
  });

  it('keeps selected-item configuration, offer arithmetic and request payload intact', async () => {
    const selected = { game_item_id: 1, name: 'Tide-Born Feathers', category: 'Materials', subcategory: 'Style Material', icon_url: 'styleitemicon_u46_solsticeargonians.png' };
    mocks.apiFetch.mockResolvedValue({ ok: true, json: async () => ({ items: [selected] }) });
    const onClose = vi.fn(), onRequestCreated = vi.fn();
    render(<RequestModal isOpen defaultServer="EU" onClose={onClose} onRequestCreated={onRequestCreated} />);
    const dialog = screen.getByRole('dialog', { name: 'Post request' });
    expect(within(dialog).getByRole('button', { name: 'Publish request' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Item' }), { target: { value: 'tide' } });
    const result = await screen.findByRole('button', { name: /Tide-Born Feathers/ });
    result.focus();
    fireEvent.click(result);
    expect(screen.getByRole('spinbutton', { name: 'Desired quantity' })).toHaveValue(8);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Gold offer per item' }), { target: { value: '2100' } });
    expect(screen.getByText('16,800g')).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'Delivery instructions' }), { target: { value: '  C.O.D. please  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish request' }));
    await waitFor(() => expect(mocks.createTradeRequest).toHaveBeenCalledExactlyOnceWith({ request_type: 'WTB', server: 'EU', buyer_display_handle: '@Blake', game_item_id: 1, item_name: selected.name, category: 'Materials', subcategory: 'Style Material', quantity: 8, quality: 1, trait_name: null, style_name: null, set_name: null, level_req: 50, cp_req: 160, offered_gold_price: 2100, delivery_notes: 'C.O.D. please' }));
    expect(onRequestCreated).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
