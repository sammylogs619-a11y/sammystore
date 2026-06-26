// Barrel exports for public marketplace routes
// These re-exports are non-breaking and intended to centralize imports for future refactors.
// Do NOT remove or rename files referenced here without updating imports in src/features/marketplace/routes.ts

export { default as HomePage } from './index';
export { default as AuthPage } from './auth';
export { default as DashboardPage } from './dashboard';
export { default as ProductsPage } from './products';
export { default as ProductDetailPage } from './product-detail';
export { default as OrdersPage } from './orders';
export { default as WalletPage } from './wallet';
export { default as AdminPage } from './admin';
export { default as BlogPage } from './blog';
export { default as ContactPage } from './contact';
export { default as PrivacyPage } from './privacy';
export { default as TermsPage } from './terms';
export { default as AboutPage } from './about';
export { default as CategoryPage } from './category';
export { default as ResetPasswordPage } from './reset-password';
