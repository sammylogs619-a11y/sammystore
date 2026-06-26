import HomePage from '@/routes/index';
import AuthPage from '@/routes/auth';
import ProductsPage from '@/routes/products';
import ProductDetailPage from '@/routes/product-detail';
import OrdersPage from '@/routes/orders';
import WalletPage from '@/routes/wallet';
import BlogPage from '@/routes/blog';
import ContactPage from '@/routes/contact';
import PrivacyPage from '@/routes/privacy';
import TermsPage from '@/routes/terms';
import AboutPage from '@/routes/about';
import CategoryPage from '@/routes/category';
import ResetPasswordPage from '@/routes/reset-password';
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
  
  // Protected routes (marketplace-specific)
  { path: '/wallet', component: WalletPage, label: 'Wallet', requiresAuth: true },
  { path: '/orders', component: OrdersPage, label: 'Orders', requiresAuth: true },
];

export const getMarketplaceRouteByPath = (path: string): MarketplaceRouteConfig | undefined => {
  return MARKETPLACE_ROUTES.find(r => r.path === path);
};
