/**
 * Profile Page Tests
 *
 * @module pages/__tests__/Profile.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Profile from '../Profile';

const mockLogout = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      name: 'Test User',
      email: 'test@example.com',
      role: 'researcher',
    },
    logout: mockLogout,
  }),
}));

const toastSuccess = vi.fn();
const toastInfo = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => toastSuccess(...args),
    info: (...args: any[]) => toastInfo(...args),
  },
}));

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render profile header and user info', () => {
    render(<Profile />);
    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/researcher/i).length).toBeGreaterThan(0);
  });

  it('should enter edit mode and save', async () => {
    const user = userEvent.setup();
    render(<Profile />);

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    await user.click(editButton);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(toastSuccess).toHaveBeenCalled();
  });
});

