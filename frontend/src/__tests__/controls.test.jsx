import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EsoSelect } from '../components/ui/eso-select';
import { Button } from '../components/ui/button';

describe('shared control behavior', () => {
  it('retains category selection and keyboard cancellation', async () => {
    const user = userEvent.setup();
    function Categories() {
      const [value, setValue] = useState('');
      return <EsoSelect value={value} onChange={setValue} aria-label="Category"
        options={[{ value: '', label: 'All categories' }, { value: 'Materials', label: 'Materials' }, { value: 'Weapons', label: 'Weapons' }]} />;
    }
    render(<Categories />);
    const control = screen.getByRole('combobox', { name: 'Category' });
    await user.click(control);
    await user.click(screen.getByRole('option', { name: 'Materials' }));
    expect(control).toHaveTextContent('Materials');
    control.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(control).toHaveTextContent('Weapons');
    await user.keyboard('{ArrowDown}{Escape}');
    expect(control).toHaveTextContent('Weapons');
    expect(control).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not dispatch a disabled action', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save search</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Save search' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
