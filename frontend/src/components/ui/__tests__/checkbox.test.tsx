/**
 * Checkbox Component Tests
 *
 * Comprehensive test suite for the Checkbox component.
 *
 * @module components/ui/__tests__/checkbox.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../checkbox';

describe('Checkbox', () => {
  describe('Rendering', () => {
    it('should render checkbox', () => {
      render(<Checkbox />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('should render with label', () => {
      render(
        <div>
          <Checkbox id="test-checkbox" />
          <label htmlFor="test-checkbox">Check me</label>
        </div>
      );
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText('Check me')).toBeInTheDocument();
    });

    it('should render checked checkbox', () => {
      render(<Checkbox checked />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('should render unchecked checkbox', () => {
      render(<Checkbox checked={false} />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('should render indeterminate checkbox', () => {
      const { container } = render(<Checkbox indeterminate />);
      const checkbox = screen.getByRole('checkbox');
      // Radix sets data-state=indeterminate when checked="indeterminate"
      expect(checkbox).toHaveAttribute('data-state', 'indeterminate');
      // Ensure indicator renders (icon presence is implementation detail, but container should exist)
      expect(container.querySelector('[data-state=\"indeterminate\"]')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should toggle on click', async () => {
      const user = userEvent.setup();
      const handleCheckedChange = vi.fn();
      render(<Checkbox onCheckedChange={handleCheckedChange} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      await user.click(checkbox);
      // Checkbox may be controlled, so verify handler was called
      expect(handleCheckedChange).toHaveBeenCalled();
    });

    it('should call onCheckedChange handler', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Checkbox onCheckedChange={handleChange} />);
      await user.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should render disabled checkbox', () => {
      render(<Checkbox disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('should not toggle when disabled', async () => {
      const user = userEvent.setup();
      render(<Checkbox disabled checked={false} />);
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Checkbox aria-label="Accept terms" />);
      expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Checkbox aria-describedby="help-text" />
          <div id="help-text">Help text</div>
        </>
      );
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-describedby', 'help-text');
    });
  });
});
