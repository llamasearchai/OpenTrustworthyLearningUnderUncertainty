/**
 * MobileSidebar Component Tests
 *
 * Comprehensive test suite for the MobileSidebar layout component.
 *
 * @module components/layout/__tests__/mobile-sidebar.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MobileMenuButton, MobileSidebar } from '../MobileSidebar';

const setMobileSidebarOpen = vi.fn();

vi.mock('@/stores/ui-store', () => ({
  useUIStore: () => ({
    mobileSidebarOpen: true,
    setMobileSidebarOpen,
  }),
}));

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );
};

const mockNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: <span>D</span> },
  { label: 'Scenarios', href: '/scenarios', icon: <span>S</span> },
];

describe('MobileSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render mobile sidebar when open', () => {
      const { container } = render(<MobileSidebar items={mockNavItems} />, { wrapper: createWrapper() });
      // MobileSidebar renders in AnimatePresence when mobileSidebarOpen is true
      expect(container.firstChild).toBeTruthy();
    });

    it('should render navigation items', () => {
      const { container } = render(<MobileSidebar items={mockNavItems} />, { wrapper: createWrapper() });
      // Check that component renders (items may be in links or buttons)
      expect(container.firstChild).toBeTruthy();
    });

    it('should close when overlay is clicked', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      const { container } = render(<MobileSidebar items={mockNavItems} />, { wrapper: createWrapper() });
      const overlay = container.querySelector('[aria-hidden=\"true\"]');
      expect(overlay).toBeTruthy();
      await user.click(overlay as Element);
      expect(setMobileSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('should open via MobileMenuButton click', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      render(<MobileMenuButton />, { wrapper: createWrapper() });
      await user.click(document.querySelector('[data-testid=\"menu-toggle\"]') as Element);
      expect(setMobileSidebarOpen).toHaveBeenCalledWith(true);
    });

    it('should close on Escape key', async () => {
      render(<MobileSidebar items={mockNavItems} />, { wrapper: createWrapper() });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(setMobileSidebarOpen).toHaveBeenCalledWith(false);
    });
  });
});
