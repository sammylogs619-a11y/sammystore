import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useRouteConfig } from '@/hooks/useRouteConfig';

/**
 * Route Guard Components
 *
 * Provides reusable components for protecting routes and controlling access
 * based on authentication and authorization status.
 *
 * These components work in conjunction with:
 * - Root Route Aggregator (rootRoutes.ts)
 * - useRouteConfig hook
 * - Auth context from useAuth hook
 */

/**
 * Loading state component shown while auth is being verified
 */
interface LoadingProps {
  message?: string;
}

export function RouteGuardLoading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block">
          <div className="h-8 w-8 border-4 border-brand-navy border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-muted-foreground mt-4">{message}</p>
      </div>
    </div>
  );
}

/**
 * Fallback component shown when authentication is required
 */
interface AuthRequiredProps {
  message?: string;
  redirectPath?: string;
}

export function AuthRequired({ 
  message = 'Authentication Required',
  redirectPath = '/auth'
}: AuthRequiredProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-navy mb-2">{message}</h2>
        <p className="text-muted-foreground mb-6">
          Please log in to access this page.
        </p>
        <a
          href={redirectPath}
          className="inline-block px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-opacity-90 transition-all"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}

/**
 * Fallback component shown when admin access is required
 */
interface AdminRequiredProps {
  message?: string;
}

export function AdminRequired({ 
  message = 'Admin Access Required'
}: AdminRequiredProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center max-w-md">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 5v1m7-13a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-brand-navy mb-2">{message}</h2>
        <p className="text-muted-foreground mb-6">
          You do not have permission to access this page. Admin privileges are required.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-opacity-90 transition-all"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute Component
 *
 * Guards a route to ensure the user is authenticated.
 * If not authenticated, redirects to login or shows fallback.
 *
 * @example
 * ```tsx
 * <ProtectedRoute>
 *   <DashboardPage />
 * </ProtectedRoute>
 * ```
 */
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  fallback,
  redirectTo = '/auth',
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteGuardLoading message="Verifying your credentials..." />;
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * AdminRoute Component
 *
 * Guards a route to ensure the user has admin privileges.
 * If not admin, shows admin required or redirects.
 *
 * @example
 * ```tsx
 * <AdminRoute>
 *   <AdminPanel />
 * </AdminRoute>
 * ```
 */
interface AdminRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function AdminRoute({
  children,
  fallback,
  redirectTo = '/auth',
}: AdminRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <RouteGuardLoading message="Verifying admin privileges..." />;
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={redirectTo} replace />;
  }

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AdminRequired />;
  }

  return <>{children}</>;
}

/**
 * PublicRoute Component
 *
 * Renders content that should only be visible to unauthenticated users.
 * If user is authenticated, shows alternative content or redirects.
 *
 * @example
 * ```tsx
 * <PublicRoute redirectTo="/dashboard" when="authenticated">
 *   <LoginPage />
 * </PublicRoute>
 * ```
 */
interface PublicRouteProps {
  children: ReactNode;
  when?: 'authenticated' | 'admin';
  redirectTo?: string;
  fallback?: ReactNode;
}

export function PublicRoute({
  children,
  when = 'authenticated',
  redirectTo = '/dashboard',
  fallback,
}: PublicRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <RouteGuardLoading />;
  }

  // If checking for admin and user is admin, redirect
  if (when === 'admin' && user && isAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  // If checking for authentication and user exists, redirect
  if (when === 'authenticated' && user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (fallback && ((when === 'admin' && isAdmin) || (when === 'authenticated' && user))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * ConditionalRoute Component
 *
 * Renders different content based on authentication/authorization status.
 * More flexible than other guard components.
 *
 * @example
 * ```tsx
 * <ConditionalRoute
 *   authenticated={<Dashboard />}
 *   unauthenticated={<Login />}
 *   admin={<AdminPanel />}
 *   loading={<Spinner />}
 * />
 * ```
 */
interface ConditionalRouteProps {
  authenticated?: ReactNode;
  unauthenticated?: ReactNode;
  admin?: ReactNode;
  loading?: ReactNode;
}

export function ConditionalRoute({
  authenticated,
  unauthenticated,
  admin,
  loading: loadingComponent,
}: ConditionalRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return loadingComponent || <RouteGuardLoading />;
  }

  if (isAdmin && admin) {
    return <>{admin}</>;
  }

  if (user && authenticated) {
    return <>{authenticated}</>;
  }

  if (!user && unauthenticated) {
    return <>{unauthenticated}</>;
  }

  // Fallback: show unauthenticated or authenticated based on user state
  if (!user) {
    return unauthenticated || null;
  }

  return authenticated || null;
}

/**
 * FeatureRoute Component
 *
 * Guards a route based on the current feature and access level.
 * Works with the root route aggregator.
 *
 * @example
 * ```tsx
 * <FeatureRoute feature="admin" requiresAdmin>
 *   <AdminContent />
 * </FeatureRoute>
 * ```
 */
interface FeatureRouteProps {
  children: ReactNode;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  fallback?: ReactNode;
  authRedirectTo?: string;
  adminRedirectTo?: string;
}

export function FeatureRoute({
  children,
  requiresAuth = false,
  requiresAdmin = false,
  fallback,
  authRedirectTo = '/auth',
  adminRedirectTo = '/auth',
}: FeatureRouteProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <RouteGuardLoading />;
  }

  // Check authentication requirement
  if (requiresAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={authRedirectTo} replace />;
  }

  // Check admin requirement
  if (requiresAdmin && !isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to={adminRedirectTo} replace />;
  }

  return <>{children}</>;
}

/**
 * RoleBasedRoute Component
 *
 * Advanced component for role-based access control.
 * Supports multiple roles and custom permission checks.
 *
 * @example
 * ```tsx
 * <RoleBasedRoute
 *   allowedRoles={['admin', 'moderator']}
 *   userRole={currentUserRole}
 * >
 *   <ProtectedContent />
 * </RoleBasedRoute>
 * ```
 */
interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
  userRole?: string;
  permissionCheck?: (role?: string) => boolean;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function RoleBasedRoute({
  children,
  allowedRoles,
  userRole,
  permissionCheck,
  fallback,
  redirectTo = '/auth',
}: RoleBasedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <RouteGuardLoading />;
  }

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  // Use custom permission check if provided
  if (permissionCheck) {
    if (!permissionCheck(userRole)) {
      if (fallback) {
        return <>{fallback}</>;
      }
      return <AdminRequired message="Access Denied" />;
    }
    return <>{children}</>;
  }

  // Use role-based check
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <AdminRequired message="Access Denied" />;
  }

  return <>{children}</>;
}

/**
 * RouteGuard Hook
 *
 * Custom hook for programmatic route guarding in components.
 * Returns guard status and utilities.
 *
 * @example
 * ```tsx
 * const guard = useRouteGuard();
 * if (!guard.isAuthenticated) {
 *   return <AuthRequired />;
 * }
 * ```
 */
export function useRouteGuard() {
  const { user, loading, isAdmin } = useAuth();
  const { currentPath, requiresAuth, requiresAdmin } = useRouteConfig();

  return {
    isLoading: loading,
    isAuthenticated: !!user,
    isAdmin,
    currentPath,
    routeRequiresAuth: requiresAuth,
    routeRequiresAdmin: requiresAdmin,
    canAccess: !requiresAuth || !!user,
    canAccessAdmin: !requiresAdmin || (!!user && isAdmin),
    user,
  };
}

export default {
  ProtectedRoute,
  AdminRoute,
  PublicRoute,
  ConditionalRoute,
  FeatureRoute,
  RoleBasedRoute,
  RouteGuardLoading,
  AuthRequired,
  AdminRequired,
  useRouteGuard,
};
