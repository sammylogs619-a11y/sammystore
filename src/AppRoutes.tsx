import { ReactNode } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/layout/DashboardLayout';
import { PublicLayout } from '@/features/marketplace/layout/PublicLayout';
import { AdminLayout } from '@/features/admin/layout/AdminLayout';
import { useAuth } from '@/lib/auth';
import {
  ALL_ROUTES,
  getLayoutType,
  requiresAuthentication,
  requiresAdminAccess,
  LayoutType,
} from '@/config/rootRoutes';

/**
 * AppRoutes Component
 *
 * Central routing orchestrator that uses the root route aggregator.
 * Handles:
 * - Route rendering with appropriate layout wrappers
 * - Authentication checks
 * - Admin access control
 * - Loading states
 *
 * This component works in conjunction with rootRoutes.ts which serves
 * as the single source of truth for all route configuration.
 */

/**
 * Determines which layout wrapper to use based on layout type
 * @param component - The route component to render
 * @param layoutType - The layout type (dashboard, admin, or marketplace)
 * @returns The wrapped component with the appropriate layout
 */
function getLayoutWrapper(component: ReactNode, layoutType: LayoutType): ReactNode {
  switch (layoutType) {
    case 'dashboard':
      return <DashboardLayout>{component}</DashboardLayout>;
    case 'admin':
      return <AdminLayout>{component}</AdminLayout>;
    case 'marketplace':
    default:
      return <PublicLayout>{component}</PublicLayout>;
  }
}

/**
 * Renders an authentication required message
 * @returns JSX element with auth required message
 */
function renderAuthRequired(): ReactNode {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-navy mb-2">Authentication Required</h2>
        <p className="text-muted-foreground">Please log in to access this page</p>
      </div>
    </div>
  );
}

/**
 * Renders an admin access required message
 * @returns JSX element with admin required message
 */
function renderAdminRequired(): ReactNode {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-brand-navy mb-2">Admin Access Required</h2>
        <p className="text-muted-foreground">You do not have permission to access this page</p>
      </div>
    </div>
  );
}

/**
 * Renders a loading state
 * @returns JSX element with loading indicator
 */
function renderLoading(): ReactNode {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block">
          <div className="h-8 w-8 border-4 border-brand-navy border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground mt-4">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Renders a 404 not found page
 * @returns JSX element with 404 message
 */
function render404(): ReactNode {
  return (
    <PublicLayout>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-brand-navy mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-opacity-90 transition-all"
          >
            Return to Home
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}

export default function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();

  // Determine layout type based on current path
  const layoutType = getLayoutType(location.pathname);

  return (
    <Routes>
      {ALL_ROUTES.map((route) => {
        const requiresAuth = requiresAuthentication(route.path);
        const requiresAdmin = requiresAdminAccess(route.path);

        /**
         * Route Rendering Logic:
         * 1. If loading auth state, render nothing (prevent layout shift)
         * 2. If route requires admin:
         *    - Not authenticated? Show auth required
         *    - Not admin? Show admin required
         *    - Otherwise, render with appropriate layout
         * 3. If route requires auth but not admin:
         *    - Not authenticated? Show auth required
         *    - Otherwise, render with appropriate layout
         * 4. Public routes render immediately with layout
         */

        if (requiresAdmin) {
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                loading ? (
                  renderLoading()
                ) : !user ? (
                  getLayoutWrapper(renderAuthRequired(), layoutType)
                ) : !isAdmin ? (
                  getLayoutWrapper(renderAdminRequired(), layoutType)
                ) : (
                  getLayoutWrapper(route.component, layoutType)
                )
              }
            />
          );
        }

        if (requiresAuth) {
          return (
            <Route
              key={route.path}
              path={route.path}
              element={
                loading ? (
                  renderLoading()
                ) : !user ? (
                  getLayoutWrapper(renderAuthRequired(), layoutType)
                ) : (
                  getLayoutWrapper(route.component, layoutType)
                )
              }
            />
          );
        }

        // Public routes
        return (
          <Route
            key={route.path}
            path={route.path}
            element={getLayoutWrapper(route.component, layoutType)}
          />
        );
      })}

      {/* 404 Fallback Route */}
      <Route path="*" element={render404()} />
    </Routes>
  );
}
