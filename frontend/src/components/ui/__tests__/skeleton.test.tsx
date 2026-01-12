/**
 * Skeleton Component Tests
 *
 * @module components/ui/__tests__/skeleton.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonTable, SkeletonText } from '../skeleton';

describe('Skeleton', () => {
  it('should render a single skeleton by default', () => {
    render(<Skeleton />);
    const el = screen.getByRole('status', { name: /loading/i });
    expect(el).toBeInTheDocument();
  });

  it('should apply width and height styles', () => {
    render(<Skeleton width={120} height={24} data-testid="sk" />);
    const el = screen.getByTestId('sk');
    expect(el).toHaveStyle({ width: '120px', height: '24px' });
  });

  it('should render circle skeleton', () => {
    render(<Skeleton circle width={40} data-testid="sk" />);
    const el = screen.getByTestId('sk');
    expect(el).toHaveStyle({ borderRadius: '50%', width: '40px', height: '40px' });
  });

  it('should render multiple skeletons when count > 1', () => {
    render(<Skeleton count={3} />);
    const els = screen.getAllByRole('status', { name: /loading/i });
    expect(els.length).toBe(3);
  });
});

describe('Skeleton variants', () => {
  it('should render SkeletonText with correct number of lines', () => {
    render(<SkeletonText lines={4} />);
    const els = screen.getAllByRole('status', { name: /loading/i });
    expect(els.length).toBe(4);
  });

  it('should render SkeletonCard', () => {
    render(<SkeletonCard />);
    const els = screen.getAllByRole('status', { name: /loading/i });
    expect(els.length).toBeGreaterThan(0);
  });

  it('should render SkeletonAvatar', () => {
    render(<SkeletonAvatar size="sm" />);
    const el = screen.getByRole('status', { name: /loading/i });
    expect(el).toBeInTheDocument();
  });

  it('should render SkeletonTable', () => {
    render(<SkeletonTable rows={2} columns={3} />);
    const els = screen.getAllByRole('status', { name: /loading/i });
    expect(els.length).toBeGreaterThan(0);
  });
});

