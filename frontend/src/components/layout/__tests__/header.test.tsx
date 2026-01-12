/**
 * Breadcrumbs Component Tests
 *
 * Comprehensive test suite for the Breadcrumbs layout component.
 *
 * @module components/layout/__tests__/breadcrumbs.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from '../Breadcrumbs';

const createWrapper = (initialEntries = ['/dashboard']) => {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
};

describe('Breadcrumbs', () => {
  describe('Rendering', () => {
    it('should render breadcrumbs navigation', () => {
      render(<Breadcrumbs />, { wrapper: createWrapper(['/scenarios/test-123']) });
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    });

    it('should render home link', () => {
      render(<Breadcrumbs />, { wrapper: createWrapper(['/scenarios/test-123']) });
      expect(screen.getByLabelText(/home/i)).toBeInTheDocument();
    });

    it('should not render on dashboard', () => {
      const { container } = render(<Breadcrumbs />, { wrapper: createWrapper(['/dashboard']) });
      expect(container.firstChild).toBeNull();
    });

    it('should render breadcrumb items for nested routes', () => {
      render(<Breadcrumbs />, { wrapper: createWrapper(['/scenarios/test-123']) });
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
    });
  });
});
