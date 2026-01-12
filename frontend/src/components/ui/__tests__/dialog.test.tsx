/**
 * Dialog Component Tests
 *
 * Comprehensive test suite for the Dialog component.
 *
 * @module components/ui/__tests__/dialog.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../dialog';
import { Button } from '../button';

describe('Dialog', () => {
  describe('Rendering', () => {
    it('should render dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>Test description</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByText('Open')).toBeInTheDocument();
    });

    it('should render dialog content when open', async () => {
      render(
        <Dialog defaultOpen>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Test Dialog</DialogTitle>
              <DialogDescription>Test description</DialogDescription>
            </DialogHeader>
            <DialogFooter className="test-footer">
              <Button>Ok</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.getByText('Ok')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open dialog on trigger click', async () => {
      const user = userEvent.setup();
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      );
      await user.click(screen.getByText('Open'));
      expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    });
  });
});
