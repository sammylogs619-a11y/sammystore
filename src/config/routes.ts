import { DASHBOARD_ROUTES, DashboardRouteConfig } from '@/features/dashboard/routes';
import { MARKETPLACE_ROUTES, MarketplaceRouteConfig } from '@/features/marketplace/routes';
import { ADMIN_ROUTES, AdminRouteConfig } from '@/features/admin/routes';

export type AllRouteConfig = DashboardRouteConfig | MarketplaceRouteConfig | AdminRouteConfig;

/**
 * Unified route registry combining all features
 * - Dashboard: internal user/admin panel (sidebar layout)
 * - Marketplace: public e-commerce (public header layout)
 * - Admin: admin-only management panel (full-width layout)
 */
export const ALL_ROUTES: AllRouteConfig[] = [
  ...DASHBOARD_ROUTES,
  ...MARKETPLACE_ROUTES,
  ...ADMIN_ROUTES,
];

// ✅ FIX: Export ROUTES as an alias so App.tsx can import it correctly
export const ROUTES = ALL_ROUTES;

/**
 * Get total route count across all features
 */
export const getTotalRouteCount = (): number => ALL_ROUTES.length;

/**
 * Export feature-specific routes for direct access if needed
 */
export { DASHBOARD_ROUTES, MARKETPLACE_ROUTES, ADMIN_ROUTES };
export { useRouteLayout } from './useRouteLayout';
