import AdminPage from '@/routes/admin';
import { ComponentType } from 'react';

export interface AdminRouteConfig {
  path: string;
  component: ComponentType;
  label: string;
  requiresAuth: boolean;
  requiresAdmin: boolean;
}

export const ADMIN_ROUTES: AdminRouteConfig[] = [
  { path: '/admin', component: AdminPage, label: 'Admin Panel', requiresAuth: true, requiresAdmin: true },
];

export const getAdminRouteByPath = (path: string): AdminRouteConfig | undefined => {
  return ADMIN_ROUTES.find(r => r.path === path);
};
