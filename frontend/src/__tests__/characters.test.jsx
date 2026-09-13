import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnatomicalEquipmentDiagram } from '../components/character/AnatomicalEquipmentDiagram';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { getMarketplaceUrlForTrait } from '../pages/TraitTracker';

describe('character presentation parity', () => {
  it('keeps every empty equipment slot and both bars available to keyboard users', () => {
    const { rerender } = render(<AnatomicalEquipmentDiagram />);
    expect(screen.getAllByRole('button', { name: /^Inspect / })).toHaveLength(14);
    expect(screen.getByRole('button', { name: 'Inspect Front Bar Main: Empty slot, active bar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Inspect Back Bar Main: Empty slot' })).toBeVisible();
    expect(screen.getAllByText('Empty Slot')).toHaveLength(14);
    rerender(<AnatomicalEquipmentDiagram activeBar="back" />);
    expect(screen.getAllByRole('button', { name: /^Inspect / })).toHaveLength(14);
    expect(screen.getByRole('button', { name: 'Inspect Front Bar Main: Empty slot' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Inspect Back Bar Main: Empty slot, active bar' })).toBeVisible();
  });

  it('exposes original item details on focus and tap, retaining cached icon delivery and fallback', async () => {
    // Existing saved profile, recorded in docs/design/issue-132/fixtures.js and icon-manifest.json.
    const gear = { 0: { item_name: "Bright-Throat's Boast Hat", item_icon: 'gear_elderarg_light_head_a.png', quality: 3, trait_name: 'Training', set_name: "Bright-Throat's Boast" } };
    render(<AnatomicalEquipmentDiagram gearBySlot={gear} />);
    const slot = screen.getByRole('button', { name: "Inspect Head: Bright-Throat's Boast Hat" });
    const icon = within(slot).getByRole('img');
    expect(new URL(icon.getAttribute('src'), 'http://localhost').pathname).toBe('/api/icons/gear_elderarg_light_head_a.png');
    await userEvent.tab();
    expect(slot).toHaveFocus();
    const inspector = document.getElementById(slot.getAttribute('aria-controls'));
    expect(within(inspector).getByText("Set: Bright-Throat's Boast")).toBeVisible();
    await userEvent.click(slot);
    fireEvent.mouseLeave(slot);
    fireEvent.blur(slot);
    expect(within(inspector).getByText("Bright-Throat's Boast Hat")).toBeVisible();
    fireEvent.error(icon);
    expect(within(slot).queryByRole('img')).not.toBeInTheDocument();
    expect(slot).toHaveTextContent("Bright-Throat's Boast Hat");
  });

  it('preserves structured market destinations without changing category/trait contracts', () => {
    const weapon = new URL(getMarketplaceUrlForTrait('Blacksmithing', 'Axe', 'Precise'), 'https://example.test');
    expect(Object.fromEntries(weapon.searchParams)).toEqual({ view: 'listings', trait: 'Precise', category: 'Weapons', subcategory: 'One-Handed Axe' });
    const armor = new URL(getMarketplaceUrlForTrait('Clothier', 'Robe', 'Divines'), 'https://example.test');
    expect(armor.searchParams.get('subcategory')).toBe('Light Armor');
    const jewelry = new URL(getMarketplaceUrlForTrait('Jewelry', 'Ring', 'Bloodthirsty'), 'https://example.test');
    expect(jewelry.searchParams.get('category')).toBe('Jewelry');
    expect(jewelry.searchParams.get('subcategory')).toBe('Ring');
  });

  it.each([
    ['Blacksmithing', 'Mace', 'Weapons', 'One-Handed Mace'],
    ['Blacksmithing', 'Sword', 'Weapons', 'One-Handed Sword'],
    ['Blacksmithing', 'Dagger', 'Weapons', 'Dagger'],
    ['Blacksmithing', 'Battle Axe', 'Weapons', 'Two-Handed Axe'],
    ['Blacksmithing', 'Maul', 'Weapons', 'Two-Handed Mace'],
    ['Blacksmithing', 'Greatsword', 'Weapons', 'Two-Handed Sword'],
    ['Blacksmithing', 'Helm', 'Apparel', 'Heavy Armor'],
    ['Clothier', 'Hat', 'Apparel', 'Light Armor'],
    ['Clothier', 'Jack', 'Apparel', 'Medium Armor'],
    ['Woodworking', 'Bow', 'Weapons', 'Bow'],
    ['Woodworking', 'Inferno Staff', 'Weapons', 'Destruction Staff'],
    ['Woodworking', 'Restoration Staff', 'Weapons', 'Restoration Staff'],
    ['Woodworking', 'Shield', 'Apparel', 'Shield'],
    ['Jewelry', 'Necklace', 'Jewelry', 'Necklace'],
  ])('preserves %s / %s structured search navigation', (discipline, equipment, category, subcategory) => {
    const url = new URL(getMarketplaceUrlForTrait(discipline, equipment, 'Infused'), 'https://example.test');
    expect(url.pathname).toBe('/marketplace');
    expect(Object.fromEntries(url.searchParams)).toEqual({ view: 'listings', trait: 'Infused', category, subcategory });
  });
});

describe('dialog keyboard presentation', () => {
  function Example() {
    const [open, setOpen] = useState(false);
    const panel = useDialogFocus(open, () => setOpen(false));
    return <><button onClick={() => setOpen(true)}>Open profile</button>{open && <div ref={panel} tabIndex={-1} role="dialog" aria-label="Equipment"><button>First</button><div style={{ display: 'none' }}><button>Hidden</button></div><button>Last</button></div>}</>;
  }

  it('does nothing while closed, traps focus, closes with Escape, and restores the opener', async () => {
    const user = userEvent.setup();
    document.body.style.overflow = 'auto';
    render(<Example />);
    expect(document.body.style.overflow).toBe('auto');
    const opener = screen.getByRole('button', { name: 'Open profile' });
    await user.click(opener);
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('releases scroll lock when an open dialog is unmounted', async () => {
    document.body.style.overflow = '';
    const { unmount } = render(<Example />);
    await userEvent.click(screen.getByRole('button', { name: 'Open profile' }));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('dismisses only the top nested dialog and keeps the outer dialog focus and scroll lock', async () => {
    function NestedDialogs() {
      const [open, setOpen] = useState(false);
      const [childOpen, setChildOpen] = useState(false);
      const parentPanel = useDialogFocus(open, () => setOpen(false));
      const childPanel = useDialogFocus(open && childOpen, () => setChildOpen(false));
      return <>
        <button onClick={() => setOpen(true)}>Open outer dialog</button>
        {open && <div role="dialog" aria-label="Outer dialog" ref={parentPanel} tabIndex={-1}>
          <button onClick={() => setChildOpen(true)}>Open inner dialog</button>
          {childOpen && <div role="dialog" aria-label="Inner dialog" ref={childPanel} tabIndex={-1}>
            <button>Inner first</button><button>Inner last</button>
          </div>}
        </div>}
      </>;
    }
    const user = userEvent.setup();
    document.body.style.overflow = 'auto';
    render(<NestedDialogs />);
    const opener = screen.getByRole('button', { name: 'Open outer dialog' });
    await user.click(opener);
    const innerOpener = screen.getByRole('button', { name: 'Open inner dialog' });
    await user.click(innerOpener);
    expect(screen.getByRole('button', { name: 'Inner first' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Inner last' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Inner dialog' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Outer dialog' })).toBeVisible();
    expect(innerOpener).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
  });
});
