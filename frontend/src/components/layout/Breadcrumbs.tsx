/**
 * Breadcrumbs Component
 *
 * Navigation breadcrumbs that show the current location in the app hierarchy.
 *
 * @module components/layout/Breadcrumbs
 */

import { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrentPage: boolean;
}

interface BreadcrumbsProps {
  className?: string;
  homeLabel?: string;
  separator?: React.ReactNode;
}

// ============================================================================
// Route Configuration
// ============================================================================

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  scenarios: 'Scenarios',
  viewer: '3D Viewer',
  safety: 'Safety',
  'active-learning': 'Active Learning',
  settings: 'Settings',
  profile: 'Profile',
};

// ============================================================================
// Component
// ============================================================================

export function Breadcrumbs({
  className,
  homeLabel = 'Home',
  separator = <ChevronRight className="h-4 w-4 text-muted-foreground" />,
}: BreadcrumbsProps) {
  const location = useLocation();
  const params = useParams();

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0) {
      return [];
    }

    const items: BreadcrumbItem[] = [];
    let currentPath = '';

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath += `/${segment}`;
      const isLast = i === pathSegments.length - 1;

      // Check if this is a dynamic segment (like scenario ID)
      const isDynamicSegment = Object.values(params).includes(segment);

      let label: string;
      if (isDynamicSegment) {
        // For dynamic segments, use a descriptive label based on parent
        const parentSegment = pathSegments[i - 1];
        if (parentSegment === 'scenarios') {
          label = `Scenario ${segment.slice(0, 8)}...`;
        } else if (parentSegment === 'viewer') {
          label = `View ${segment.slice(0, 8)}...`;
        } else {
          label = segment;
        }
      } else {
        label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      }

      items.push({
        label,
        href: currentPath,
        isCurrentPage: isLast,
      });
    }

    return items;
  }, [location.pathname, params]);

  // Don't show breadcrumbs on home/dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1.5">
        {/* Home Link */}
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label={homeLabel}
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        {/* Separator after home */}
        <li aria-hidden="true" className="flex items-center">
          {separator}
        </li>

        {/* Breadcrumb items */}
        {breadcrumbs.map((item, index) => (
          <li key={item.href} className="flex items-center gap-1.5">
            {item.isCurrentPage ? (
              <span
                className="font-medium text-foreground"
                aria-current="page"
              >
                {item.label}
              </span>
            ) : (
              <>
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
                {index < breadcrumbs.length - 1 && (
                  <span aria-hidden="true">{separator}</span>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ============================================================================
// Page Breadcrumbs Wrapper
// ============================================================================

interface PageBreadcrumbsProps {
  items?: { label: string; href?: string }[];
  currentPage: string;
  className?: string;
}

export function PageBreadcrumbs({ items = [], currentPage, className }: PageBreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm mb-4', className)}
    >
      <ol className="flex items-center gap-1.5">
        <li>
          <Link
            to="/dashboard"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>

        <li aria-hidden="true" className="flex items-center">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </li>

        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {item.href ? (
              <Link
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{item.label}</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </li>
        ))}

        <li>
          <span className="font-medium text-foreground" aria-current="page">
            {currentPage}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
