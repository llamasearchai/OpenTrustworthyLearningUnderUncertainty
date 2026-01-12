/**
 * UI State Store
 *
 * Manages global UI state including sidebar, modals, theme, and notifications.
 *
 * @module stores/ui-store
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// Types
// ============================================================================

export type Theme = 'light' | 'dark' | 'system';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  title?: string;
  timestamp: number;
  duration?: number;
  dismissible?: boolean;
}

export interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  mobileSidebarOpen: boolean;

  // Modals
  activeModal: string | null;
  modalData: Record<string, unknown>;

  // Theme
  theme: Theme;
  resolvedTheme: 'light' | 'dark';

  // Notifications
  notificationQueue: Notification[];

  // Command palette
  commandPaletteOpen: boolean;

  // Loading states
  globalLoading: boolean;
  loadingMessage: string | null;
}

export interface UIActions {
  // Sidebar
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

  // Modals
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setModalData: (data: Record<string, unknown>) => void;

  // Theme
  setTheme: (theme: Theme) => void;

  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Command palette
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export type UIStore = UIState & UIActions;

// ============================================================================
// Helpers
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function getSystemTheme(): 'light' | 'dark' {
  /* c8 ignore next 1 */
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

// ============================================================================
// Store
// ============================================================================

export const useUIStore = create<UIStore>()(
  persist(
    immer((set, get) => ({
      // Initial state
      sidebarCollapsed: false,
      sidebarWidth: 280,
      mobileSidebarOpen: false,
      activeModal: null,
      modalData: {},
      theme: 'system',
      resolvedTheme: resolveTheme('system'),
      notificationQueue: [],
      commandPaletteOpen: false,
      globalLoading: false,
      loadingMessage: null,

      // Sidebar actions
      toggleSidebar: () =>
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

      setSidebarWidth: (width) =>
        set((state) => {
          state.sidebarWidth = Math.max(200, Math.min(400, width));
        }),

      setMobileSidebarOpen: (open) =>
        set((state) => {
          state.mobileSidebarOpen = open;
        }),

      toggleMobileSidebar: () =>
        set((state) => {
          state.mobileSidebarOpen = !state.mobileSidebarOpen;
        }),

      // Modal actions
      openModal: (modalId, data = {}) =>
        set((state) => {
          state.activeModal = modalId;
          state.modalData = data;
        }),

      closeModal: () =>
        set((state) => {
          state.activeModal = null;
          state.modalData = {};
        }),

      setModalData: (data) =>
        set((state) => {
          state.modalData = { ...state.modalData, ...data };
        }),

      // Theme actions
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
          state.resolvedTheme = resolveTheme(theme);
          // Apply to document
          if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(state.resolvedTheme);
          }
        }),

      // Notification actions
      addNotification: (notification) => {
        const id = generateId();
        set((state) => {
          state.notificationQueue.push({
            ...notification,
            id,
            timestamp: Date.now(),
            dismissible: notification.dismissible ?? true,
          });
        });

        // Auto-remove after duration
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }

        return id;
      },

      removeNotification: (id) =>
        set((state) => {
          state.notificationQueue = state.notificationQueue.filter((n: any) => n.id !== id);
        }),

      clearNotifications: () =>
        set((state) => {
          state.notificationQueue = [];
        }),

      // Command palette actions
      toggleCommandPalette: () =>
        set((state) => {
          state.commandPaletteOpen = !state.commandPaletteOpen;
        }),

      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.commandPaletteOpen = open;
        }),

      // Loading actions
      setGlobalLoading: (loading, message) =>
        set((state) => {
          state.globalLoading = loading;
          state.loadingMessage = loading ? (message ?? null) : null;
        }),
    })),
    {
      name: 'opentlu-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarWidth: state.sidebarWidth,
        theme: state.theme,
      }),
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectSidebarCollapsed = (state: UIStore) => state.sidebarCollapsed;
export const selectTheme = (state: UIStore) => state.theme;
export const selectResolvedTheme = (state: UIStore) => state.resolvedTheme;
export const selectNotifications = (state: UIStore) => state.notificationQueue;
export const selectActiveModal = (state: UIStore) => state.activeModal;
export const selectIsModalOpen = (modalId: string) => (state: UIStore) =>
  state.activeModal === modalId;

// ============================================================================
// Theme Listener
// ============================================================================

/* c8 ignore start */
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const state = useUIStore.getState();
    if (state.theme === 'system') {
      state.setTheme('system');
    }
  });
}
/* c8 ignore stop */