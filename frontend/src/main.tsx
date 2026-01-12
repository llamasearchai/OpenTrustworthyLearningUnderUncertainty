/**
 * Application Entry Point
 *
 * Initializes React with all required providers and renders the App component.
 *
 * @module main
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import App from './App';
import './index.css';

// ============================================================================
// Query Client Configuration
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes for static data
      gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// ============================================================================
// Root Render
// ============================================================================

async function enableMocking() {
  if (!import.meta.env.DEV) {
    return;
  }
  try {
    const { worker } = await import('./tests/mocks/browser');
    const result = await worker.start({
      onUnhandledRequest: 'bypass',
    });
    return result;
  } catch (error) {
    throw error;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

enableMocking()
  .catch((err) => {
    console.error('Failed to enable mock service worker:', err);
  })
  .then(() => {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </React.StrictMode>
    );
  });
