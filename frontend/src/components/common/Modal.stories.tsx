/**
 * Modal Component Stories
 *
 * Comprehensive Storybook stories for the Modal/Dialog component demonstrating
 * all sizes, configurations, and interactive behaviors.
 *
 * @module components/common/Modal.stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from '@storybook/test';
import {
  Modal,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from './modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Trash2, Settings, Info, CheckCircle } from 'lucide-react';
import * as React from 'react';

// ============================================================================
// Meta Configuration
// ============================================================================

const meta: Meta<typeof Modal> = {
  title: 'Components/Common/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
An accessible modal dialog component built on Radix UI Dialog.
Supports multiple sizes, custom content, and configurable behaviors.

## Features
- 5 sizes: sm, default, lg, xl, full
- Accessible with proper focus management
- Customizable close behavior
- Animation support
- Composable with DialogHeader, DialogFooter, etc.

## Usage

\`\`\`tsx
import { Modal } from '@/components/common/modal';

<Modal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Modal Title"
  description="Modal description text"
>
  <p>Modal content goes here</p>
</Modal>
\`\`\`

### Compound Component Pattern

\`\`\`tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/common/modal';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <p>Content</p>
    <DialogFooter>
      <Button>Action</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
\`\`\`
        `,
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'dialog-name', enabled: true },
        ],
      },
    },
  },
  argTypes: {
    open: {
      description: 'Whether the modal is open',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
      },
    },
    onOpenChange: {
      description: 'Callback when open state changes',
      action: 'openChange',
      table: {
        type: { summary: '(open: boolean) => void' },
      },
    },
    title: {
      description: 'Modal title',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    description: {
      description: 'Modal description',
      control: 'text',
      table: {
        type: { summary: 'string' },
      },
    },
    size: {
      description: 'Modal size',
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl', 'full'],
      table: {
        type: { summary: 'sm | default | lg | xl | full' },
        defaultValue: { summary: 'default' },
      },
    },
    showClose: {
      description: 'Whether to show the close button',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    closeOnOverlayClick: {
      description: 'Whether clicking overlay closes the modal',
      control: 'boolean',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
    children: {
      description: 'Modal content',
      control: false,
      table: {
        type: { summary: 'ReactNode' },
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// ============================================================================
// Default Story
// ============================================================================

/**
 * Default modal with title and description.
 */
export const Default: Story = {
  render: function DefaultRender() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Modal Title"
          description="This is a description of the modal content."
        >
          <p className="text-sm text-muted-foreground">
            This is the main content of the modal. You can put any content here.
          </p>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'The default modal with a title, description, and content.',
      },
    },
  },
};

// ============================================================================
// All Sizes Story
// ============================================================================

/**
 * All available modal sizes.
 */
export const AllSizes: Story = {
  render: function AllSizesRender() {
    const [openSize, setOpenSize] = React.useState<'sm' | 'default' | 'lg' | 'xl' | 'full' | null>(null);

    const sizes = ['sm', 'default', 'lg', 'xl', 'full'] as const;

    return (
      <div className="flex flex-wrap gap-4">
        {sizes.map((size) => (
          <React.Fragment key={size}>
            <Button variant="outline" onClick={() => setOpenSize(size)}>
              Size: {size}
            </Button>
            <Modal
              open={openSize === size}
              onOpenChange={(open) => setOpenSize(open ? size : null)}
              title={`${size.charAt(0).toUpperCase() + size.slice(1)} Modal`}
              description={`This is a ${size} sized modal.`}
              size={size}
            >
              <p className="text-sm text-muted-foreground">
                The modal is currently set to "{size}" size. This affects the maximum width of the dialog.
              </p>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setOpenSize(null)}>Close</Button>
              </div>
            </Modal>
          </React.Fragment>
        ))}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all five modal sizes: sm (max-w-sm), default (max-w-lg), lg (max-w-2xl), xl (max-w-4xl), and full (90vw x 90vh).',
      },
    },
  },
};

// ============================================================================
// With Form Story
// ============================================================================

/**
 * Modal containing a form with validation.
 */
export const WithForm: Story = {
  render: function WithFormRender() {
    const [open, setOpen] = React.useState(false);
    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setIsSubmitting(false);
      setOpen(false);
      setName('');
      setEmail('');

      alert(`Submitted: ${name} (${email})`);
    };

    return (
      <>
        <Button onClick={() => setOpen(true)}>Add User</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Add New User"
          description="Fill in the details below to add a new user."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="form-name" className="text-sm font-medium mb-1 block">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="form-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                required
              />
            </div>
            <div>
              <label htmlFor="form-email" className="text-sm font-medium mb-1 block">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                id="form-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} loadingText="Adding...">
                Add User
              </Button>
            </div>
          </form>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal containing a form with input fields, validation, and async submission handling.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open the modal
    const openButton = canvas.getByRole('button', { name: /add user/i });
    await userEvent.click(openButton);

    // Wait for modal to open
    await new Promise((resolve) => setTimeout(resolve, 500));
  },
};

// ============================================================================
// Confirmation Dialog Story
// ============================================================================

/**
 * Confirmation dialog pattern for destructive actions.
 */
export const ConfirmationDialog: Story = {
  render: function ConfirmationRender() {
    const [open, setOpen] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    const handleDelete = async () => {
      setIsDeleting(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsDeleting(false);
      setOpen(false);
      alert('Item deleted successfully');
    };

    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Item
        </Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Delete Item"
          size="sm"
          showClose={false}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this item? This action cannot be undone and all associated data will be permanently removed.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={isDeleting}
              loadingText="Deleting..."
            >
              Delete
            </Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A confirmation dialog pattern commonly used for destructive actions like delete operations.',
      },
    },
  },
};

// ============================================================================
// Alert Dialog Story
// ============================================================================

/**
 * Alert dialog for important notifications.
 */
export const AlertDialog: Story = {
  render: function AlertRender() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Show Alert</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          size="sm"
          closeOnOverlayClick={false}
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Success!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your changes have been saved successfully.
            </p>
            <Button onClick={() => setOpen(false)} className="w-full">
              Continue
            </Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Alert dialog for displaying important notifications with a visual icon.',
      },
    },
  },
};

// ============================================================================
// Settings Modal Story
// ============================================================================

/**
 * Settings modal with multiple sections.
 */
export const SettingsModal: Story = {
  render: function SettingsRender() {
    const [open, setOpen] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('general');

    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Settings"
          description="Manage your account settings and preferences."
          size="lg"
        >
          <div className="flex gap-6 min-h-[300px]">
            <div className="w-40 flex-shrink-0 border-r pr-4">
              <nav className="flex flex-col gap-1">
                {['general', 'notifications', 'security', 'api'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`text-left px-3 py-2 rounded text-sm capitalize ${
                      activeTab === tab
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex-1">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <h3 className="font-medium">General Settings</h3>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Display Name</label>
                    <Input defaultValue="John Doe" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Email</label>
                    <Input type="email" defaultValue="john@example.com" />
                  </div>
                </div>
              )}
              {activeTab === 'notifications' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure how you receive notifications.
                  </p>
                </div>
              )}
              {activeTab === 'security' && (
                <div className="space-y-4">
                  <h3 className="font-medium">Security Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your security preferences and two-factor authentication.
                  </p>
                </div>
              )}
              {activeTab === 'api' && (
                <div className="space-y-4">
                  <h3 className="font-medium">API Keys</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your API keys and tokens.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Save Changes</Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A more complex settings modal with tabbed navigation and multiple sections.',
      },
    },
  },
};

// ============================================================================
// No Close Button Story
// ============================================================================

/**
 * Modal without the close button.
 */
export const NoCloseButton: Story = {
  render: function NoCloseRender() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="No Close Button"
          description="This modal doesn't have a close button in the corner."
          showClose={false}
        >
          <p className="text-sm text-muted-foreground mb-4">
            The user must click one of the buttons below or press Escape to close this modal.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal configured without the X close button, requiring explicit action to dismiss.',
      },
    },
  },
};

// ============================================================================
// Prevent Overlay Close Story
// ============================================================================

/**
 * Modal that cannot be closed by clicking the overlay.
 */
export const PreventOverlayClose: Story = {
  render: function PreventCloseRender() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Modal</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Cannot Close on Overlay"
          description="Clicking the overlay or pressing Escape will not close this modal."
          closeOnOverlayClick={false}
        >
          <p className="text-sm text-muted-foreground mb-4">
            This is useful for important forms or processes that shouldn't be accidentally dismissed.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Close Modal</Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal configured to prevent closing by clicking the overlay or pressing Escape.',
      },
    },
  },
};

// ============================================================================
// Compound Component Pattern Story
// ============================================================================

/**
 * Using the compound component pattern for more control.
 */
export const CompoundComponents: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open with Compound Pattern</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compound Component Pattern</DialogTitle>
          <DialogDescription>
            This modal is built using the compound component pattern for maximum flexibility.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            The compound component pattern gives you full control over the modal structure
            while maintaining proper accessibility.
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the compound component pattern using Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, etc.',
      },
    },
  },
};

// ============================================================================
// Info Modal Story
// ============================================================================

/**
 * Information modal with icon.
 */
export const InfoModal: Story = {
  render: function InfoRender() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Info className="h-4 w-4 mr-2" />
          Learn More
        </Button>
        <Modal open={open} onOpenChange={setOpen} size="default">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2">About This Feature</h2>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  This feature allows you to manage your uncertainty estimates and monitor
                  model performance in real-time.
                </p>
                <p>
                  Key benefits include:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Real-time uncertainty decomposition</li>
                  <li>Automated safety monitoring</li>
                  <li>Configurable alerting thresholds</li>
                  <li>Historical trend analysis</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={() => setOpen(false)}>Got it</Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'An informational modal with an icon and structured content.',
      },
    },
  },
};

// ============================================================================
// Scrollable Content Story
// ============================================================================

/**
 * Modal with scrollable content for long forms or lists.
 */
export const ScrollableContent: Story = {
  render: function ScrollableRender() {
    const [open, setOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOpen(true)}>Open Long Modal</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Terms of Service"
          size="lg"
        >
          <div className="max-h-[400px] overflow-y-auto pr-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="mb-4">
                <h4 className="font-medium mb-1">Section {i + 1}</h4>
                <p className="text-sm text-muted-foreground">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Decline
            </Button>
            <Button onClick={() => setOpen(false)}>Accept</Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal with scrollable content area for displaying long text or lists.',
      },
    },
  },
};

// ============================================================================
// Nested Modals Story
// ============================================================================

/**
 * Nested modal pattern (modal opening another modal).
 */
export const NestedModals: Story = {
  render: function NestedRender() {
    const [outerOpen, setOuterOpen] = React.useState(false);
    const [innerOpen, setInnerOpen] = React.useState(false);

    return (
      <>
        <Button onClick={() => setOuterOpen(true)}>Open Outer Modal</Button>
        <Modal
          open={outerOpen}
          onOpenChange={setOuterOpen}
          title="Outer Modal"
          description="This is the outer modal."
          size="lg"
        >
          <p className="text-sm text-muted-foreground mb-4">
            You can open another modal from within this one.
          </p>
          <Button onClick={() => setInnerOpen(true)}>Open Inner Modal</Button>
        </Modal>
        <Modal
          open={innerOpen}
          onOpenChange={setInnerOpen}
          title="Inner Modal"
          description="This is a nested modal."
          size="sm"
        >
          <p className="text-sm text-muted-foreground mb-4">
            This modal is nested inside the outer modal.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setInnerOpen(false)}>Close</Button>
          </div>
        </Modal>
      </>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the nested modal pattern where one modal can open another.',
      },
    },
  },
};
