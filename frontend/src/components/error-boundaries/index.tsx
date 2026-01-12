/**
 * Error Boundary Components
 *
 * React error boundaries for different levels of the application.
 *
 * @module components/error-boundaries
 */

import React, {
  Component,
  ReactNode,
  ComponentType,
  ErrorInfo,
  createContext,
  useContext,
} from 'react';
import { reportError, createErrorBoundaryHandler } from '@/lib/errors';

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export interface ErrorBoundaryContextValue {
  error: Error | null;
  resetError: () => void;
}

// ============================================================================
// Error Boundary Context
// ============================================================================

const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

export function useErrorBoundary(): ErrorBoundaryContextValue {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    return {
      error: null,
      resetError: () => {},
    };
  }
  return context;
}

// ============================================================================
// Base Error Boundary
// ============================================================================

abstract class BaseErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  abstract boundaryName: string;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const handler = createErrorBoundaryHandler(this.boundaryName);
    handler(error, errorInfo);

    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  abstract renderFallback(error: Error): ReactNode;

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      const contextValue: ErrorBoundaryContextValue = {
        error,
        resetError: this.resetError,
      };

      let fallbackContent: ReactNode;

      if (typeof fallback === 'function') {
        fallbackContent = fallback(error, this.resetError);
      } else if (fallback) {
        fallbackContent = fallback;
      } else {
        fallbackContent = this.renderFallback(error);
      }

      return React.createElement(
        ErrorBoundaryContext.Provider,
        { value: contextValue },
        fallbackContent
      );
    }

    return children;
  }
}

// ============================================================================
// Root Error Boundary
// ============================================================================

interface RootErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function DefaultRootErrorFallback({ error, resetError }: RootErrorFallbackProps) {
  return React.createElement(
    'div',
    {
      role: 'alert',
      className: 'min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900',
    },
    React.createElement(
      'div',
      {
        className: 'max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center',
      },
      React.createElement(
        'div',
        {
          className: 'w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center',
        },
        React.createElement(
          'svg',
          {
            className: 'w-8 h-8 text-red-600 dark:text-red-400',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor',
          },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
          })
        )
      ),
      React.createElement(
        'h1',
        { className: 'text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2' },
        'Something went wrong'
      ),
      React.createElement(
        'p',
        { className: 'text-gray-600 dark:text-gray-400 mb-6' },
        'We apologize for the inconvenience. The application has encountered an unexpected error.'
      ),
      process.env.NODE_ENV === 'development' &&
        React.createElement(
          'details',
          { className: 'mb-6 text-left' },
          React.createElement(
            'summary',
            { className: 'text-sm text-gray-500 cursor-pointer hover:text-gray-700' },
            'Error details'
          ),
          React.createElement(
            'pre',
            {
              className: 'mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-40',
            },
            error.stack ?? error.message
          )
        ),
      React.createElement(
        'div',
        { className: 'flex gap-3 justify-center' },
        React.createElement(
          'button',
          {
            onClick: resetError,
            className: 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors',
          },
          'Try Again'
        ),
        React.createElement(
          'button',
          {
            onClick: () => window.location.reload(),
            className: 'px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors',
          },
          'Reload Page'
        )
      )
    )
  );
}

/**
 * Root-level error boundary for the entire application
 */
export class RootErrorBoundary extends BaseErrorBoundary {
  boundaryName = 'RootErrorBoundary';

  renderFallback(error: Error): ReactNode {
    return React.createElement(DefaultRootErrorFallback, {
      error,
      resetError: this.resetError,
    });
  }
}

// ============================================================================
// Route Error Boundary
// ============================================================================

function DefaultRouteErrorFallback({ error, resetError }: RootErrorFallbackProps) {
  return React.createElement(
    'div',
    {
      role: 'alert',
      className: 'flex-1 flex items-center justify-center p-8',
    },
    React.createElement(
      'div',
      { className: 'max-w-md w-full text-center' },
      React.createElement(
        'div',
        {
          className: 'w-12 h-12 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center',
        },
        React.createElement(
          'svg',
          {
            className: 'w-6 h-6 text-amber-600 dark:text-amber-400',
            fill: 'none',
            viewBox: '0 0 24 24',
            stroke: 'currentColor',
          },
          React.createElement('path', {
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2,
            d: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          })
        )
      ),
      React.createElement(
        'h2',
        { className: 'text-lg font-medium text-gray-900 dark:text-gray-100 mb-2' },
        'Page Error'
      ),
      React.createElement(
        'p',
        { className: 'text-gray-600 dark:text-gray-400 mb-4' },
        'This page encountered an error and could not be displayed.'
      ),
      React.createElement(
        'button',
        {
          onClick: resetError,
          className: 'px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors',
        },
        'Retry'
      )
    )
  );
}

/**
 * Error boundary for route-level errors
 */
export class RouteErrorBoundary extends BaseErrorBoundary {
  boundaryName = 'RouteErrorBoundary';

  renderFallback(error: Error): ReactNode {
    return React.createElement(DefaultRouteErrorFallback, {
      error,
      resetError: this.resetError,
    });
  }
}

// ============================================================================
// Feature Error Boundary
// ============================================================================

interface FeatureErrorBoundaryProps extends ErrorBoundaryProps {
  featureName?: string;
  showRetry?: boolean;
}

function DefaultFeatureErrorFallback({
  error,
  resetError,
  featureName,
  showRetry = true,
}: RootErrorFallbackProps & { featureName?: string; showRetry?: boolean }) {
  return React.createElement(
    'div',
    {
      role: 'alert',
      className: 'p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20',
    },
    React.createElement(
      'div',
      { className: 'flex items-start gap-3' },
      React.createElement(
        'svg',
        {
          className: 'w-5 h-5 text-red-500 flex-shrink-0 mt-0.5',
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor',
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        })
      ),
      React.createElement(
        'div',
        { className: 'flex-1' },
        React.createElement(
          'h3',
          { className: 'text-sm font-medium text-red-800 dark:text-red-200' },
          featureName ? `${featureName} Error` : 'Feature Error'
        ),
        React.createElement(
          'p',
          { className: 'text-sm text-red-700 dark:text-red-300 mt-1' },
          'This feature is temporarily unavailable.'
        ),
        showRetry &&
          React.createElement(
            'button',
            {
              onClick: resetError,
              className: 'mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:underline',
            },
            'Try again'
          )
      )
    )
  );
}

/**
 * Error boundary for feature-level components
 */
export class FeatureErrorBoundary extends Component<
  FeatureErrorBoundaryProps,
  ErrorBoundaryState
> {
  boundaryName = 'FeatureErrorBoundary';

  constructor(props: FeatureErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const handler = createErrorBoundaryHandler(
      `FeatureErrorBoundary:${this.props.featureName ?? 'unknown'}`
    );
    handler(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, featureName, showRetry } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError);
      }
      if (fallback) {
        return fallback;
      }
      return React.createElement(DefaultFeatureErrorFallback, {
        error,
        resetError: this.resetError,
        featureName,
        showRetry,
      });
    }

    return children;
  }
}

// ============================================================================
// Form Error Boundary
// ============================================================================

interface FormErrorBoundaryProps extends ErrorBoundaryProps {
  formName?: string;
}

function DefaultFormErrorFallback({
  error,
  resetError,
  formName,
}: RootErrorFallbackProps & { formName?: string }) {
  return React.createElement(
    'div',
    {
      role: 'alert',
      className: 'p-4 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-900/20',
    },
    React.createElement(
      'div',
      { className: 'flex items-start gap-3' },
      React.createElement(
        'svg',
        {
          className: 'w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5',
          fill: 'none',
          viewBox: '0 0 24 24',
          stroke: 'currentColor',
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
        })
      ),
      React.createElement(
        'div',
        { className: 'flex-1' },
        React.createElement(
          'h3',
          { className: 'text-sm font-medium text-amber-800 dark:text-amber-200' },
          formName ? `${formName} Error` : 'Form Error'
        ),
        React.createElement(
          'p',
          { className: 'text-sm text-amber-700 dark:text-amber-300 mt-1' },
          'An error occurred while processing the form. Please try again.'
        ),
        React.createElement(
          'button',
          {
            onClick: resetError,
            className: 'mt-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline',
          },
          'Reset Form'
        )
      )
    )
  );
}

/**
 * Error boundary for form components
 */
export class FormErrorBoundary extends Component<
  FormErrorBoundaryProps,
  ErrorBoundaryState
> {
  boundaryName = 'FormErrorBoundary';

  constructor(props: FormErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const handler = createErrorBoundaryHandler(
      `FormErrorBoundary:${this.props.formName ?? 'unknown'}`
    );
    handler(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, formName } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError);
      }
      if (fallback) {
        return fallback;
      }
      return React.createElement(DefaultFormErrorFallback, {
        error,
        resetError: this.resetError,
        formName,
      });
    }

    return children;
  }
}

// ============================================================================
// withErrorBoundary HOC
// ============================================================================

export interface WithErrorBoundaryOptions {
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  boundaryType?: 'root' | 'route' | 'feature' | 'form';
  featureName?: string;
}

/**
 * Higher-Order Component to wrap a component with an error boundary
 *
 * @example
 * ```tsx
 * const SafeChart = withErrorBoundary(UncertaintyChart, {
 *   boundaryType: 'feature',
 *   featureName: 'Uncertainty Chart',
 *   fallback: <div>Chart unavailable</div>,
 * });
 * ```
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  const {
    fallback,
    onError,
    boundaryType = 'feature',
    featureName,
  } = options;

  function WithErrorBoundaryWrapper(props: P) {
    const ErrorBoundaryComponent = (() => {
      switch (boundaryType) {
        case 'root':
          return RootErrorBoundary;
        case 'route':
          return RouteErrorBoundary;
        case 'form':
          return FormErrorBoundary;
        case 'feature':
        default:
          return FeatureErrorBoundary;
      }
    })();

    const boundaryProps: any = {
      fallback,
      onError,
    };

    if (boundaryType === 'feature' || boundaryType === 'form') {
      boundaryProps.featureName = featureName;
      boundaryProps.formName = featureName;
    }

    return React.createElement(
      ErrorBoundaryComponent,
      boundaryProps,
      React.createElement(WrappedComponent, props)
    );
  }

  WithErrorBoundaryWrapper.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundaryWrapper;
}
