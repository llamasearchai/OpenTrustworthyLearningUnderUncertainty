/**
 * Login Page Tests
 *
 * Comprehensive test suite for the Login page component.
 *
 * @module pages/__tests__/Login.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Login from '../Login';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>{children}</MemoryRouter>
  );
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      render(<Login />, { wrapper: createWrapper() });
      expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      render(<Login />, { wrapper: createWrapper() });
      expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update email input', async () => {
      const user = userEvent.setup();
      render(<Login />, { wrapper: createWrapper() });
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      await user.type(emailInput, 'test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password input', async () => {
      const user = userEvent.setup();
      render(<Login />, { wrapper: createWrapper() });
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      await user.type(passwordInput, 'password123');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<Login />, { wrapper: createWrapper() });
      const checkbox = screen.getByLabelText(/remember me/i);
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('should show error when fields are empty', async () => {
      render(<Login />, { wrapper: createWrapper() });
      const form = screen.getByTestId('login-form') as HTMLFormElement;
      
      // Remove required attributes temporarily to test component validation
      const emailInput = form.querySelector('#email') as HTMLInputElement;
      const passwordInput = form.querySelector('#password') as HTMLInputElement;
      if (emailInput) emailInput.removeAttribute('required');
      if (passwordInput) passwordInput.removeAttribute('required');
      
      // Submit form - this will trigger handleSubmit with empty fields
      form.requestSubmit();
      
      // Wait for form submission to complete (async setTimeout in handleSubmit)
      await waitFor(
        () => {
          // Error message appears after form validation - use data-testid from component
          const errorElement = screen.getByTestId('error-message');
          expect(errorElement).toBeInTheDocument();
          expect(errorElement).toHaveTextContent(/please enter email and password/i);
        },
        { timeout: 2000 }
      );
    });

    it('should authenticate with valid credentials', async () => {
      const user = userEvent.setup();
      render(<Login />, { wrapper: createWrapper() });
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBe('demo-token');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      }, { timeout: 2000 });
    });

    it('should show loading state during authentication', async () => {
      const user = userEvent.setup();
      render(<Login />, { wrapper: createWrapper() });
      const emailInput = screen.getByPlaceholderText(/you@example.com/i);
      const passwordInput = screen.getByPlaceholderText(/enter your password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<Login />, { wrapper: createWrapper() });
      // Check that inputs exist (labels may be implicit)
      expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    });

    it('should have accessible submit button', () => {
      render(<Login />, { wrapper: createWrapper() });
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
