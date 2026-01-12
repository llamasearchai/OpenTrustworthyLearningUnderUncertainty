/**
 * Switch Component Tests
 *
 * Comprehensive test suite for the Switch component.
 *
 * @module components/ui/__tests__/switch.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../switch';

describe('Switch', () => {
  describe('Rendering', () => {
    it('should render switch', () => {
      render(<Switch />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should render checked switch', () => {
      render(<Switch checked />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('should render unchecked switch', () => {
      render(<Switch checked={false} />);
      expect(screen.getByRole('switch')).not.toBeChecked();
    });
  });

  describe('Interactions', () => {
    it('should toggle on click', async () => {
      const user = userEvent.setup();
      render(<Switch />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).not.toBeChecked();
      await user.click(switchElement);
      expect(switchElement).toBeChecked();
    });

    it('should call onCheckedChange handler', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Switch onCheckedChange={handleChange} />);
      await user.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should render disabled switch', () => {
      render(<Switch disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      render(<Switch disabled checked={false} />);
      const switchElement = screen.getByRole('switch');
      await user.click(switchElement);
      expect(switchElement).not.toBeChecked();
    });

    it('should show loading state and be disabled', () => {
      const { container } = render(<Switch isLoading checked={false} />);
      const switchElement = screen.getByRole('switch');
      expect(switchElement).toBeDisabled();
      expect(container.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Switch aria-label="Enable notifications" />);
      expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument();
    });
  });
});
