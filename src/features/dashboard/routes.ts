import Dashboard from '@/pages/Dashboard';
import Accounts from '@/pages/Accounts';
import Numbers from '@/pages/Numbers';
import AllNumbers from '@/pages/AllNumbers';
import Pricing from '@/pages/Pricing';
import FundWallet from '@/pages/FundWallet';
import ReferEarn from '@/pages/ReferEarn';
import AccountHistory from '@/pages/AccountHistory';
import NumbersHistory from '@/pages/NumbersHistory';
import TransactionHistory from '@/pages/TransactionHistory';
import ApiTools from '@/pages/ApiTools';
import ContactUs from '@/pages/ContactUs';
import { ReactNode } from 'react';

export type SectionType =
  | 'dashboard'
  | 'accounts'
  | 'numbers'
  | 'allnumbers'
  | 'pricing'
  | 'fund'
  | 'refer'
  | 'accounthistory'
  | 'numbershistory'
  | 'txhistory'
  | 'api'
  | 'contact';

export interface DashboardRouteConfig {
  path: string;
  section: SectionType;
  component: ReactNode;
  label: string;
  requiresAuth?: boolean;
}

export const DASHBOARD_ROUTES: DashboardRouteConfig[] = [
  { path: '/dashboard', section: 'dashboard', component: Dashboard, label: 'Dashboard', requiresAuth: true },
  { path: '/accounts', section: 'accounts', component: Accounts, label: 'Accounts', requiresAuth: true },
  { path: '/numbers', section: 'numbers', component: Numbers, label: 'Numbers', requiresAuth: true },
  { path: '/allnumbers', section: 'allnumbers', component: AllNumbers, label: 'All Numbers', requiresAuth: true },
  { path: '/pricing', section: 'pricing', component: Pricing, label: 'Pricing', requiresAuth: true },
  { path: '/fund', section: 'fund', component: FundWallet, label: 'Fund Wallet', requiresAuth: true },
  { path: '/refer', section: 'refer', component: ReferEarn, label: 'Refer & Earn', requiresAuth: true },
  { path: '/accounthistory', section: 'accounthistory', component: AccountHistory, label: 'Account History', requiresAuth: true },
  { path: '/numbershistory', section: 'numbershistory', component: NumbersHistory, label: 'Numbers History', requiresAuth: true },
  { path: '/txhistory', section: 'txhistory', component: TransactionHistory, label: 'Transaction History', requiresAuth: true },
  { path: '/api', section: 'api', component: ApiTools, label: 'API Tools', requiresAuth: true },
  { path: '/contact', section: 'contact', component: ContactUs, label: 'Contact Us', requiresAuth: true },
];

export const getDashboardRouteByPath = (path: string): DashboardRouteConfig | undefined => {
  let match = DASHBOARD_ROUTES.find(r => r.path === path);
  if (match) return match;
  match = DASHBOARD_ROUTES.find(r => path.startsWith(r.path));
  return match;
};

export const getDashboardRouteBySection = (section: SectionType): DashboardRouteConfig | undefined => {
  return DASHBOARD_ROUTES.find(r => r.section === section);
};

export const getSectionFromPath = (path: string): SectionType => {
  const route = getDashboardRouteByPath(path);
  return route?.section ?? 'dashboard';
};
