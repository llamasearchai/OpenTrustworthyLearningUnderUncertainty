/**
 * Label Component Tests
 *
 * Comprehensive test suite for the Label component.
 *
 * @module components/ui/__tests__/label.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../label';

describe('Label', () => {
  describe('Rendering', () => {
    it('should render label with text', () => {
      render(<Label>Email</Label>);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('should render with htmlFor attribute', () => {
      render(<Label htmlFor="email-input">Email</Label>);
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
    });

    it('should render with custom className', () => {
      const { container } = render(<Label className="custom-class">Custom</Label>);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should render required indicator', () => {
      render(<Label required>Email</Label>);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible', () => {
      render(<Label htmlFor="input">Label</Label>);
      expect(screen.getByText('Label')).toBeInTheDocument();
    });
  });
});
