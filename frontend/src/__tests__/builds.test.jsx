import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { BuildExplorer } from '../pages/BuildExplorer';
import { BuildCreatorModal } from '../components/builds/BuildCreatorModal';
import { BuildDetailModal } from '../components/builds/BuildDetailModal';

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 1, role: 'user' } },
  fetchBuilds: vi.fn(), deleteCustomBuild: vi.fn(), createCustomBuild: vi.fn(),
  fetchSets: vi.fn(), resolveSetItem: vi.fn(), fetchBuildById: vi.fn(),
  fetchBuildGearDiff: vi.fn(), fetchBuildDeals: vi.fn(), fetchCharacters: vi.fn(), deleteBuild: vi.fn(),
}));
vi.mock('../api/api', () => mocks);
vi.mock('../context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('../components/ui/navbar', () => ({ default: () => <nav aria-label="Main navigation" /> }));

// Existing authored build/item identities; isolated API contract responses only.
const item = { slot_id: 9, slot_name: 'Ring 1', item_name: 'Deadly Ring', set_name: 'Deadly Strike', item_type: 'Ring', trait_name: 'Bloodthirsty', quality: 4, item_icon: 'gear_breton_ring_a.png', is_tradeable: 1 };
const build = { id: 1, user_id: 1, title: 'Arcanist Fatecarver Beam DPS', author: 'Skinny Cheeks', class: 'Arcanist', role: 'Stamina DPS', is_curated: 1, items: [item], sets: [{ name: 'Deadly Strike', count: 1 }] };

beforeEach(() => {
  mocks.auth.user = { id: 1, role: 'user' };
  mocks.fetchBuilds.mockResolvedValue({ success: true, builds: [] });
  mocks.fetchSets.mockResolvedValue({ success: true, sets: [{ name: "Order's Wrath", category: 'Crafted / Overland', source: 'High Isle', is_tradeable: 1, allowed_weights: ['Light', 'Medium', 'Heavy'], bonuses: [] }] });
  mocks.resolveSetItem.mockResolvedValue({ success: true, item_name: "Order's Wrath Hat", item_icon: 'gear_breton_light_head_d.png', effective_weight: 'Light', game_item_id: 1 });
  mocks.createCustomBuild.mockResolvedValue({ success: true, build_id: 8 });
  mocks.fetchBuildById.mockResolvedValue({ success: true, build });
  mocks.fetchCharacters.mockResolvedValue({ characters: [{ id: 1, name: 'Summonerofthedead', class: 'Necromancer', level: 50 }] });
  mocks.fetchBuildGearDiff.mockResolvedValue({ success: true, completion_rate: 0, matched_count: 0, total_slots: 1, trait_mismatch_count: 0, missing_count: 1, slot_diffs: [{ slot_id: 9, slot_name: 'Ring 1', target_item: item, status: 'missing' }] });
  mocks.fetchBuildDeals.mockResolvedValue({ success: true, total_estimated_gold: 0, deals_by_slot: [], zone_itinerary: [] });
});

describe('build presentation and workflow parity', () => {
  it('keeps build search explicit and the signed-out creation destination', async () => {
    mocks.auth.user = null;
    render(<MemoryRouter><BuildExplorer /></MemoryRouter>);
    await screen.findByText('No matching builds');
    expect(mocks.fetchBuilds).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search builds, sets, or authors' }), { target: { value: '  Arcanist  ' } });
    expect(mocks.fetchBuilds).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await waitFor(() => expect(mocks.fetchBuilds).toHaveBeenLastCalledWith({ class: undefined, role: undefined, search: 'Arcanist' }));
    expect(screen.getByRole('link', { name: 'Sign in to create a build' })).toHaveAttribute('href', '/login');
  });

  it('preserves creator validation, all thirteen slots and the exact save contract', async () => {
    const onClose = vi.fn(), onBuildCreated = vi.fn();
    render(<MemoryRouter><BuildCreatorModal onClose={onClose} onBuildCreated={onBuildCreated} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Save build' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please provide a build title.');
    expect(mocks.createCustomBuild).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Build title (required)' }), { target: { value: '  My equipment plan  ' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Build class' }), { target: { value: 'Necromancer' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Build role' }), { target: { value: 'Magicka DPS' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes and rotation' }), { target: { value: '  Rotation notes  ' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Head trait' }), { target: { value: 'Infused' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Head enchantment' }), { target: { value: 'Max Magicka' } });
    expect(screen.getAllByRole('button', { name: /^Change set for / })).toHaveLength(13);
    fireEvent.click(screen.getByRole('button', { name: 'Save build' }));
    await waitFor(() => expect(mocks.createCustomBuild).toHaveBeenCalledOnce());
    const payload = mocks.createCustomBuild.mock.lastCall[0];
    expect(payload).toMatchObject({ title: 'My equipment plan', description: 'Rotation notes', class: 'Necromancer', role: 'Magicka DPS', author: undefined, source_url: undefined });
    expect(payload.items).toHaveLength(13);
    expect(payload.items[0]).toMatchObject({ slot_id: 0, set_name: 'Stormfist', trait_name: 'Infused', enchantment: 'Max Magicka', is_tradeable: 0 });
    expect(onBuildCreated).toHaveBeenCalledExactlyOnceWith(8);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('traps the nested set picker, restores its opener, and keeps selected-set resolution', async () => {
    const user = userEvent.setup(), onClose = vi.fn();
    render(<MemoryRouter><BuildCreatorModal onClose={onClose} /></MemoryRouter>);
    await waitFor(() => expect(mocks.fetchSets).toHaveBeenCalledWith({ limit: 1000 }));
    const opener = screen.getByRole('button', { name: 'Change set for Head' });
    await user.click(opener);
    expect(screen.getAllByRole('dialog')).toHaveLength(2);
    const picker = screen.getByRole('dialog', { name: 'Set for Head' });
    expect(picker).toContainElement(document.activeElement);
    await user.keyboard('{Escape}');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await user.click(opener);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Set for Head' })).getByRole('button', { name: /Order's Wrath/ }));
    await waitFor(() => expect(mocks.resolveSetItem).toHaveBeenCalledExactlyOnceWith({ set: "Order's Wrath", slot_id: 0, slot_name: 'Head', weight: 'Medium', weapon: 'Dagger' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(await screen.findByText("Order's Wrath Hat")).toBeVisible();
  });

  it('preserves equipment bars and does not expose deletion for a curated build', async () => {
    render(<MemoryRouter><BuildDetailModal buildId={1} onClose={vi.fn()} /></MemoryRouter>);
    await screen.findByText(build.title);
    expect(screen.queryByRole('button', { name: 'Delete build' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Front Bar', exact: true })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Back Bar', exact: true }));
    expect(screen.getByRole('button', { name: 'Back Bar', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Set bonuses · back bar')).toBeVisible();
  });

  it('preserves comparison requests, server switching and structured marketplace destination', async () => {
    function Location() { return <output aria-label="Current location">{useLocation().search}</output>; }
    const onClose = vi.fn();
    render(<MemoryRouter><BuildDetailModal buildId={1} initialTab="diff" onClose={onClose} /><Location /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Search market' });
    expect(mocks.fetchBuildGearDiff).toHaveBeenLastCalledWith(1, 1);
    expect(mocks.fetchBuildDeals).toHaveBeenLastCalledWith(1, { server: 'NA', characterId: 1 });
    expect(screen.getByText('No active market listings currently recorded')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'EU', exact: true }));
    await waitFor(() => expect(mocks.fetchBuildDeals).toHaveBeenLastCalledWith(1, { server: 'EU', characterId: 1 }));
    fireEvent.click(await screen.findByRole('button', { name: 'Search market' }));
    expect(Object.fromEntries(new URLSearchParams(screen.getByLabelText('Current location').textContent))).toEqual({ view: 'listings', search: 'Deadly Strike', trait: 'Bloodthirsty', category: 'Jewelry', subcategory: 'Ring' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
