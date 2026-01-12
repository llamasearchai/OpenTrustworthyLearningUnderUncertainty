/**
 * Badge Component Tests
 *
 * Comprehensive test suite for the Badge component.
 *
 * @module components/ui/__tests__/badge.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render badge with text', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render with default variant', () => {
      render(<Badge>Default</Badge>);
      const badge = screen.getByText('Default');
      expect(badge).toBeInTheDocument();
    });

    it('should render with secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);
      expect(screen.getByText('Secondary')).toBeInTheDocument();
    });

    it('should render with destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>);
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should render with outline variant', () => {
      render(<Badge variant="outline">Outline</Badge>);
      expect(screen.getByText('Outline')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<Badge className="custom-class">Custom</Badge>);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
