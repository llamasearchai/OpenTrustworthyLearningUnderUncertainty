/**
 * DropdownMenu Component Tests
 *
 * @module components/ui/__tests__/dropdown-menu.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Button } from '../button';

describe('DropdownMenu', () => {
  it('should open and render content', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Open menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>Menu</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem inset>
              Item 1<DropdownMenuShortcut>Ctrl+1</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
            <DropdownMenuRadioGroup value="a">
              <DropdownMenuRadioItem value="a">Radio A</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="b">Radio B</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Sub Item</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );

    await user.click(screen.getByRole('button', { name: /open menu/i }));
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Checked')).toBeInTheDocument();
    expect(screen.getByText('Radio A')).toBeInTheDocument();
    expect(screen.getByText('Radio B')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
  });
});

