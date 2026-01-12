/**
 * UI Store Tests
 *
 * Test suite for the UI store.
 *
 * @module stores/__tests__/ui-store.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  selectActiveModal,
  selectNotifications,
  selectResolvedTheme,
  selectSidebarCollapsed,
  selectTheme,
  selectIsModalOpen,
  useUIStore,
} from '../ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.getState().closeModal();
    useUIStore.getState().clearNotifications();
    useUIStore.getState().setCommandPaletteOpen(false);
    useUIStore.getState().setGlobalLoading(false);
  });

  describe('Sidebar', () => {
    it('should toggle sidebar', () => {
      const store = useUIStore.getState();
      const initial = store.sidebarCollapsed;
      store.toggleSidebar();
      expect(useUIStore.getState().sidebarCollapsed).toBe(!initial);
    });

    it('should set sidebar collapsed', () => {
      const store = useUIStore.getState();
      store.setSidebarCollapsed(true);
      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it('should set sidebar width', () => {
      const store = useUIStore.getState();
      store.setSidebarWidth(300);
      expect(useUIStore.getState().sidebarWidth).toBe(300);
    });

    it('should set mobile sidebar open', () => {
      const store = useUIStore.getState();
      store.setMobileSidebarOpen(true);
      expect(useUIStore.getState().mobileSidebarOpen).toBe(true);
    });

    it('should toggle mobile sidebar', () => {
      const store = useUIStore.getState();
      const initial = store.mobileSidebarOpen;
      store.toggleMobileSidebar();
      expect(useUIStore.getState().mobileSidebarOpen).toBe(!initial);
    });

    it('should compute basic selectors', () => {
      const state = useUIStore.getState();
      expect(selectSidebarCollapsed(state)).toBe(state.sidebarCollapsed);
      expect(selectTheme(state)).toBe(state.theme);
      expect(selectResolvedTheme(state)).toBe(state.resolvedTheme);
    });
  });

  describe('Modals', () => {
    it('should open modal', () => {
      const store = useUIStore.getState();
      store.openModal('test-modal', { data: 'test' });
      const state = useUIStore.getState();
      expect(state.activeModal).toBe('test-modal');
      expect(state.modalData).toEqual({ data: 'test' });
    });

    it('should close modal', () => {
      const store = useUIStore.getState();
      store.openModal('test-modal');
      store.closeModal();
      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
    });

    it('should set modal data', () => {
      const store = useUIStore.getState();
      store.openModal('test-modal');
      store.setModalData({ newData: 'value' });
      expect(useUIStore.getState().modalData).toEqual({ newData: 'value' });
    });

    it('should compute selectIsModalOpen selector', () => {
      useUIStore.getState().openModal('abc');
      expect(selectIsModalOpen('abc')(useUIStore.getState())).toBe(true);
      expect(selectIsModalOpen('other')(useUIStore.getState())).toBe(false);
    });

    it('should compute selectActiveModal selector', () => {
      useUIStore.getState().openModal('xyz');
      expect(selectActiveModal(useUIStore.getState())).toBe('xyz');
    });
  });

  describe('Theme', () => {
    it('should set theme', () => {
      const store = useUIStore.getState();
      store.setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should resolve system theme', () => {
      const store = useUIStore.getState();
      store.setTheme('system');
      const state = useUIStore.getState();
      expect(['light', 'dark']).toContain(state.resolvedTheme);
    });

    it('should resolve dark system theme when matchMedia matches', () => {
      const original = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as any;

      useUIStore.getState().setTheme('system');
      expect(useUIStore.getState().resolvedTheme).toBe('dark');

      window.matchMedia = original;
    });
  });

  describe('Notifications', () => {
    it('should add notification', () => {
      const store = useUIStore.getState();
      const id = store.addNotification({
        type: 'info',
        message: 'Test notification',
      });
      const state = useUIStore.getState();
      expect(state.notificationQueue.length).toBe(1);
      expect(state.notificationQueue[0]?.id).toBe(id);
      expect(state.notificationQueue[0]?.message).toBe('Test notification');
    });

    it('should remove notification', () => {
      const store = useUIStore.getState();
      const id = store.addNotification({
        type: 'info',
        message: 'Test',
      });
      store.removeNotification(id);
      expect(useUIStore.getState().notificationQueue.length).toBe(0);
    });

    it('should clear all notifications', () => {
      const store = useUIStore.getState();
      store.addNotification({ type: 'info', message: 'Test 1' });
      store.addNotification({ type: 'success', message: 'Test 2' });
      store.clearNotifications();
      expect(useUIStore.getState().notificationQueue.length).toBe(0);
    });

    it('should auto-remove notification when duration > 0', () => {
      vi.useFakeTimers();
      const store = useUIStore.getState();
      const id = store.addNotification({
        type: 'info',
        message: 'Auto remove',
        duration: 10,
      });
      expect(useUIStore.getState().notificationQueue.some((n) => n.id === id)).toBe(true);
      vi.advanceTimersByTime(20);
      expect(useUIStore.getState().notificationQueue.some((n) => n.id === id)).toBe(false);
      vi.useRealTimers();
    });

    it('should not schedule auto-remove when duration is 0', () => {
      const store = useUIStore.getState();
      const id = store.addNotification({
        type: 'info',
        message: 'No auto remove',
        duration: 0,
      });
      expect(useUIStore.getState().notificationQueue.some((n) => n.id === id)).toBe(true);
    });

    it('should compute selectNotifications selector', () => {
      const store = useUIStore.getState();
      store.addNotification({ type: 'info', message: 'A' });
      expect(selectNotifications(useUIStore.getState()).length).toBeGreaterThan(0);
    });
  });

  describe('Command Palette', () => {
    it('should toggle command palette', () => {
      const store = useUIStore.getState();
      const initial = store.commandPaletteOpen;
      store.toggleCommandPalette();
      expect(useUIStore.getState().commandPaletteOpen).toBe(!initial);
    });

    it('should set command palette open', () => {
      const store = useUIStore.getState();
      store.setCommandPaletteOpen(true);
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    });
  });

  describe('Loading', () => {
    it('should set global loading', () => {
      const store = useUIStore.getState();
      store.setGlobalLoading(true, 'Loading...');
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe('Loading...');
    });

    it('should clear loading message when loading is false', () => {
      const store = useUIStore.getState();
      store.setGlobalLoading(true, 'Loading...');
      store.setGlobalLoading(false);
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBeNull();
    });

    it('should set loadingMessage to null when no message provided', () => {
      const store = useUIStore.getState();
      store.setGlobalLoading(true);
      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBeNull();
    });
  });
});
