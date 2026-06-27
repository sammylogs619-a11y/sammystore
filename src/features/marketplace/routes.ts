import {
  HomePage,
  AuthPage,
  DashboardPage,
  ProductsPage,
  ProductDetailPage,
  OrdersPage,
  WalletPage,
  AdminPage,
  BlogPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
  AboutPage,
  CategoryPage,
  ResetPasswordPage
} from '@/routes';
import { ReactNode } from 'react';

export interface MarketplaceRouteConfig {
  path: string;
  component: ReactNode;
  label: string;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  isPublic?: boolean;
}

export const MARKETPLACE_ROUTES: MarketplaceRouteConfig[] = [
  // Public routes
  { path: '/', component: HomePage, label: 'Home', isPublic: true },
  { path: '/products', component: ProductsPage, label: 'Products', isPublic: true },
  { path: '/products/:slug', component: ProductDetailPage, label: 'Product Detail', isPublic: true },
  { path: '/blog', component: BlogPage, label: 'Blog', isPublic: true },
  { path: '/contact', component: ContactPage, label: 'Contact', isPublic: true },
  { path: '/privacy', component: PrivacyPage, label: 'Privacy', isPublic: true },
  { path: '/terms', component: TermsPage, label: 'Terms', isPublic: true },
  { path: '/about', component: AboutPage, label: 'About', isPublic: true },
  { path: '/category/:slug', component: CategoryPage, label: 'Category', isPublic: true },
  { path: '/reset-password', component: ResetPasswordPage, label: 'Reset Password', isPublic: true },
  
  // Auth routes
  { path: '/auth', component: AuthPage, label: 'Login', isPublic: true },
  
  // Protected routes
  { path: '/dashboard', component: DashboardPage, label: 'Dashboard', requiresAuth: true },
  { path: '/wallet', component: WalletPage, label: 'Wallet', requiresAuth: true },
  { path: '/orders', component: OrdersPage, label: 'Orders', requiresAuth: true },
  
  // Admin routes
  { path: '/admin', component: AdminPage, label: 'Admin Panel', requiresAuth: true, requiresAdmin: true },
];

export const getMarketplaceRouteByPath = (path: string): MarketplaceRouteConfig | undefined => {
  return MARKETPLACE_ROUTES.find(r => r.path === path);
};
