/**
 * Input Component Tests
 *
 * Comprehensive test suite for the Input component.
 *
 * @module components/ui/__tests__/input.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with value', () => {
      render(<Input value="Test value" readOnly />);
      expect(screen.getByDisplayValue('Test value')).toBeInTheDocument();
    });

    it('should render with type', () => {
      render(<Input type="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });

    it('should render with id', () => {
      render(<Input id="test-input" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'test-input');
    });
  });

  describe('Interactions', () => {
    it('should update value on input', async () => {
      const user = userEvent.setup();
      render(<Input />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');
      expect(input).toHaveValue('Hello');
    });

    it('should call onChange handler', async () => {
      const handleChange = vi.fn();
      const user = userEvent.setup();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('should render disabled input', () => {
      render(<Input disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should render readonly input', () => {
      render(<Input readOnly value="Readonly" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readOnly');
    });

    it('should render required input', () => {
      render(<Input required />);
      expect(screen.getByRole('textbox')).toBeRequired();
    });

    it('should render error state with aria-invalid and aria-describedby', () => {
      render(<Input id="email" isError errorMessage="Invalid" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Input className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Addons', () => {
    it('should render prefix and suffix wrapper', () => {
      render(
        <Input
          data-testid="input"
          prefix={<span>Prefix</span>}
          suffix={<span>Suffix</span>}
        />
      );
      expect(screen.getByTestId('input-wrapper')).toBeInTheDocument();
      expect(screen.getByText('Prefix')).toBeInTheDocument();
      expect(screen.getByText('Suffix')).toBeInTheDocument();
    });

    it('should set aria-describedby in addons mode when errorMessage is provided', () => {
      render(
        <Input
          id="email"
          data-testid="email"
          prefix={<span>P</span>}
          isError
          errorMessage="Invalid"
        />
      );
      const input = screen.getByTestId('email');
      expect(input).toHaveAttribute('aria-describedby', 'email-error');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByTestId('email-wrapper')).toBeInTheDocument();
    });

    it('should apply size and disabled styling in addons mode', () => {
      const { container } = render(
        <Input
          id="x"
          data-testid="x"
          size="sm"
          disabled
          prefix={<span>P</span>}
          suffix={<span>S</span>}
        />
      );
      expect(screen.getByTestId('x-wrapper')).toBeInTheDocument();
      // size=sm should apply smaller text class to the input itself
      const input = screen.getByTestId('x');
      expect(input).toBeDisabled();
      expect(container.querySelector('.text-xs')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should support aria-label', () => {
      render(<Input aria-label="Email address" />);
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <>
          <Input aria-describedby="help-text" />
          <div id="help-text">Help text</div>
        </>
      );
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });
  });
});
