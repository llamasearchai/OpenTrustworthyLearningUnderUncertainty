/**
 * Button Component Tests
 *
 * Comprehensive test suite for the Button component.
 *
 * @module components/ui/__tests__/button.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      render(<Button>Default</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with link variant', () => {
      render(<Button variant="link">Link</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render with default size', () => {
      render(<Button>Default Size</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with small size', () => {
      render(<Button size="sm">Small</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(<Button size="lg">Large</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with icon size', () => {
      render(<Button size="icon">+</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should render disabled button', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should render loading button', () => {
      render(<Button isLoading loadingText="Loading...">Submit</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByRole('button')).toHaveTextContent('Loading...');
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(<Button onClick={handleClick}>Click me</Button>);
      await user.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );
      await user.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Icons and asChild', () => {
    it('should render left and right icons when not loading', () => {
      render(
        <Button leftIcon={<span data-testid="left" />} rightIcon={<span data-testid="right" />}>
          With Icons
        </Button>
      );
      expect(screen.getByTestId('left')).toBeInTheDocument();
      expect(screen.getByTestId('right')).toBeInTheDocument();
    });

    it('should render asChild using Slot', () => {
      render(
        <Button asChild><a href="/test">Link Button</a></Button>
      );
      const el = screen.getByRole('link', { name: /link button/i });
      expect(el).toHaveAttribute('href', '/test');
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Button className="custom-class">Custom</Button>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible role', () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">×</Button>);
      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
    });
  });
});
