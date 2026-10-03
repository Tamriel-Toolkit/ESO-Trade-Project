import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsMenu from '../components/ui/SettingsMenu';
import { ThemeProvider } from '../components/theme-provider';
import { SettingsProvider, useSettings } from '../context/SettingsContext';

function openSettings(syncStatus = { status: 'online', latestScan: '3 October' }) {
  return render(
    <MemoryRouter><ThemeProvider><SettingsProvider>
      <SettingsMenu syncStatus={syncStatus} onOpenDevModal={vi.fn()} />
    </SettingsProvider></ThemeProvider></MemoryRouter>,
  );
}

async function openPreferences(user) {
  await user.click(screen.getByRole('button', { name: 'Settings', exact: true }));
  await user.click(screen.getByRole('button', { name: 'Marketplace preferences' }));
  return screen.getByRole('dialog', { name: 'Marketplace preferences' });
}

function PreferencesProbe() {
  const settings = useSettings();
  return <>
    <output aria-label="Preferences">{[settings.autoRefreshInterval, settings.defaultMinDealScore, settings.itemsPerPage, settings.layoutMode].join('/')}</output>
    <button onClick={() => settings.setItemsPerPage('50')}>Set page size</button>
    <button onClick={() => settings.setAutoRefreshInterval('-1')}>Invalid refresh</button>
  </>;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllEnvs());

describe('header marketplace preferences', () => {
  it('opens from the header, traps focus, and returns focus and scrolling on Escape', async () => {
    const user = userEvent.setup();
    openSettings();
    const dialog = await openPreferences(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    const close = within(dialog).getByRole('button', { name: 'Close preferences' });
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Done' })).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings', exact: true })).toHaveFocus();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('applies and persists supported preferences while unsupported themes stay unavailable', async () => {
    const user = userEvent.setup();
    const view = openSettings();
    await openPreferences(user);
    await user.click(screen.getByRole('button', { name: 'EU Megaserver' }));
    await user.click(screen.getByRole('button', { name: 'PlayStation' }));
    await user.click(screen.getByRole('button', { name: 'Display & Theme' }));
    expect(screen.getByRole('button', { name: 'Light Mode (Daylight)' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Compact Row List' }));
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Refresh & Sync' }));
    await user.click(screen.getByRole('button', { name: '15 Sec' }));
    await user.click(screen.getByRole('button', { name: 'Deals & Results' }));
    await user.click(screen.getByRole('button', { name: '1.25x (20% Off Deal)' }));
    await user.click(screen.getByRole('button', { name: '50 Items / Page' }));
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(localStorage.getItem('eso-platform')).toBe('PlayStation');
    expect(localStorage.getItem('eso-server-location')).toBe('EU');
    expect(localStorage.getItem('eso-trade-theme')).toBe('dark');
    view.unmount();
    openSettings();
    await openPreferences(user);
    expect(screen.getByRole('button', { name: 'EU Megaserver' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'PlayStation' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Display & Theme' }));
    expect(screen.getByRole('button', { name: 'Dark Mode (Tamriel Night)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Light Mode (Daylight)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Compact Row List' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Refresh & Sync' }));
    expect(screen.getByRole('button', { name: '15 Sec' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Deals & Results' }));
    expect(screen.getByRole('button', { name: '1.25x (20% Off Deal)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '50 Items / Page' })).toHaveAttribute('aria-pressed', 'true');
  });

  it.each(['online', 'offline'])('never infers a local watcher from an %s API', async (status) => {
    const user = userEvent.setup();
    openSettings({ status, latestScan: '3 October' });
    await openPreferences(user);
    await user.click(screen.getByRole('button', { name: 'Refresh & Sync' }));
    expect(screen.getByText('Market API: ' + (status === 'online' ? 'Connected' : 'Unavailable'))).toBeVisible();
    expect(screen.getByText('Latest server scan: 3 October')).toBeVisible();
    expect(screen.getByText('Unknown')).toBeVisible();
    expect(screen.queryByText(/Ready|Monitored Path/)).not.toBeInTheDocument();
  });

  it('exposes no developer account shortcut in production', async () => {
    vi.stubEnv('PROD', true);
    const user = userEvent.setup();
    openSettings();
    await user.click(screen.getByRole('button', { name: 'Settings', exact: true }));
    expect(screen.queryByText('Developer accounts')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Marketplace preferences' }));
    await user.click(screen.getByRole('button', { name: 'Deals & Results' }));
    expect(screen.queryByText(/Developer/)).not.toBeInTheDocument();
  });
});

describe('preference validation', () => {
  it.each(['light', 'system', 'invalid'])('falls back to the supported dark palette for a stored %s theme', (theme) => {
    localStorage.setItem('eso-trade-theme', theme);
    // Each render exercises initialization rather than only checking a CSS class.
    openSettings();
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).not.toHaveClass('light', 'system');
    expect(localStorage.getItem('eso-trade-theme')).toBe('dark');
  });

  it('rejects corrupt stored values and unsafe updates, keeping existing marketplace defaults', async () => {
    for (const key of ['auto-refresh', 'min-deal-score', 'items-per-page', 'layout-mode']) {
      localStorage.setItem('eso-setting-' + key, '-1');
    }
    const user = userEvent.setup();
    render(<SettingsProvider><PreferencesProbe /></SettingsProvider>);
    expect(screen.getByLabelText('Preferences')).toHaveTextContent('off/1.2/20/grid');
    await user.click(screen.getByRole('button', { name: 'Invalid refresh' }));
    expect(screen.getByLabelText('Preferences')).toHaveTextContent('off/1.2/20/grid');
  });

  it('works in memory when browser storage cannot be read or written', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('disabled'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('disabled'); });
    const user = userEvent.setup();
    render(<SettingsProvider><PreferencesProbe /></SettingsProvider>);
    await user.click(screen.getByRole('button', { name: 'Set page size' }));
    expect(screen.getByLabelText('Preferences')).toHaveTextContent('off/1.2/50/grid');
  });
});
