import { DASHBOARD_ROUTES, DashboardRouteConfig } from '@/features/dashboard/routes';
import { MARKETPLACE_ROUTES, MarketplaceRouteConfig } from '@/features/marketplace/routes';
import { ADMIN_ROUTES, AdminRouteConfig } from '@/features/admin/routes';

/**
 * Root Route Aggregator
 * 
 * This module serves as the central registry for all application routes.
 * It aggregates routes from three main features:
 * 1. Dashboard - Internal user panel with sidebar layout
 * 2. Marketplace - Public e-commerce storefront
 * 3. Admin - Admin-only management panel
 * 
 * The aggregator provides:
 * - Unified route registry (ALL_ROUTES)
 * - Route lookup utilities
 * - Layout determination functions
 * - Route metrics and analysis
 */

export type AllRouteConfig = DashboardRouteConfig | MarketplaceRouteConfig | AdminRouteConfig;

/**
 * Feature types for route classification
 */
export type FeatureType = 'dashboard' | 'marketplace' | 'admin';

/**
 * Layout types that can be applied to routes
 */
export type LayoutType = 'dashboard' | 'admin' | 'marketplace';

/**
 * Extended route metadata for routing decisions
 */
export interface RouteMetadata {
  path: string;
  feature: FeatureType;
  layout: LayoutType;
  requiresAuth: boolean;
  requiresAdmin: boolean;
  label: string;
}

/**
 * Unified route registry - the single source of truth for all routes
 * Routes are organized by feature but presented as a unified array
 */
export const ALL_ROUTES: AllRouteConfig[] = [
  ...MARKETPLACE_ROUTES,  // Public marketplace routes first (includes auth routes)
  ...DASHBOARD_ROUTES,    // Protected user dashboard routes
  ...ADMIN_ROUTES,        // Protected admin routes
];

/**
 * Route metadata mapping for quick lookup and layout determination
 * Maps route paths to their metadata for efficient access
 */
const ROUTE_METADATA: Map<string, RouteMetadata> = new Map();

// Initialize route metadata
function initializeRouteMetadata() {
  // Marketplace routes
  MARKETPLACE_ROUTES.forEach(route => {
    ROUTE_METADATA.set(route.path, {
      path: route.path,
      feature: 'marketplace',
      layout: 'marketplace',
      requiresAuth: route.requiresAuth || false,
      requiresAdmin: route.requiresAdmin || false,
      label: route.label,
    });
  });

  // Dashboard routes
  DASHBOARD_ROUTES.forEach(route => {
    ROUTE_METADATA.set(route.path, {
      path: route.path,
      feature: 'dashboard',
      layout: 'dashboard',
      requiresAuth: route.requiresAuth || false,
      requiresAdmin: false,
      label: route.label,
    });
  });

  // Admin routes
  ADMIN_ROUTES.forEach(route => {
    ROUTE_METADATA.set(route.path, {
      path: route.path,
      feature: 'admin',
      layout: 'admin',
      requiresAuth: route.requiresAuth || false,
      requiresAdmin: route.requiresAdmin || false,
      label: route.label,
    });
  });
}

// Initialize on module load
initializeRouteMetadata();

/**
 * Get route metadata by path
 * @param path - The route path to look up
 * @returns RouteMetadata if found, undefined otherwise
 */
export function getRouteMetadata(path: string): RouteMetadata | undefined {
  return ROUTE_METADATA.get(path);
}

/**
 * Determine the appropriate layout for a given path
 * @param path - The current pathname
 * @returns The layout type to use for rendering
 */
export function getLayoutType(path: string): LayoutType {
  const metadata = getRouteMetadata(path);
  
  if (metadata) {
    return metadata.layout;
  }

  // Route pattern matching for dynamic routes
  if (path.startsWith('/dashboard') || path.startsWith('/accounts') || path.startsWith('/numbers') || 
      path.startsWith('/pricing') || path.startsWith('/fund') || path.startsWith('/refer') ||
      path.startsWith('/accounthistory') || path.startsWith('/numbershistory') || 
      path.startsWith('/txhistory') || path.startsWith('/api') || path.startsWith('/contact')) {
    return 'dashboard';
  }

  if (path.startsWith('/admin')) {
    return 'admin';
  }

  // Default to marketplace
  return 'marketplace';
}

/**
 * Check if a route requires authentication
 * @param path - The route path
 * @returns True if authentication is required
 */
export function requiresAuthentication(path: string): boolean {
  const metadata = getRouteMetadata(path);
  return metadata?.requiresAuth || false;
}

/**
 * Check if a route requires admin privileges
 * @param path - The route path
 * @returns True if admin privileges are required
 */
export function requiresAdminAccess(path: string): boolean {
  const metadata = getRouteMetadata(path);
  return metadata?.requiresAdmin || false;
}

/**
 * Get the feature that a route belongs to
 * @param path - The route path
 * @returns The feature type (dashboard, marketplace, or admin)
 */
export function getFeatureByPath(path: string): FeatureType {
  const metadata = getRouteMetadata(path);
  
  if (metadata) {
    return metadata.feature;
  }

  // Pattern-based fallback
  if (path.startsWith('/dashboard') || path.startsWith('/accounts') || path.startsWith('/numbers') || 
      path.startsWith('/pricing') || path.startsWith('/fund') || path.startsWith('/refer') ||
      path.startsWith('/accounthistory') || path.startsWith('/numbershistory') || 
      path.startsWith('/txhistory') || path.startsWith('/api') || path.startsWith('/contact')) {
    return 'dashboard';
  }

  if (path.startsWith('/admin')) {
    return 'admin';
  }

  return 'marketplace';
}

/**
 * Get a route by its path
 * @param path - The route path to find
 * @returns The route configuration if found
 */
export function getRouteByPath(path: string): AllRouteConfig | undefined {
  return ALL_ROUTES.find(route => route.path === path);
}

/**
 * Get all routes for a specific feature
 * @param feature - The feature type to filter by
 * @returns Array of routes belonging to that feature
 */
export function getRoutesByFeature(feature: FeatureType): AllRouteConfig[] {
  if (feature === 'dashboard') {
    return DASHBOARD_ROUTES;
  }
  if (feature === 'admin') {
    return ADMIN_ROUTES;
  }
  return MARKETPLACE_ROUTES;
}

/**
 * Get all public (non-authenticated) routes
 * @returns Array of public routes
 */
export function getPublicRoutes(): AllRouteConfig[] {
  return ALL_ROUTES.filter(route => {
    const metadata = getRouteMetadata(route.path);
    return !metadata?.requiresAuth;
  });
}

/**
 * Get all protected (authenticated) routes
 * @returns Array of protected routes
 */
export function getProtectedRoutes(): AllRouteConfig[] {
  return ALL_ROUTES.filter(route => {
    const metadata = getRouteMetadata(route.path);
    return metadata?.requiresAuth;
  });
}

/**
 * Get all admin-only routes
 * @returns Array of admin routes
 */
export function getAdminOnlyRoutes(): AllRouteConfig[] {
  return ALL_ROUTES.filter(route => {
    const metadata = getRouteMetadata(route.path);
    return metadata?.requiresAdmin;
  });
}

/**
 * Get route statistics
 * @returns Object containing route count information
 */
export function getRouteStats() {
  return {
    total: ALL_ROUTES.length,
    marketplace: MARKETPLACE_ROUTES.length,
    dashboard: DASHBOARD_ROUTES.length,
    admin: ADMIN_ROUTES.length,
    public: getPublicRoutes().length,
    protected: getProtectedRoutes().length,
    adminOnly: getAdminOnlyRoutes().length,
  };
}

/**
 * Validate a path exists in the route registry
 * @param path - The path to validate
 * @returns True if the path is a registered route
 */
export function isValidRoute(path: string): boolean {
  return getRouteByPath(path) !== undefined;
}

/**
 * Get breadcrumb trail for navigation
 * @param currentPath - The current route path
 * @returns Array of breadcrumb items with path and label
 */
export function getBreadcrumbTrail(currentPath: string): Array<{ path: string; label: string }> {
  const breadcrumbs: Array<{ path: string; label: string }> = [];
  
  // Add home/root
  breadcrumbs.push({ path: '/', label: 'Home' });

  // Add current route if not home
  if (currentPath !== '/') {
    const route = getRouteByPath(currentPath);
    if (route) {
      breadcrumbs.push({ path: currentPath, label: route.label });
    }
  }

  return breadcrumbs;
}

/**
 * Find similar routes for suggestions/redirects
 * Useful for handling typos or similar route names
 * @param path - The path to search for similar routes
 * @param limit - Maximum number of suggestions to return
 * @returns Array of similar route paths
 */
export function findSimilarRoutes(path: string, limit: number = 3): string[] {
  const searchTerm = path.toLowerCase();
  return ALL_ROUTES
    .filter(route => route.path.toLowerCase().includes(searchTerm))
    .slice(0, limit)
    .map(route => route.path);
}

/**
 * Export utility to check if a route matches a pattern
 * @param pattern - Route pattern (supports wildcards like /admin/*)
 * @param path - Actual path to test
 * @returns True if path matches pattern
 */
export function matchesPattern(pattern: string, path: string): boolean {
  if (pattern === '*') return true;
  if (pattern === path) return true;
  
  // Handle wildcard patterns like /admin/*
  const regexPattern = pattern
    .replace(/\//g, '\\/')
    .replace(/\*/g, '.*');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

export default {
  ALL_ROUTES,
  ROUTE_METADATA,
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
};
