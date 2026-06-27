/**
 * Determines which layout to use based on the current path
 * @param path - Current URL path
 * @returns 'dashboard' | 'marketplace' | 'admin'
 */
export function useRouteLayout(path: string): 'dashboard' | 'marketplace' | 'admin' {
  // Admin routes
  if (path.startsWith('/admin')) {
    return 'admin';
  }

  // Dashboard routes
  if (
    path === '/' ||
    path.startsWith('/accounts') ||
    path.startsWith('/numbers') ||
    path.startsWith('/allnumbers') ||
    path.startsWith('/pricing') ||
    path.startsWith('/fund') ||
    path.startsWith('/refer') ||
    path.startsWith('/accounthistory') ||
    path.startsWith('/numbershistory') ||
    path.startsWith('/txhistory') ||
    path.startsWith('/api') ||
    path.startsWith('/contact')
  ) {
    return 'dashboard';
  }

  // Everything else is marketplace (public pages, products, auth, etc.)
  return 'marketplace';
}
