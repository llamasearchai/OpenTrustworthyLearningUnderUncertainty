/**
 * Calendar Component Tests
 *
 * @module components/ui/__tests__/calendar.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Calendar } from '../calendar';

describe('Calendar', () => {
  it('should render a day picker', () => {
    render(<Calendar />);
    // react-day-picker renders a grid and navigation; we assert a role that should exist.
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });
});

