import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Navbar from '../components/ui/navbar';
import SettingsMenu from '../components/ui/SettingsMenu';
import UserMenu from '../components/ui/UserMenu';
import DevAccountModal from '../components/dev/DevAccountModal';
import NotFound from '../pages/NotFound';

const doubles = vi.hoisted(() => ({
  auth: { user: null, logout: vi.fn(), devBypass: vi.fn(), refreshUser: vi.fn() },
  theme: { platform: 'PC', serverLocation: 'NA', theme: 'dark', togglePlatform: vi.fn(), toggleServerLocation: vi.fn(), setTheme: vi.fn() },
  api: { fetchSystemStatus: vi.fn(), fetchDevUsers: vi.fn(), devUpdateUser: vi.fn(), devDeleteUser: vi.fn(), registerUser: vi.fn(), clearAllListings: vi.fn() },
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => doubles.auth }));
vi.mock('../components/theme-provider', () => ({ useTheme: () => doubles.theme }));
vi.mock('../api/api', () => doubles.api);

function LocationReadout() {
  const location = useLocation();
  return <output aria-label="Current destination">{location.pathname}{location.state?.defaultTab ? `:${location.state.defaultTab}` : ''}</output>;
}
function renderShell(content, path = '/') {
  return render(<MemoryRouter initialEntries={[path]}>{content}<button>Outside control</button><LocationReadout /></MemoryRouter>);
}

beforeEach(() => {
  doubles.auth.user = null;
  Object.assign(doubles.theme, { platform: 'PC', serverLocation: 'NA', theme: 'dark' });
  doubles.api.fetchSystemStatus.mockResolvedValue({ success: false });
  doubles.api.fetchDevUsers.mockResolvedValue({ users: [] });
  doubles.auth.logout.mockResolvedValue(undefined);
});

describe('navigation and product identity', () => {
  it('retains hover-open after the first pointer click, supports Escape, and closes after navigation', async () => {
    const user = userEvent.setup();
    renderShell(<Navbar />);
    expect(screen.getByRole('link', { name: 'ESO Marketplace home' })).toHaveAttribute('href', '/');
    const requests = screen.getByRole('button', { name: 'Requests' });
    await user.hover(requests);
    expect(requests).toHaveAttribute('aria-expanded', 'true');
    await user.click(requests);
    expect(requests).toHaveAttribute('aria-expanded', 'true');
    await user.keyboard('{Escape}');
    expect(requests).toHaveFocus();
    expect(requests).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('link', { name: /My Orders Your requests/ }));
    expect(screen.getByLabelText('Current destination')).toHaveTextContent('/my-orders');
    expect(requests).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps keyboard focus inside an open disclosure until Tab leaves it', async () => {
    const user = userEvent.setup();
    renderShell(<Navbar />);
    const characters = screen.getByRole('button', { name: 'Characters' });
    act(() => characters.focus());
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('link', { name: /Characters Character profiles/ })).toHaveFocus();
    expect(characters).toHaveAttribute('aria-expanded', 'true');
    await user.tab();
    expect(screen.getByRole('link', { name: /Trait research Research progress/ })).toHaveFocus();
    await user.tab();
    expect(characters).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps all seven mobile destinations and current-page semantics', async () => {
    renderShell(<Navbar />, '/requests/my-orders');
    const mobile = screen.getAllByRole('navigation', { name: 'Main navigation' })[1];
    expect(within(mobile).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/', '/marketplace', '/requests', '/my-orders', '/builds', '/characters', '/traits']);
    expect(within(mobile).getByRole('link', { name: 'My Orders' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('utility control parity', () => {
  it('labels existing setting groups and exposes selected values without changing callbacks', async () => {
    const user = userEvent.setup();
    renderShell(<SettingsMenu syncStatus={{ status: 'offline' }} onOpenDevModal={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Settings' });
    await user.click(trigger);
    expect(screen.getByRole('group', { name: 'Game Platform' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'PC / Mac' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'North America (NA)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Console' }));
    expect(doubles.theme.togglePlatform).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Europe (EU)' }));
    expect(doubles.theme.toggleServerLocation).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'System' }));
    expect(doubles.theme.setTheme).toHaveBeenCalledWith('system');
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes settings when focus leaves, and anchors developer-dialog focus return to the persistent trigger', async () => {
    const user = userEvent.setup();
    const openDeveloper = vi.fn();
    renderShell(<SettingsMenu syncStatus={{ status: 'checking' }} onOpenDevModal={openDeveloper} />);
    const trigger = screen.getByRole('button', { name: 'Settings' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Developer accounts' }));
    expect(openDeveloper).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    act(() => screen.getByRole('button', { name: 'Outside control' }).focus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('preserves guest registration destination/state and authenticated sign-out', async () => {
    const user = userEvent.setup();
    const view = renderShell(<UserMenu />, '/traits');
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(screen.getByRole('link', { name: 'Create Account' }));
    expect(screen.getByLabelText('Current destination')).toHaveTextContent('/login:register');
    expect(screen.queryByRole('link', { name: 'Create Account' })).not.toBeInTheDocument();
    view.unmount();
    // Existing local development account identity; no API or session write is made.
    doubles.auth.user = { id: 1, username: 'Blake' };
    renderShell(<UserMenu />);
    const trigger = screen.getByRole('button', { name: 'Account menu' });
    await user.click(trigger);
    expect(screen.getByRole('link', { name: 'Characters and equipment' })).toHaveAttribute('href', '/characters');
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));
    expect(doubles.auth.logout).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('developer and fallback presentation', () => {
  it('does not load a closed developer dialog and gives create inputs persistent visible labels', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<DevAccountModal isOpen={false} onClose={onClose} />);
    expect(doubles.api.fetchDevUsers).not.toHaveBeenCalled();
    rerender(<DevAccountModal isOpen onClose={onClose} />);
    await screen.findByText('No accounts found.');
    await user.click(screen.getByRole('button', { name: 'Create Test Account' }));
    for (const name of ['Username', 'Email', 'Password', 'ESO handle']) expect(screen.getByLabelText(name)).toBeVisible();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(doubles.api.registerUser).not.toHaveBeenCalled();
    expect(doubles.api.clearAllListings).not.toHaveBeenCalled();
  });

  it('provides distinct account action names and labels every existing edit field', async () => {
    doubles.api.fetchDevUsers.mockResolvedValue({ users: [{ id: 1, username: 'Blake', email: 'blake@esotrade.local', eso_handle: '@Blake', role: 'admin' }] });
    const user = userEvent.setup();
    render(<DevAccountModal isOpen onClose={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Edit account @Blake' }));
    expect(screen.getByLabelText('Username')).toHaveValue('Blake');
    expect(screen.getByLabelText('Email')).toHaveValue('blake@esotrade.local');
    expect(screen.getByLabelText('ESO handle')).toHaveValue('@Blake');
    await user.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    expect(screen.getByRole('button', { name: 'Delete account @Blake' })).toBeVisible();
    expect(doubles.api.devUpdateUser).not.toHaveBeenCalled();
    expect(doubles.api.devDeleteUser).not.toHaveBeenCalled();
  });

  it('offers direct fallback links, not nested interactive controls', () => {
    renderShell(<NotFound />);
    const market = screen.getByRole('link', { name: 'Browse marketplace' });
    expect(market).toHaveAttribute('href', '/marketplace');
    expect(market.querySelector('button')).toBeNull();
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute('href', '/');
  });
});
