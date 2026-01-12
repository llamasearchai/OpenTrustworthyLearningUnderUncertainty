/**
 * Avatar Component Tests
 *
 * @module components/ui/__tests__/avatar.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../avatar';

vi.mock('@radix-ui/react-avatar', () => ({
  Root: (props: any) => <span {...props} />,
  Image: (props: any) => <img {...props} />,
  Fallback: (props: any) => <span {...props} />,
}));

describe('Avatar', () => {
  it('should render initials for single-word fallback', () => {
    render(<Avatar fallback="Alex" />);
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('should render initials for multi-word fallback', () => {
    render(<Avatar fallback="Test User" />);
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('should render image when src is provided', () => {
    const { container } = render(
      <Avatar src="https://example.com/avatar.png" alt="Avatar" fallback="Test User" />
    );
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png');
  });
});

