import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useCallback } from 'react';
import {
  getRouteMetadata,
  getLayoutType,
  requiresAuthentication,
  requiresAdminAccess,
  getFeatureByPath,
  getRouteByPath,
  getRoutesByFeature,
  getPublicRoutes,
  getProtectedRoutes,
  getAdminOnlyRoutes,
  getRouteStats,
  isValidRoute,
  getBreadcrumbTrail,
  findSimilarRoutes,
  matchesPattern,
  ALL_ROUTES,
  RouteMetadata,
  FeatureType,
  LayoutType,
  AllRouteConfig,
} from '@/config/rootRoutes';

/**
 * useRouteConfig Hook
 *
 * Provides convenient access to route configuration and utilities within components.
 * This hook encapsulates all route-related operations and provides a clean API
 * for consuming components.
 *
 * Usage:
 * ```tsx
 * const route = useRouteConfig();
 * route.navigate('/dashboard');
 * if (route.requiresAdmin) { ... }
 * const breadcrumbs = route.breadcrumbs;
 * ```
 */
export function useRouteConfig() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  /**
   * Get metadata for the current route
   */
  const currentRouteMetadata = useMemo(
    () => getRouteMetadata(currentPath),
    [currentPath]
  );

  /**
   * Get metadata for a specific path
   */
  const getMetadata = useCallback(
    (path: string) => getRouteMetadata(path),
    []
  );

  /**
   * Get the layout type for the current route
   */
  const layoutType = useMemo(() => getLayoutType(currentPath), [currentPath]);

  /**
   * Get the layout type for a specific path
   */
  const getLayout = useCallback(
    (path: string) => getLayoutType(path),
    []
  );

  /**
   * Check if the current route requires authentication
   */
  const requiresAuth = useMemo(
    () => requiresAuthentication(currentPath),
    [currentPath]
  );

  /**
   * Check if a specific path requires authentication
   */
  const pathRequiresAuth = useCallback(
    (path: string) => requiresAuthentication(path),
    []
  );

  /**
   * Check if the current route requires admin access
   */
  const requiresAdmin = useMemo(
    () => requiresAdminAccess(currentPath),
    [currentPath]
  );

  /**
   * Check if a specific path requires admin access
   */
  const pathRequiresAdmin = useCallback(
    (path: string) => requiresAdminAccess(path),
    []
  );

  /**
   * Get the feature for the current route
   */
  const feature = useMemo(
    () => getFeatureByPath(currentPath),
    [currentPath]
  );

  /**
   * Get the feature for a specific path
   */
  const getFeature = useCallback(
    (path: string) => getFeatureByPath(path),
    []
  );

  /**
   * Get the current route
   */
  const currentRoute = useMemo(
    () => getRouteByPath(currentPath),
    [currentPath]
  );

  /**
   * Get a specific route by path
   */
  const getRoute = useCallback(
    (path: string) => getRouteByPath(path),
    []
  );

  /**
   * Get all routes for a specific feature
   */
  const getRoutesByFeatureType = useCallback(
    (featureType: FeatureType) => getRoutesByFeature(featureType),
    []
  );

  /**
   * Get all public routes
   */
  const publicRoutes = useMemo(() => getPublicRoutes(), []);

  /**
   * Get all protected routes
   */
  const protectedRoutes = useMemo(() => getProtectedRoutes(), []);

  /**
   * Get all admin-only routes
   */
  const adminRoutes = useMemo(() => getAdminOnlyRoutes(), []);

  /**
   * Get route statistics
   */
  const routeStats = useMemo(() => getRouteStats(), []);

  /**
   * Check if the current path is a valid registered route
   */
  const isCurrentPathValid = useMemo(
    () => isValidRoute(currentPath),
    [currentPath]
  );

  /**
   * Check if a specific path is a valid registered route
   */
  const isPathValid = useCallback(
    (path: string) => isValidRoute(path),
    []
  );

  /**
   * Get breadcrumb trail for the current route
   */
  const breadcrumbs = useMemo(
    () => getBreadcrumbTrail(currentPath),
    [currentPath]
  );

  /**
   * Get breadcrumb trail for a specific path
   */
  const getBreadcrumbs = useCallback(
    (path: string) => getBreadcrumbTrail(path),
    []
  );

  /**
   * Find similar routes for the current path
   */
  const similarRoutes = useCallback(
    (limit?: number) => findSimilarRoutes(currentPath, limit),
    [currentPath]
  );

  /**
   * Find similar routes for a specific path
   */
  const findSimilar = useCallback(
    (path: string, limit?: number) => findSimilarRoutes(path, limit),
    []
  );

  /**
   * Check if current path matches a pattern
   */
  const isCurrentPathMatching = useCallback(
    (pattern: string) => matchesPattern(pattern, currentPath),
    [currentPath]
  );

  /**
   * Check if a specific path matches a pattern
   */
  const isPathMatching = useCallback(
    (pattern: string, path: string) => matchesPattern(pattern, path),
    []
  );

  /**
   * Navigate to a route with optional state
   */
  const navigateTo = useCallback(
    (path: string, state?: any) => {
      navigate(path, { state });
    },
    [navigate]
  );

  /**
   * Navigate to a route by feature
   * Navigates to the first route of the specified feature
   */
  const navigateToFeature = useCallback(
    (featureType: FeatureType) => {
      const routes = getRoutesByFeature(featureType);
      if (routes.length > 0) {
        navigate(routes[0].path);
      }
    },
    [navigate]
  );

  /**
   * Go back to previous route
   */
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  /**
   * Go to home page
   */
  const goHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  /**
   * Check if we're on a specific route
   */
  const isOn = useCallback(
    (path: string) => currentPath === path,
    [currentPath]
  );

  /**
   * Check if we're on any route matching a pattern
   */
  const isOnPattern = useCallback(
    (pattern: string) => matchesPattern(pattern, currentPath),
    [currentPath]
  );

  /**
   * Get the label for the current route
   */
  const currentLabel = useMemo(
    () => currentRouteMetadata?.label || 'Unknown',
    [currentRouteMetadata]
  );

  /**
   * Get the label for a specific path
   */
  const getLabel = useCallback(
    (path: string) => {
      const meta = getRouteMetadata(path);
      return meta?.label || 'Unknown';
    },
    []
  );

  /**
   * Get all routes
   */
  const allRoutes = useMemo(() => ALL_ROUTES, []);

  return {
    // Current path info
    currentPath,
    currentRoute,
    currentRouteMetadata,
    currentLabel,
    feature,
    layoutType,
    requiresAuth,
    requiresAdmin,
    isCurrentPathValid,
    breadcrumbs,

    // Metadata getters
    getMetadata,
    getRoute,
    getLabel,

    // Feature/Layout queries
    getLayout,
    getFeature,
    getRoutesByFeatureType,

    // Auth/Admin checks
    pathRequiresAuth,
    pathRequiresAdmin,

    // Route collections
    allRoutes,
    publicRoutes,
    protectedRoutes,
    adminRoutes,
    routeStats,

    // Path validation
    isPathValid,
    isCurrentPathMatching,
    isPathMatching,

    // Breadcrumb trails
    getBreadcrumbs,
    similarRoutes,
    findSimilar,

    // Navigation
    navigateTo,
    navigateToFeature,
    goBack,
    goHome,
    isOn,
    isOnPattern,
  };
}

/**
 * Hook to get only the current route's access requirements
 * Useful for conditional rendering based on auth/admin status
 */
export function useRouteRequirements() {
  const { requiresAuth, requiresAdmin, feature, layoutType } = useRouteConfig();

  return { requiresAuth, requiresAdmin, feature, layoutType };
}

/**
 * Hook to get navigation utilities
 * Useful when you only need navigation functions
 */
export function useRouteNavigation() {
  const { navigateTo, navigateToFeature, goBack, goHome } = useRouteConfig();

  return { navigateTo, navigateToFeature, goBack, goHome };
}

/**
 * Hook to get breadcrumb information
 * Useful for breadcrumb navigation components
 */
export function useRouteBreadcrumbs() {
  const { breadcrumbs, getBreadcrumbs, currentLabel } = useRouteConfig();

  return { breadcrumbs, getBreadcrumbs, currentLabel };
}

/**
 * Hook to get route statistics and metadata
 * Useful for analytics and route debugging
 */
export function useRouteMetrics() {
  const {
    routeStats,
    allRoutes,
    publicRoutes,
    protectedRoutes,
    adminRoutes,
    feature,
    currentPath,
  } = useRouteConfig();

  return {
    stats: routeStats,
    allRoutes,
    publicRoutes,
    protectedRoutes,
    adminRoutes,
    currentFeature: feature,
    currentPath,
  };
}

export default useRouteConfig;
