/**
 * MobileSidebar Component
 *
 * Drawer-style sidebar for mobile devices with overlay and focus trap.
 *
 * @module components/layout/MobileSidebar
 */

import { useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// Types
// ============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface MobileSidebarProps {
  items: NavItem[];
  logo?: React.ReactNode;
  className?: string;
}

// ============================================================================
// Animation Variants
// ============================================================================

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const sidebarVariants = {
  hidden: { x: '-100%' },
  visible: { x: 0 },
};

// ============================================================================
// MobileSidebar Component
// ============================================================================

export function MobileSidebar({ items, logo, className }: MobileSidebarProps) {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Close sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname, setMobileSidebarOpen]);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
      }

      // Focus trap
      if (e.key === 'Tab' && sidebarRef.current) {
        const focusableElements = sidebarRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    // Focus the close button
    setTimeout(() => closeButtonRef.current?.focus(), 100);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  const handleClose = useCallback(() => {
    setMobileSidebarOpen(false);
  }, [setMobileSidebarOpen]);

  return (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <>
          {/* Overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Sidebar Panel */}
          <motion.div
            ref={sidebarRef}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-72 bg-background border-r shadow-xl lg:hidden',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b">
              {logo || (
                <span className="text-lg font-bold text-foreground">OpenTLU</span>
              )}
              <Button
                ref={closeButtonRef}
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                      onClick={handleClose}
                    >
                      <span className="flex-shrink-0">{item.icon}</span>
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Footer */}
            <div className="border-t p-4">
              <p className="text-xs text-muted-foreground text-center">
                OpenTLU v0.1.0
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Mobile Menu Button Component
// ============================================================================

export function MobileMenuButton({ className }: { className?: string }) {
  const { setMobileSidebarOpen } = useUIStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('lg:hidden', className)}
      onClick={() => setMobileSidebarOpen(true)}
      aria-label="Open navigation menu"
      aria-expanded="false"
      aria-haspopup="dialog"
      data-testid="menu-toggle"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

export default MobileSidebar;
