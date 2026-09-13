import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

const auth = vi.hoisted(() => ({
  user: null,
  login: vi.fn(),
  register: vi.fn(),
  devBypass: vi.fn(),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/ui/navbar', () => ({ default: () => null }));

function renderLogin(state) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/login', state }]}><Login /></MemoryRouter>);
}

describe('account form presentation parity', () => {
  beforeEach(() => {
    auth.user = null;
    auth.login.mockResolvedValue({ success: false, error: 'Test sign-in response' });
    auth.register.mockResolvedValue({ success: false, error: 'Test registration response' });
  });

  it('associates sign-in labels and preserves password visibility without submitting', async () => {
    const user = userEvent.setup();
    renderLogin();
    const identity = screen.getByLabelText('Username or Email');
    const password = screen.getByLabelText('Password', { exact: true });
    expect(identity).toHaveFocus();
    expect(identity).toHaveAttribute('autocomplete', 'username');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    await user.type(password, 'test-password');
    await user.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('test-password');
    await user.click(screen.getByRole('button', { name: 'Hide password', exact: true }));
    expect(password).toHaveAttribute('type', 'password');
    expect(auth.login).not.toHaveBeenCalled();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('labels every registration input and keeps the two password controls independent', async () => {
    const user = userEvent.setup();
    renderLogin({ defaultTab: 'register' });
    expect(screen.getByLabelText('Username', { exact: true })).toHaveFocus();
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('In-Game ESO Handle (Optional)')).not.toBeRequired();
    const password = screen.getByLabelText('Password', { exact: true });
    const confirmation = screen.getByLabelText('Confirm', { exact: true });
    await user.type(password, 'test-password');
    await user.type(confirmation, 'test-confirmation');
    await user.click(screen.getByRole('button', { name: 'Show confirm password' }));
    expect(confirmation).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveValue('test-confirmation');
    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password', exact: true }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide confirm password' }));
    expect(confirmation).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Sign In', exact: true }));
    expect(screen.getByLabelText('Username or Email')).toHaveFocus();
    expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('test-password');
    expect(auth.login).not.toHaveBeenCalled();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('keeps sign-in payload normalization and displays the existing response error', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText('Username or Email'), '  sample-user  ');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('sample-user', 'test-password'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Test sign-in response');
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('retains registration validation and the normalized optional ESO handle payload', async () => {
    const user = userEvent.setup();
    renderLogin({ tab: 'register' });
    await user.type(screen.getByLabelText('Username', { exact: true }), 'sample-user');
    await user.type(screen.getByLabelText('Email Address'), 'user@example.test');
    await user.type(screen.getByLabelText('In-Game ESO Handle (Optional)'), 'sample-account');
    await user.type(screen.getByLabelText('Password', { exact: true }), 'test-password');
    await user.type(screen.getByLabelText('Confirm', { exact: true }), 'mismatched-password');
    await user.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(auth.register).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('Confirm', { exact: true }));
    await user.type(screen.getByLabelText('Confirm', { exact: true }), 'test-password');
    await user.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    await waitFor(() => expect(auth.register).toHaveBeenCalledWith('sample-user', 'user@example.test', 'test-password', '@sample-account'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Test registration response');
    expect(auth.login).not.toHaveBeenCalled();
  });
});
