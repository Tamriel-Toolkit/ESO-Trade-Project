import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../pages/Home';

vi.mock('../components/ui/navbar', () => ({ default: () => <nav aria-label="Main navigation" /> }));
vi.mock('../api/api', () => ({ default: vi.fn().mockResolvedValue({ Weapons: [], Materials: [] }) }));

it('keeps category and character destinations without promoting catalog browsing', async () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Weapons' })).toHaveAttribute('href', '/marketplace?category=Weapons');
  expect(screen.getByRole('link', { name: 'Materials' })).toHaveAttribute('href', '/marketplace?category=Materials');
  expect(screen.getByRole('link', { name: 'Browse marketplace' })).toHaveAttribute('href', '/marketplace');
  expect(screen.getByRole('link', { name: 'Your characters' })).toHaveAttribute('href', '/characters');
  const context = screen.getByRole('region', { name: 'About the marketplace' });
  expect(within(context).getByText('Seen at guild traders')).toBeVisible();
  expect(within(context).getByText('Availability may change.', { exact: false })).toBeVisible();
  expect(screen.queryByText(/catalog/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/155,476/)).not.toBeInTheDocument();
});
