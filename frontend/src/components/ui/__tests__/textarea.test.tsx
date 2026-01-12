/**
 * Textarea Component Tests
 *
 * Comprehensive test suite for the Textarea component.
 *
 * @module components/ui/__tests__/textarea.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../textarea';

describe('Textarea', () => {
  describe('Rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Textarea placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with value', () => {
      render(<Textarea value="Test value" readOnly />);
      expect(screen.getByDisplayValue('Test value')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should update value on input', async () => {
      const user = userEvent.setup();
      render(<Textarea />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Hello');
      expect(textarea).toHaveValue('Hello');
    });

    it('should call onChange handler', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Textarea onChange={handleChange} />);
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should render disabled textarea', () => {
      render(<Textarea disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should render readonly textarea', () => {
      render(<Textarea readOnly value="Readonly" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readOnly');
    });

    it('should render required textarea', () => {
      render(<Textarea required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Textarea className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Textarea aria-label="Description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
  });
});
