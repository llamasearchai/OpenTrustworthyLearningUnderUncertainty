/**
 * Tooltip Component Tests
 *
 * Comprehensive test suite for the Tooltip component.
 *
 * @module components/ui/__tests__/tooltip.test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tooltip, TooltipProvider } from '../tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    // The global test setup enables fake timers; Radix Tooltip timing is easier to validate with real timers.
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe('Rendering', () => {
    it('should render tooltip provider', () => {
      const { container } = render(
        <TooltipProvider>
          <div>Test content</div>
        </TooltipProvider>
      );
      expect(container.firstChild).toBeTruthy();
      expect(container.textContent).toContain('Test content');
    });

    it('should render tooltip wrapper', async () => {
      const user = userEvent.setup();
      render(
        <Tooltip content="Hello tooltip" delayDuration={0}>
          <button type="button">Trigger</button>
        </Tooltip>
      );
      await user.hover(screen.getByRole('button', { name: /trigger/i }));
      expect(screen.getAllByText('Hello tooltip').length).toBeGreaterThan(0);
    });
  });
});
