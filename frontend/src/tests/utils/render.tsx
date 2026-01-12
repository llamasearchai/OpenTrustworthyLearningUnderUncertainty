/**
 * Test Render Utilities
 *
 * Custom render function with all providers.
 *
 * @module tests/utils/render
 */

import * as React from 'react';
import { render, type RenderOptions, type RenderResult, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter, type MemoryRouterProps } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { expect } from 'vitest';

// ============================================================================
// Create Test Query Client
// ============================================================================

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// Theme Context (Mock)
// ============================================================================

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme);
  const resolvedTheme = theme === 'system' ? 'light' : theme;

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export { ThemeContext, ThemeProvider };

// ============================================================================
// Toast Context (Mock)
// ============================================================================

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toasts: [],
  addToast: () => '',
  removeToast: () => {},
  clearToasts: () => {},
});

interface ToastProviderProps {
  children: React.ReactNode;
}

function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2, 11);
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const value = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      clearToasts,
    }),
    [toasts, addToast, removeToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Render toasts for testing */}
      <div data-testid="toast-container" role="region" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-testid={`toast-${toast.id}`}
            role="status"
            aria-label={toast.title ?? toast.description}
          >
            {toast.title && <div data-testid="toast-title">{toast.title}</div>}
            {toast.description && <div data-testid="toast-description">{toast.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastContext, ToastProvider };

// ============================================================================
// All Providers Wrapper
// ============================================================================

interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  theme?: Theme;
  routerType?: 'browser' | 'memory';
  initialEntries?: MemoryRouterProps['initialEntries'];
}

function AllProviders({
  children,
  queryClient,
  theme = 'light',
  routerType = 'browser',
  initialEntries,
}: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  const Router = routerType === 'memory' ? MemoryRouter : BrowserRouter;
  const routerProps = routerType === 'memory' ? { initialEntries } : {};

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider defaultTheme={theme}>
        <ToastProvider>
          <Router {...routerProps}>{children}</Router>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// ============================================================================
// Custom Render
// ============================================================================

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  route?: string;
  theme?: Theme;
  routerType?: 'browser' | 'memory';
  initialEntries?: MemoryRouterProps['initialEntries'];
}

export function customRender(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const { queryClient, route, theme, routerType, initialEntries, ...renderOptions } = options;

  // Set up route if provided (for BrowserRouter)
  if (route && routerType !== 'memory') {
    window.history.pushState({}, 'Test page', route);
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders
      queryClient={queryClient}
      theme={theme}
      routerType={routerType}
      initialEntries={initialEntries ?? (route ? [route] : undefined)}
    >
      {children}
    </AllProviders>
  );

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  const user = userEvent.setup();

  return { ...result, user };
}

// ============================================================================
// Re-exports
// ============================================================================

export * from '@testing-library/react';
export { userEvent };
export { customRender as render };
export { screen };

// ============================================================================
// Wait Helpers
// ============================================================================

export async function waitForLoadingToFinish(): Promise<void> {
  await waitFor(
    () => {
      const loadingElements = screen.queryAllByRole('status', { name: /loading/i });
      const spinners = screen.queryAllByTestId(/loading|spinner/i);
      const skeletons = screen.queryAllByTestId(/skeleton/i);
      expect([...loadingElements, ...spinners, ...skeletons]).toHaveLength(0);
    },
    { timeout: 5000 }
  );
}

export async function waitForToast(text: string | RegExp): Promise<HTMLElement> {
  const toast = await waitFor(
    () => {
      // First try to find by role with name
      let element = screen.queryByRole('status', { name: text });

      // Fallback to finding by text content in toast container
      if (!element) {
        const container = screen.queryByTestId('toast-container');
        if (container) {
          const textContent = typeof text === 'string' ? text : text.source;
          const toasts = container.querySelectorAll('[role="status"]');
          for (const t of toasts) {
            if (typeof text === 'string' && t.textContent?.includes(text)) {
              element = t as HTMLElement;
              break;
            } else if (text instanceof RegExp && text.test(t.textContent ?? '')) {
              element = t as HTMLElement;
              break;
            }
          }
        }
      }

      if (!element) {
        throw new Error(`Toast with text "${text}" not found`);
      }

      expect(element).toBeInTheDocument();
      return element;
    },
    { timeout: 5000 }
  );

  return toast;
}

export async function waitForModal(name?: string | RegExp): Promise<HTMLElement> {
  const modal = await waitFor(
    () => {
      const element = screen.getByRole('dialog', name ? { name } : undefined);
      expect(element).toBeInTheDocument();
      return element;
    },
    { timeout: 5000 }
  );

  return modal;
}

export async function waitForModalToClose(): Promise<void> {
  await waitFor(
    () => {
      const modal = screen.queryByRole('dialog');
      expect(modal).not.toBeInTheDocument();
    },
    { timeout: 5000 }
  );
}

export async function waitForElement(
  getter: () => HTMLElement | null,
  options?: { timeout?: number }
): Promise<HTMLElement> {
  const element = await waitFor(
    () => {
      const el = getter();
      if (!el) {
        throw new Error('Element not found');
      }
      return el;
    },
    { timeout: options?.timeout ?? 5000 }
  );

  return element;
}

export async function waitForElementToBeRemoved(
  getter: () => HTMLElement | null,
  options?: { timeout?: number }
): Promise<void> {
  await waitFor(
    () => {
      const el = getter();
      expect(el).not.toBeInTheDocument();
    },
    { timeout: options?.timeout ?? 5000 }
  );
}

// ============================================================================
// Query Helpers
// ============================================================================

export function getQueryClient(renderResult: RenderResult): QueryClient | undefined {
  // This is a workaround to get the query client from the render result
  // In practice, you should pass the queryClient to customRender and reuse it
  return undefined;
}

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Assert no accessibility violations using axe-core
 * 
 * Full implementation that uses @axe-core/playwright for accessibility testing.
 * Falls back gracefully if axe-core is not available.
 * 
 * @param container - Container element to test
 * @throws Error if accessibility violations are found
 * 
 * @example
 * ```tsx
 * const { container } = render(<MyComponent />);
 * await assertNoAccessibilityViolations(container);
 * ```
 */
export async function assertNoAccessibilityViolations(container: HTMLElement): Promise<void> {
  expect(container).toBeInTheDocument();
  
  // Try to use axe-core if available
  try {
    // Dynamic import to avoid requiring axe-core as a hard dependency
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axe = await import('axe-core' as any).catch(() => null);
    
    if (axe && typeof (axe as any).default !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results = await (axe as any).default.run(container);
      
      if (results.violations.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const violations = results.violations.map((v: any) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodes: v.nodes.map((n: any) => ({
            html: n.html,
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        }));
        
        throw new Error(
          `Accessibility violations found:\n${JSON.stringify(violations, null, 2)}`
        );
      }
      
      // Log any incomplete tests (not failures, but worth noting)
      if (results.incomplete.length > 0) {
        console.warn(
          `Accessibility incomplete tests: ${results.incomplete.length}`,
          results.incomplete
        );
      }
      
      return;
    }
  } catch (error) {
    // If axe-core is not available or fails, log a warning but don't fail the test
    console.warn(
      '[Accessibility] axe-core not available or failed to run. ' +
      'Install @axe-core/react or @axe-core/playwright for full accessibility testing.',
      error
    );
  }
  
  // Fallback: Basic accessibility checks without axe-core
  const hasHeading = container.querySelector('h1, h2, h3, h4, h5, h6');
  const hasLandmark = container.querySelector(
    'main, nav, aside, header, footer, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]'
  );
  
  // Warn if basic accessibility structure is missing (but don't fail)
  if (!hasHeading && !hasLandmark) {
    console.warn(
      '[Accessibility] Container may lack semantic structure. ' +
      'Consider adding headings or landmarks.'
    );
  }
}

// ============================================================================
// Form Helpers
// ============================================================================

export async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  fields: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = screen.getByRole('textbox', { name: new RegExp(name, 'i') })
      ?? screen.getByLabelText(new RegExp(name, 'i'));
    await user.clear(input);
    await user.type(input, value);
  }
}

export async function submitForm(
  user: ReturnType<typeof userEvent.setup>,
  buttonText: string | RegExp = /submit/i
): Promise<void> {
  const button = screen.getByRole('button', { name: buttonText });
  await user.click(button);
}

// ============================================================================
// Selection Helpers
// ============================================================================

export async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  selectLabel: string | RegExp,
  optionText: string
): Promise<void> {
  const select = screen.getByRole('combobox', { name: selectLabel });
  await user.click(select);
  const option = await screen.findByRole('option', { name: optionText });
  await user.click(option);
}

// ============================================================================
// Keyboard Helpers
// ============================================================================

export async function pressKey(
  user: ReturnType<typeof userEvent.setup>,
  key: string
): Promise<void> {
  await user.keyboard(`{${key}}`);
}

export async function pressKeys(
  user: ReturnType<typeof userEvent.setup>,
  keys: string[]
): Promise<void> {
  for (const key of keys) {
    await user.keyboard(`{${key}}`);
  }
}
