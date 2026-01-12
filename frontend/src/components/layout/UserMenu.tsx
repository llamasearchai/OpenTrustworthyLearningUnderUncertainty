/**
 * UserMenu Component
 *
 * User profile dropdown menu in the header with profile, settings, and logout options.
 *
 * @module components/layout/UserMenu
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, Shield, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AvatarRoot, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// Types
// ============================================================================

interface UserMenuProps {
  className?: string;
  showChevron?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(email: string): string {
  // Generate a consistent color based on email
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
  ];

  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// ============================================================================
// Size Config
// ============================================================================

const sizeConfig = {
  sm: {
    avatar: 'h-7 w-7',
    text: 'text-xs',
    button: 'h-8 px-2',
  },
  default: {
    avatar: 'h-8 w-8',
    text: 'text-sm',
    button: 'h-9 px-3',
  },
  lg: {
    avatar: 'h-10 w-10',
    text: 'text-base',
    button: 'h-11 px-4',
  },
};

// ============================================================================
// Component
// ============================================================================

export function UserMenu({ className, showChevron = true, size = 'default' }: UserMenuProps) {
  const { user, logout, isLoading } = useAuth();
  const { theme, setTheme } = useUIStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const config = sizeConfig[size];

  if (!user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/login')}
        className={className}
      >
        Sign In
      </Button>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'flex items-center gap-2',
            config.button,
            className
          )}
          data-testid="user-menu"
        >
          <AvatarRoot className={config.avatar}>
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className={cn(getAvatarColor(user.email), 'text-white font-medium')}>
              {getInitials(user.name || user.email)}
            </AvatarFallback>
          </AvatarRoot>
          <span className={cn('hidden sm:inline-block font-medium', config.text)}>
            {user.name || user.email.split('@')[0]}
          </span>
          {showChevron && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            {user.role === 'admin' && (
              <div className="flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-medium">Admin</span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            navigate('/profile');
          }}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            setIsOpen(false);
            navigate('/settings');
          }}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={toggleTheme}>
          {theme === 'dark' ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark Mode</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoading}
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Signing out...' : 'Sign Out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
