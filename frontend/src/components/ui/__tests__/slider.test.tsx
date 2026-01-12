/**
 * Slider Component Tests
 *
 * @module components/ui/__tests__/slider.test
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Slider } from '../slider';

describe('Slider', () => {
  it('should render', () => {
    const { container } = render(<Slider defaultValue={[50]} max={100} step={1} />);
    // Radix slider uses a div tree; we validate the presence of the root and thumb.
    expect(container.querySelector('[data-orientation]') || container.firstChild).toBeTruthy();
    expect(container.querySelector('[role=\"slider\"]')).toBeTruthy();
  });
});

