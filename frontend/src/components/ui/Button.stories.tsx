/**
 * Button Component Stories
 *
 * Comprehensive Storybook stories for the Button component demonstrating
 * all variants, sizes, states, and interactive behaviors.
 *
 * @module components/ui/Button.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from '@storybook/test';
import { Button } from './button';
import { Mail, ChevronRight, Download, Trash2, Plus, Check, X } from 'lucide-react';

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof Button> = {
  title: 'Components/UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A flexible button component with multiple variants, sizes, and states.
Built on Radix UI Slot for composition and class-variance-authority for variant management.

## Features
- 6 visual variants: default, destructive, outline, secondary, ghost, link
- 4 sizes: default, sm, lg, icon
- Loading state with spinner
- Left and right icon slots
- Accessible with proper ARIA attributes
- Supports asChild for polymorphic rendering

## Usage

\`\`\`tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="default">
  Click me
</Button>
\`\`\`
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
  argTypes: {
    variant: {
      description: 'Visual style variant of the button',
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      table: {
        type: { summary: 'ButtonVariant' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      description: 'Size of the button',
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      table: {
        type: { summary: 'ButtonSize' },
        defaultValue: { summary: 'default' },
      },
    },
    isLoading: {
      description: 'Whether the button is in a loading state',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    loadingText: {
      description: 'Text to display when loading (replaces children)',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    disabled: {
      description: 'Whether the button is disabled',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    asChild: {
      description: 'Render as child element (for Radix composition)',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    leftIcon: {
      description: 'Icon to display on the left side',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    rightIcon: {
      description: 'Icon to display on the right side',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    children: {
      description: 'Button content',
      control: 'text',
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    onClick: {
      description: 'Click handler',
      action: 'clicked',
      table: {
        type: { summary: '(event: MouseEvent) => void' },
      },
    },
  },
  args: {
    children: 'Button',
    onClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * The default button with primary styling.
 */
export const Default: Story = {
  args: {
    variant: 'default',
    size: 'default',
    children: 'Button',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /button/i });

    // Verify button is rendered
    await expect(button).toBeInTheDocument();
    await expect(button).toBeEnabled();

    // Click the button
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// ============================================================================
// All Variants Story
// ============================================================================

/**
 * All available button variants side by side.
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all six button variants: default (primary), secondary, destructive, outline, ghost, and link.',
      },
    },
  },
};

// ============================================================================
// All Sizes Story
// ============================================================================

/**
 * All available button sizes.
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon" aria-label="Add item">
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all four button sizes: sm, default, lg, and icon.',
      },
    },
  },
};

// ============================================================================
// States Story
// ============================================================================

/**
 * Different button states: normal, disabled, and loading.
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm text-muted-foreground">Normal:</span>
        <Button>Normal Button</Button>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm text-muted-foreground">Disabled:</span>
        <Button disabled>Disabled Button</Button>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm text-muted-foreground">Loading:</span>
        <Button isLoading>Loading Button</Button>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm text-muted-foreground">Loading Text:</span>
        <Button isLoading loadingText="Saving...">
          Save
        </Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates different button states including normal, disabled, loading, and loading with custom text.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify disabled button
    const disabledButton = canvas.getByRole('button', { name: /disabled button/i });
    await expect(disabledButton).toBeDisabled();

    // Verify loading buttons have loading indicator
    const loadingButtons = canvas.getAllByRole('button').filter(
      (btn) => btn.getAttribute('aria-busy') === 'true'
    );
    await expect(loadingButtons).toHaveLength(2);
  },
};

// ============================================================================
// With Icons Story
// ============================================================================

/**
 * Buttons with left and right icons.
 */
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button leftIcon={<Mail className="h-4 w-4" />}>Send Email</Button>
        <Button rightIcon={<ChevronRight className="h-4 w-4" />}>Continue</Button>
        <Button
          leftIcon={<Download className="h-4 w-4" />}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Download
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />}>
          Delete
        </Button>
        <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />}>
          Add Item
        </Button>
        <Button variant="secondary" leftIcon={<Check className="h-4 w-4" />}>
          Confirm
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">Icon Only:</span>
        <Button size="icon" variant="outline" aria-label="Send email">
          <Mail className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Add item">
          <Plus className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="destructive" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="icon" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates buttons with icons on the left, right, or both sides. Also shows icon-only buttons.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify icon buttons have proper aria-labels
    const iconButtons = canvas.getAllByRole('button').filter(
      (btn) => btn.getAttribute('aria-label')
    );
    await expect(iconButtons.length).toBeGreaterThan(0);
  },
};

// ============================================================================
// Variant Matrix Story
// ============================================================================

/**
 * Complete matrix of all variants and sizes.
 */
export const VariantMatrix: Story = {
  render: () => {
    const variants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const;
    const sizes = ['sm', 'default', 'lg'] as const;

    return (
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                Variant / Size
              </th>
              {sizes.map((size) => (
                <th
                  key={size}
                  className="p-2 text-left text-sm font-medium text-muted-foreground capitalize"
                >
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {variants.map((variant) => (
              <tr key={variant}>
                <td className="p-2 text-sm font-medium capitalize">{variant}</td>
                {sizes.map((size) => (
                  <td key={`${variant}-${size}`} className="p-2">
                    <Button variant={variant} size={size}>
                      Button
                    </Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A complete matrix showing all combinations of variants and sizes.',
      },
    },
  },
};

// ============================================================================
// Loading States by Variant Story
// ============================================================================

/**
 * Loading state for each variant.
 */
export const LoadingByVariant: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button variant="default" isLoading>
        Default
      </Button>
      <Button variant="secondary" isLoading>
        Secondary
      </Button>
      <Button variant="destructive" isLoading>
        Destructive
      </Button>
      <Button variant="outline" isLoading>
        Outline
      </Button>
      <Button variant="ghost" isLoading>
        Ghost
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows the loading spinner appearance across different button variants.',
      },
    },
  },
};

// ============================================================================
// Interactive Play Test Story
// ============================================================================

/**
 * Story with comprehensive interaction tests.
 */
export const InteractiveTests: Story = {
  args: {
    children: 'Interactive Button',
    onClick: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /interactive button/i });

    // Test: Button is visible and enabled
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();

    // Test: Button can receive focus
    await userEvent.tab();
    await expect(button).toHaveFocus();

    // Test: Button responds to Enter key
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(1);

    // Test: Button responds to Space key
    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(2);

    // Test: Button responds to mouse click
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates interaction testing with click, keyboard navigation, and focus management.',
      },
    },
  },
};

// ============================================================================
// Form Context Story
// ============================================================================

/**
 * Buttons in a form context with submit and reset types.
 */
export const FormButtons: Story = {
  render: () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        alert('Form submitted!');
      }}
      onReset={() => alert('Form reset!')}
      className="flex flex-col gap-4"
    >
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter text..."
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit">Submit</Button>
        <Button type="reset" variant="outline">
          Reset
        </Button>
        <Button type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates buttons with different type attributes (submit, reset, button) within a form context.',
      },
    },
  },
};

// ============================================================================
// Accessibility Story
// ============================================================================

/**
 * Buttons with proper accessibility attributes.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Button aria-describedby="delete-description">Delete Item</Button>
        <span id="delete-description" className="text-sm text-muted-foreground">
          This action cannot be undone
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Button aria-expanded={false} aria-controls="menu-panel">
          Toggle Menu
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Button aria-pressed={true} variant="secondary">
          Selected
        </Button>
        <Button aria-pressed={false} variant="outline">
          Not Selected
        </Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper ARIA attributes for accessibility: aria-describedby, aria-expanded, aria-controls, and aria-pressed.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'button-name', enabled: true },
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};

// ============================================================================
// Dark Mode Story
// ============================================================================

/**
 * Buttons in dark mode context.
 */
export const DarkMode: Story = {
  render: () => (
    <div className="rounded-lg bg-slate-900 p-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
    </div>
  ),
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        story: 'Preview of button variants in dark mode context.',
      },
    },
  },
};
