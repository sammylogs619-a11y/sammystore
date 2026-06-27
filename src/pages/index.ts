// Barrel exports for dashboard/authenticated pages
// These re-exports are non-breaking and intended to centralize imports for future refactors.
// Do NOT remove or rename files referenced here without updating imports in src/features/dashboard/routes.ts

export { default as Dashboard } from './Dashboard';
export { default as Accounts } from './Accounts';
export { default as Numbers } from './Numbers';
export { default as AllNumbers } from './AllNumbers';
export { default as Pricing } from './Pricing';
export { default as FundWallet } from './FundWallet';
export { default as ReferEarn } from './ReferEarn';
export { default as AccountHistory } from './AccountHistory';
export { default as NumbersHistory } from './NumbersHistory';
export { default as TransactionHistory } from './TransactionHistory';
export { default as ApiTools } from './ApiTools';
export { default as ContactUs } from './ContactUs';
