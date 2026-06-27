/**
 * Route Utilities
 *
 * Collection of helper functions for route management, navigation,
 * and route-related operations throughout the application.
 *
 * This module complements rootRoutes.ts and provides practical utilities
 * for common routing scenarios.
 */

import { AllRouteConfig, FeatureType, LayoutType } from '@/config/rootRoutes';

/**
 * Navigate to a route with optional history state
 * Usage: navigateToRoute('/dashboard', { from: 'home' })
 */
export function createNavigationState(
  path: string,
  metadata?: Record<string, any>
): { pathname: string; state: Record<string, any> } {
  return {
    pathname: path,
    state: {
      navigatedAt: new Date().toISOString(),
      ...metadata,
    },
  };
}

/**
 * Build query string from object
 * Usage: buildQueryString({ page: 1, sort: 'name' })
 * Result: '?page=1&sort=name'
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Parse query string to object
 * Usage: parseQueryString('?page=1&sort=name')
 * Result: { page: '1', sort: 'name' }
 */
export function parseQueryString(search: string): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(search);
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}

/**
 * Build URL with path and query parameters
 * Usage: buildUrl('/products', { category: 'electronics', page: 2 })
 * Result: '/products?category=electronics&page=2'
 */
export function buildUrl(
  path: string,
  params?: Record<string, any>
): string {
  const query = params ? buildQueryString(params) : '';
  return `${path}${query}`;
}

/**
 * Extract path segments from URL
 * Usage: getPathSegments('/dashboard/users/123')
 * Result: ['dashboard', 'users', '123']
 */
export function getPathSegments(path: string): string[] {
  return path
    .split('/')
    .filter(segment => segment.length > 0);
}

/**
 * Get the parent path from a route path
 * Usage: getParentPath('/dashboard/users/123')
 * Result: '/dashboard/users'
 */
export function getParentPath(path: string): string {
  const segments = getPathSegments(path);
  if (segments.length <= 1) return '/';
  
  segments.pop();
  return '/' + segments.join('/');
}

/**
 * Get the root path (first segment) of a route
 * Usage: getRootPath('/dashboard/users/123')
 * Result: '/dashboard'
 */
export function getRootPath(path: string): string {
  const segments = getPathSegments(path);
  return segments.length > 0 ? '/' + segments[0] : '/';
}

/**
 * Check if a path is nested under a parent path
 * Usage: isNestedUnder('/admin/users/123', '/admin')
 * Result: true
 */
export function isNestedUnder(path: string, parentPath: string): boolean {
  const normalizedParent = parentPath.endsWith('/') 
    ? parentPath.slice(0, -1) 
    : parentPath;
  
  return path.startsWith(normalizedParent + '/') || path === normalizedParent;
}

/**
 * Check if current path matches any of the provided patterns
 * Usage: matchesAnyPattern('/admin/users', ['/admin/*', '/dashboard/*'])
 * Result: true
 */
export function matchesAnyPattern(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    const regex = new RegExp(
      `^${pattern.replace(/\*/g, '.*').replace(/\//g, '\\/')}$`
    );
    return regex.test(path);
  });
}

/**
 * Generate breadcrumb items from path
 * Usage: generateBreadcrumbs('/admin/users/123', labelMap)
 * Result: [{ path: '/', label: 'Home' }, { path: '/admin', label: 'Admin' }, ...]
 */
export function generateBreadcrumbs(
  path: string,
  labelMap?: Record<string, string>
): Array<{ path: string; label: string }> {
  const breadcrumbs: Array<{ path: string; label: string }> = [];
  const segments = getPathSegments(path);
  
  breadcrumbs.push({ path: '/', label: 'Home' });
  
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += '/' + segment;
    
    // Try to find label from labelMap, otherwise use segment
    let label = labelMap?.[currentPath] || labelMap?.[segment];
    
    if (!label) {
      // Generate label from segment (capitalize, replace hyphens)
      label = segment
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    }
    
    // Don't add if it's the last segment and current path length > 1
    if (index < segments.length - 1 || segments.length === 1) {
      breadcrumbs.push({ path: currentPath, label });
    }
  });

  return breadcrumbs;
}

/**
 * Create a route link with proper formatting
 * Usage: formatRouteLink('/dashboard', { active: true })
 * Result: '/dashboard'
 */
export function formatRouteLink(
  path: string,
  options?: { trailing?: boolean; query?: Record<string, any> }
): string {
  let link = path;
  
  // Add trailing slash if needed
  if (options?.trailing && !link.endsWith('/')) {
    link += '/';
  }
  
  // Add query parameters
  if (options?.query) {
    link += buildQueryString(options.query);
  }

  return link;
}

/**
 * Sort routes by path depth (useful for route matching)
 * Deeper paths are sorted first to ensure correct matching
 * Usage: sortRoutesByDepth(routes)
 */
export function sortRoutesByDepth(routes: AllRouteConfig[]): AllRouteConfig[] {
  return [...routes].sort((a, b) => {
    const aDepth = getPathSegments(a.path).length;
    const bDepth = getPathSegments(b.path).length;
    return bDepth - aDepth; // Descending order (deeper first)
  });
}

/**
 * Group routes by feature
 * Usage: groupRoutesByFeature(routes)
 * Result: { dashboard: [...], marketplace: [...], admin: [...] }
 */
export function groupRoutesByFeature(routes: AllRouteConfig[]): Record<string, AllRouteConfig[]> {
  const grouped: Record<string, AllRouteConfig[]> = {
    dashboard: [],
    marketplace: [],
    admin: [],
  };

  routes.forEach(route => {
    if ('section' in route) {
      grouped.dashboard.push(route);
    } else if ('requiresAdmin' in route && route.requiresAdmin) {
      grouped.admin.push(route);
    } else {
      grouped.marketplace.push(route);
    }
  });

  return grouped;
}

/**
 * Find routes matching a search query
 * Searches route paths and labels
 * Usage: searchRoutes(routes, 'dashboard')
 */
export function searchRoutes(
  routes: AllRouteConfig[],
  query: string
): AllRouteConfig[] {
  const lowerQuery = query.toLowerCase();
  
  return routes.filter(route =>
    route.path.toLowerCase().includes(lowerQuery) ||
    route.label.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Create a URL-friendly slug from text
 * Usage: createSlug('User Dashboard')
 * Result: 'user-dashboard'
 */
export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-');
}

/**
 * Validate if a path follows route naming conventions
 * Routes should start with / and contain lowercase letters, numbers, hyphens
 * Usage: isValidRoutePath('/user-dashboard')
 * Result: true
 */
export function isValidRoutePath(path: string): boolean {
  const routePathRegex = /^\/[a-z0-9\-/:$._?]*$/;
  return routePathRegex.test(path);
}

/**
 * Get route parameters from path and pattern
 * Usage: getRouteParams('/users/123', '/users/:id')
 * Result: { id: '123' }
 */
export function getRouteParams(
  path: string,
  pattern: string
): Record<string, string> {
  const params: Record<string, string> = {};
  
  const pathSegments = getPathSegments(path);
  const patternSegments = getPathSegments(pattern);

  patternSegments.forEach((segment, index) => {
    if (segment.startsWith(':')) {
      const paramName = segment.slice(1);
      params[paramName] = pathSegments[index] || '';
    }
  });

  return params;
}

/**
 * Create a navigation history tracker
 * Usage: const history = createNavigationHistory(); history.push('/page1')
 */
export class NavigationHistory {
  private history: string[] = [];
  private maxSize: number = 50;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  push(path: string): void {
    if (this.history[this.history.length - 1] !== path) {
      this.history.push(path);
      
      if (this.history.length > this.maxSize) {
        this.history.shift();
      }
    }
  }

  get all(): string[] {
    return [...this.history];
  }

  get current(): string | undefined {
    return this.history[this.history.length - 1];
  }

  get previous(): string | undefined {
    return this.history[this.history.length - 2];
  }

  get length(): number {
    return this.history.length;
  }

  clear(): void {
    this.history = [];
  }

  contains(path: string): boolean {
    return this.history.includes(path);
  }
}

/**
 * Create a route matcher for complex route patterns
 * Usage: const matcher = createRouteMatcher('/users/:id/posts/:postId')
 *        matcher.test('/users/123/posts/456') // true
 */
export class RouteMatcher {
  private pattern: string;
  private regex: RegExp;

  constructor(pattern: string) {
    this.pattern = pattern;
    this.regex = this.createRegex(pattern);
  }

  private createRegex(pattern: string): RegExp {
    const regexPattern = pattern
      .replace(/\//g, '\\/')
      .replace(/:([^\s/]+)/g, '(?<$1>[^\\/]+)')
      .replace(/\*/g, '.*');

    return new RegExp(`^${regexPattern}$`);
  }

  test(path: string): boolean {
    return this.regex.test(path);
  }

  match(path: string): Record<string, string> | null {
    const result = this.regex.exec(path);
    
    if (!result) {
      return null;
    }

    return result.groups || {};
  }

  getPattern(): string {
    return this.pattern;
  }
}

/**
 * Debounce route navigation
 * Prevents multiple rapid navigations to the same route
 * Usage: const debouncedNav = debounceNavigation(navigate, 300)
 */
export function debounceNavigation(
  navigate: (path: string) => void,
  delay: number = 300
): (path: string) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastPath: string | null = null;

  return (path: string) => {
    if (lastPath === path) return; // Ignore if same path

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      navigate(path);
      lastPath = path;
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a route transition tracker
 * Useful for analytics or debugging
 * Usage: const tracker = createTransitionTracker()
 *        tracker.record('/page1', '/page2')
 */
export class RouteTransitionTracker {
  private transitions: Array<{
    from: string;
    to: string;
    timestamp: Date;
  }> = [];

  record(from: string, to: string): void {
    this.transitions.push({
      from,
      to,
      timestamp: new Date(),
    });
  }

  get all() {
    return [...this.transitions];
  }

  getTransitionCount(from: string, to: string): number {
    return this.transitions.filter(t => t.from === from && t.to === to).length;
  }

  getMostCommonTransition(): { from: string; to: string; count: number } | null {
    if (this.transitions.length === 0) return null;

    const transitionMap = new Map<string, number>();
    
    this.transitions.forEach(t => {
      const key = `${t.from}->${t.to}`;
      transitionMap.set(key, (transitionMap.get(key) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon: { from: string; to: string; count: number } | null = null;

    transitionMap.forEach((count, key) => {
      if (count > maxCount) {
        const [from, to] = key.split('->');
        maxCount = count;
        mostCommon = { from, to, count };
      }
    });

    return mostCommon;
  }

  clear(): void {
    this.transitions = [];
  }
}

/**
 * Resolve relative paths
 * Usage: resolvePath('/admin', '../dashboard')
 * Result: '/dashboard'
 */
export function resolvePath(base: string, relative: string): string {
  const baseSegments = getPathSegments(base);
  const relativeSegments = relative.split('/').filter(s => s);

  relativeSegments.forEach(segment => {
    if (segment === '..') {
      baseSegments.pop();
    } else if (segment !== '.') {
      baseSegments.push(segment);
    }
  });

  return '/' + baseSegments.join('/');
}

/**
 * Check if two paths are considered "similar"
 * Useful for suggestions or route highlighting
 * Usage: arePathsSimilar('/users', '/user-dashboard')
 */
export function arePathsSimilar(path1: string, path2: string): boolean {
  const seg1 = getPathSegments(path1);
  const seg2 = getPathSegments(path2);

  // Must have at least one segment in common
  const commonSegments = seg1.filter(s => seg2.includes(s));
  
  return commonSegments.length > 0 || 
         (seg1.length > 0 && seg2.length > 0 && seg1[0] === seg2[0]);
}

export default {
  createNavigationState,
  buildQueryString,
  parseQueryString,
  buildUrl,
  getPathSegments,
  getParentPath,
  getRootPath,
  isNestedUnder,
  matchesAnyPattern,
  generateBreadcrumbs,
  formatRouteLink,
  sortRoutesByDepth,
  groupRoutesByFeature,
  searchRoutes,
  createSlug,
  isValidRoutePath,
  getRouteParams,
  NavigationHistory,
  RouteMatcher,
  debounceNavigation,
  RouteTransitionTracker,
  resolvePath,
  arePathsSimilar,
};
