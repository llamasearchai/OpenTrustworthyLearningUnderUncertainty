/**
 * Input Component Stories
 *
 * Comprehensive Storybook stories for the Input component demonstrating
 * all variants, sizes, states, and interactive behaviors.
 *
 * @module components/ui/Input.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from '@storybook/test';
import { Input } from './input';
import { Search, Mail, Eye, EyeOff, DollarSign, Percent, AlertCircle, Check } from 'lucide-react';
import * as React from 'react';

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof Input> = {
  title: 'Components/UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A flexible input component with prefix/suffix slots and state handling.
Built with class-variance-authority for variant management.

## Features
- 3 sizes: sm, default, lg
- Prefix and suffix slot support for icons/buttons
- Error state with accessible error messages
- Disabled state styling
- Full HTML input attribute support

## Usage

\`\`\`tsx
import { Input } from '@/components/ui/input';

<Input
  placeholder="Enter your email"
  type="email"
  prefix={<Mail className="h-4 w-4" />}
/>
\`\`\`
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: false }, // We test labels separately
        ],
      },
    },
  },
  argTypes: {
    type: {
      description: 'Input type',
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
      table: {
        type: { summary: 'InputType' },
        defaultValue: { summary: 'text' },
      },
    },
    size: {
      description: 'Input size',
      control: 'select',
      options: ['sm', 'default', 'lg'],
      table: {
        type: { summary: 'sm | default | lg' },
        defaultValue: { summary: 'default' },
      },
    },
    disabled: {
      description: 'Whether the input is disabled',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    isError: {
      description: 'Whether the input is in an error state',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    errorMessage: {
      description: 'Error message for accessibility',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    placeholder: {
      description: 'Placeholder text',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    prefix: {
      description: 'Prefix element (icon or text)',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    suffix: {
      description: 'Suffix element (icon or button)',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    onChange: {
      description: 'Change handler',
      action: 'changed',
      table: {
        type: { summary: '(event: ChangeEvent) => void' },
      },
    },
    onFocus: {
      description: 'Focus handler',
      action: 'focused',
      table: {
        type: { summary: '(event: FocusEvent) => void' },
      },
    },
    onBlur: {
      description: 'Blur handler',
      action: 'blurred',
      table: {
        type: { summary: '(event: FocusEvent) => void' },
      },
    },
  },
  args: {
    placeholder: 'Enter text...',
    onChange: fn(),
    onFocus: fn(),
    onBlur: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * The default input with standard styling.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter your name',
    type: 'text',
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Enter your name');

    // Verify input is rendered
    await expect(input).toBeInTheDocument();
    await expect(input).toBeEnabled();

    // Type in the input
    await userEvent.type(input, 'John Doe');
    await expect(input).toHaveValue('John Doe');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

// ============================================================================
// All Sizes Story
// ============================================================================

/**
 * All available input sizes.
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Small</label>
        <Input size="sm" placeholder="Small input" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Default</label>
        <Input size="default" placeholder="Default input" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Large</label>
        <Input size="lg" placeholder="Large input" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all three input sizes: sm, default, and lg.',
      },
    },
  },
};

// ============================================================================
// With Error Story
// ============================================================================

/**
 * Input in error state with error message.
 */
export const WithError: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-sm font-medium mb-1 block" htmlFor="error-input">
          Email Address
        </label>
        <Input
          id="error-input"
          type="email"
          placeholder="you@example.com"
          isError
          errorMessage="Please enter a valid email address"
          defaultValue="invalid-email"
          aria-describedby="error-message"
        />
        <p id="error-message" className="text-sm text-destructive mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Please enter a valid email address
        </p>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block" htmlFor="error-prefix-input">
          Phone Number
        </label>
        <Input
          id="error-prefix-input"
          type="tel"
          placeholder="(555) 555-5555"
          isError
          errorMessage="Invalid phone number"
          prefix={<span className="text-muted-foreground">+1</span>}
        />
        <p className="text-sm text-destructive mt-1">Invalid phone number format</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the error state with visual feedback and accessible error messages.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const errorInput = canvas.getByLabelText('Email Address');

    // Verify error state
    await expect(errorInput).toHaveAttribute('aria-invalid', 'true');
  },
};

// ============================================================================
// With Prefix Story
// ============================================================================

/**
 * Inputs with prefix elements.
 */
export const WithPrefix: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-sm font-medium mb-1 block">Search</label>
        <Input
          type="search"
          placeholder="Search..."
          prefix={<Search className="h-4 w-4" />}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Email</label>
        <Input
          type="email"
          placeholder="you@example.com"
          prefix={<Mail className="h-4 w-4" />}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Price</label>
        <Input
          type="number"
          placeholder="0.00"
          prefix={<DollarSign className="h-4 w-4" />}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Website</label>
        <Input
          type="url"
          placeholder="example.com"
          prefix={<span className="text-sm">https://</span>}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates inputs with various prefix elements including icons and text.',
      },
    },
  },
};

// ============================================================================
// With Suffix Story
// ============================================================================

/**
 * Inputs with suffix elements.
 */
export const WithSuffix: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-sm font-medium mb-1 block">Percentage</label>
        <Input
          type="number"
          placeholder="0"
          suffix={<Percent className="h-4 w-4" />}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Weight</label>
        <Input
          type="number"
          placeholder="0.0"
          suffix={<span className="text-sm text-muted-foreground">kg</span>}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Validated Field</label>
        <Input
          type="text"
          placeholder="Enter text"
          defaultValue="Valid input"
          suffix={<Check className="h-4 w-4 text-green-500" />}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates inputs with various suffix elements including icons and units.',
      },
    },
  },
};

// ============================================================================
// With Prefix and Suffix Story
// ============================================================================

/**
 * Inputs with both prefix and suffix elements.
 */
export const WithPrefixAndSuffix: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-sm font-medium mb-1 block">Price with Currency</label>
        <Input
          type="number"
          placeholder="0.00"
          prefix={<DollarSign className="h-4 w-4" />}
          suffix={<span className="text-sm text-muted-foreground">USD</span>}
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Email with Validation</label>
        <Input
          type="email"
          placeholder="you@example.com"
          defaultValue="valid@email.com"
          prefix={<Mail className="h-4 w-4" />}
          suffix={<Check className="h-4 w-4 text-green-500" />}
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates inputs with both prefix and suffix elements combined.',
      },
    },
  },
};

// ============================================================================
// Disabled Story
// ============================================================================

/**
 * Disabled input states.
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-sm font-medium mb-1 block text-muted-foreground">
          Disabled Empty
        </label>
        <Input placeholder="Cannot edit" disabled />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block text-muted-foreground">
          Disabled with Value
        </label>
        <Input defaultValue="Read only value" disabled />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block text-muted-foreground">
          Disabled with Prefix
        </label>
        <Input
          placeholder="Cannot search"
          prefix={<Search className="h-4 w-4" />}
          disabled
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates disabled input states with various configurations.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const inputs = canvas.getAllByRole('textbox');

    // Verify all inputs are disabled
    for (const input of inputs) {
      await expect(input).toBeDisabled();
    }
  },
};

// ============================================================================
// Input Types Story
// ============================================================================

/**
 * Different HTML input types.
 */
export const InputTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label className="text-sm font-medium mb-1 block">Text</label>
        <Input type="text" placeholder="Plain text" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Email</label>
        <Input type="email" placeholder="you@example.com" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Password</label>
        <Input type="password" placeholder="Enter password" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Number</label>
        <Input type="number" placeholder="0" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Search</label>
        <Input type="search" placeholder="Search..." />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Tel</label>
        <Input type="tel" placeholder="(555) 555-5555" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">URL</label>
        <Input type="url" placeholder="https://example.com" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all supported HTML input types.',
      },
    },
  },
};

// ============================================================================
// Password with Toggle Story
// ============================================================================

/**
 * Password input with show/hide toggle.
 */
export const PasswordWithToggle: Story = {
  render: function PasswordToggleRender() {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <div className="w-80">
        <label className="text-sm font-medium mb-1 block">Password</label>
        <Input
          type={showPassword ? 'text' : 'password'}
          placeholder="Enter your password"
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />
        <p className="text-xs text-muted-foreground mt-1">
          Click the eye icon to toggle password visibility
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates a password input with a toggle button to show/hide the password.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText('Enter your password');
    const toggleButton = canvas.getByLabelText('Show password');

    // Initially should be password type
    await expect(input).toHaveAttribute('type', 'password');

    // Type some text
    await userEvent.type(input, 'mypassword123');
    await expect(input).toHaveValue('mypassword123');

    // Toggle to show password
    await userEvent.click(toggleButton);
    await expect(input).toHaveAttribute('type', 'text');

    // Toggle back to hide
    await userEvent.click(canvas.getByLabelText('Hide password'));
    await expect(input).toHaveAttribute('type', 'password');
  },
};

// ============================================================================
// Form Integration Story
// ============================================================================

/**
 * Input in a form context with validation.
 */
export const FormIntegration: Story = {
  render: function FormRender() {
    const [email, setEmail] = React.useState('');
    const [emailError, setEmailError] = React.useState('');

    const validateEmail = (value: string) => {
      if (!value) {
        setEmailError('Email is required');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        setEmailError('Please enter a valid email address');
        return false;
      }
      setEmailError('');
      return true;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (validateEmail(email)) {
        alert(`Form submitted with email: ${email}`);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="w-80 space-y-4">
        <div>
          <label htmlFor="form-email" className="text-sm font-medium mb-1 block">
            Email Address <span className="text-destructive">*</span>
          </label>
          <Input
            id="form-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => validateEmail(email)}
            isError={!!emailError}
            errorMessage={emailError}
            prefix={<Mail className="h-4 w-4" />}
            aria-required="true"
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-sm text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {emailError}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Subscribe
        </button>
      </form>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates input integration in a form with validation and error handling.',
      },
    },
  },
};

// ============================================================================
// Accessibility Story
// ============================================================================

/**
 * Inputs with proper accessibility attributes.
 */
export const Accessibility: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label htmlFor="accessible-name" className="text-sm font-medium mb-1 block">
          Full Name <span className="text-destructive">*</span>
        </label>
        <Input
          id="accessible-name"
          placeholder="John Doe"
          aria-required="true"
          aria-describedby="name-hint"
        />
        <p id="name-hint" className="text-xs text-muted-foreground mt-1">
          Enter your first and last name
        </p>
      </div>
      <div>
        <label htmlFor="accessible-search" className="sr-only">
          Search
        </label>
        <Input
          id="accessible-search"
          type="search"
          placeholder="Search..."
          prefix={<Search className="h-4 w-4" />}
          aria-label="Search"
        />
      </div>
      <div>
        <label htmlFor="accessible-readonly" className="text-sm font-medium mb-1 block">
          Read-only Field
        </label>
        <Input
          id="accessible-readonly"
          defaultValue="This value cannot be changed"
          readOnly
          aria-readonly="true"
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates proper accessibility attributes including labels, hints, and ARIA attributes.',
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'label', enabled: true },
          { id: 'color-contrast', enabled: true },
        ],
      },
    },
  },
};

// ============================================================================
// Keyboard Navigation Story
// ============================================================================

/**
 * Tests keyboard navigation between inputs.
 */
export const KeyboardNavigation: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <div>
        <label htmlFor="field-1" className="text-sm font-medium mb-1 block">
          First Field
        </label>
        <Input id="field-1" placeholder="Tab to next field" />
      </div>
      <div>
        <label htmlFor="field-2" className="text-sm font-medium mb-1 block">
          Second Field
        </label>
        <Input id="field-2" placeholder="Tab again" />
      </div>
      <div>
        <label htmlFor="field-3" className="text-sm font-medium mb-1 block">
          Third Field
        </label>
        <Input id="field-3" placeholder="Use Shift+Tab to go back" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tests keyboard navigation with Tab and Shift+Tab between input fields.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field1 = canvas.getByLabelText('First Field');
    const field2 = canvas.getByLabelText('Second Field');
    const field3 = canvas.getByLabelText('Third Field');

    // Focus first field
    await userEvent.click(field1);
    await expect(field1).toHaveFocus();

    // Tab to second field
    await userEvent.tab();
    await expect(field2).toHaveFocus();

    // Tab to third field
    await userEvent.tab();
    await expect(field3).toHaveFocus();

    // Shift+Tab back to second field
    await userEvent.tab({ shift: true });
    await expect(field2).toHaveFocus();
  },
};
