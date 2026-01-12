/**
 * CommandPalette Component
 *
 * A keyboard-accessible command palette for quick navigation and actions.
 * Triggered with Cmd+K (Mac) or Ctrl+K (Windows/Linux).
 *
 * @module components/common/CommandPalette
 */

import { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  FolderKanban,
  Box,
  Shield,
  BrainCircuit,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  RefreshCw,
  Search,
  Plus,
  Play,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
  group: 'navigation' | 'actions' | 'settings' | 'user';
}

// ============================================================================
// Component
// ============================================================================

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, theme, setTheme } = useUIStore();
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Close palette and navigate
  const handleNavigate = useCallback(
    (path: string) => {
      setCommandPaletteOpen(false);
      navigate(path);
    },
    [navigate, setCommandPaletteOpen]
  );

  // Handle logout
  const handleLogout = useCallback(async () => {
    setCommandPaletteOpen(false);
    await logout();
    navigate('/login');
  }, [logout, navigate, setCommandPaletteOpen]);

  // Toggle theme
  const handleToggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    setCommandPaletteOpen(false);
  }, [theme, setTheme, setCommandPaletteOpen]);

  // Define commands
  const commands = useMemo<CommandItem[]>(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
        action: () => handleNavigate('/dashboard'),
        keywords: ['home', 'overview', 'kpi'],
        group: 'navigation',
      },
      {
        id: 'nav-scenarios',
        label: 'Go to Scenarios',
        icon: <FolderKanban className="h-4 w-4" />,
        action: () => handleNavigate('/scenarios'),
        keywords: ['tests', 'evaluations'],
        group: 'navigation',
      },
      {
        id: 'nav-viewer',
        label: 'Go to 3D Viewer',
        icon: <Box className="h-4 w-4" />,
        action: () => handleNavigate('/viewer'),
        keywords: ['3d', 'visualization', 'scene'],
        group: 'navigation',
      },
      {
        id: 'nav-safety',
        label: 'Go to Safety',
        icon: <Shield className="h-4 w-4" />,
        action: () => handleNavigate('/safety'),
        keywords: ['monitors', 'alerts', 'mitigation'],
        group: 'navigation',
      },
      {
        id: 'nav-active-learning',
        label: 'Go to Active Learning',
        icon: <BrainCircuit className="h-4 w-4" />,
        action: () => handleNavigate('/active-learning'),
        keywords: ['acquisition', 'samples', 'batch'],
        group: 'navigation',
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        shortcut: '⌘,',
        icon: <Settings className="h-4 w-4" />,
        action: () => handleNavigate('/settings'),
        keywords: ['preferences', 'config'],
        group: 'navigation',
      },

      // Actions
      {
        id: 'action-new-scenario',
        label: 'Create New Scenario',
        icon: <Plus className="h-4 w-4" />,
        action: () => handleNavigate('/scenarios?action=create'),
        keywords: ['add', 'new'],
        group: 'actions',
      },
      {
        id: 'action-run-evaluation',
        label: 'Run Evaluation',
        icon: <Play className="h-4 w-4" />,
        action: () => handleNavigate('/scenarios?action=evaluate'),
        keywords: ['test', 'execute'],
        group: 'actions',
      },
      {
        id: 'action-refresh',
        label: 'Refresh Data',
        shortcut: '⌘R',
        icon: <RefreshCw className="h-4 w-4" />,
        action: () => {
          window.location.reload();
        },
        keywords: ['reload', 'update'],
        group: 'actions',
      },

      // Settings
      {
        id: 'settings-theme',
        label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        action: handleToggleTheme,
        keywords: ['dark', 'light', 'appearance'],
        group: 'settings',
      },

      // User
      {
        id: 'user-profile',
        label: 'View Profile',
        icon: <User className="h-4 w-4" />,
        action: () => handleNavigate('/profile'),
        keywords: ['account', 'me'],
        group: 'user',
      },
      {
        id: 'user-logout',
        label: 'Sign Out',
        icon: <LogOut className="h-4 w-4" />,
        action: handleLogout,
        keywords: ['logout', 'exit'],
        group: 'user',
      },
    ],
    [handleNavigate, handleToggleTheme, handleLogout, theme]
  );

  // Keyboard shortcut to open palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Reset search when closed
  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearch('');
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const groupedCommands = {
    navigation: commands.filter((c) => c.group === 'navigation'),
    actions: commands.filter((c) => c.group === 'actions'),
    settings: commands.filter((c) => c.group === 'settings'),
    user: commands.filter((c) => c.group === 'user'),
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setCommandPaletteOpen(false)}
        aria-hidden="true"
      />

      {/* Command Dialog */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <Command
          className="rounded-lg border bg-popover text-popover-foreground shadow-lg overflow-hidden"
          shouldFilter={true}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ESC
            </kbd>
          </div>

          {/* Command List */}
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Navigation Group */}
            {groupedCommands.navigation.length > 0 && (
              <Command.Group heading="Navigation" className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Navigation</p>
                {groupedCommands.navigation.map((command) => (
                  <CommandItem key={command.id} command={command} />
                ))}
              </Command.Group>
            )}

            {/* Actions Group */}
            {groupedCommands.actions.length > 0 && (
              <Command.Group heading="Actions" className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Actions</p>
                {groupedCommands.actions.map((command) => (
                  <CommandItem key={command.id} command={command} />
                ))}
              </Command.Group>
            )}

            {/* Settings Group */}
            {groupedCommands.settings.length > 0 && (
              <Command.Group heading="Settings" className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Settings</p>
                {groupedCommands.settings.map((command) => (
                  <CommandItem key={command.id} command={command} />
                ))}
              </Command.Group>
            )}

            {/* User Group */}
            {user && groupedCommands.user.length > 0 && (
              <Command.Group heading="Account" className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-1">Account</p>
                {groupedCommands.user.map((command) => (
                  <CommandItem key={command.id} command={command} />
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↑↓</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">↵</kbd>
              <span>Select</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="rounded border bg-muted px-1.5 py-0.5">ESC</kbd>
              <span>Close</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}

// ============================================================================
// Command Item Component
// ============================================================================

function CommandItem({ command }: { command: CommandItem }) {
  return (
    <Command.Item
      value={`${command.label} ${command.keywords?.join(' ') || ''}`}
      onSelect={command.action}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
        'aria-selected:bg-accent aria-selected:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
      )}
    >
      {command.icon && (
        <span className="mr-2 text-muted-foreground">{command.icon}</span>
      )}
      <span>{command.label}</span>
      {command.shortcut && (
        <kbd className="ml-auto text-xs tracking-widest text-muted-foreground">
          {command.shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}

export default CommandPalette;
