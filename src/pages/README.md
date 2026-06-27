# src/pages

Purpose

This directory contains authenticated/dashboard page components used by the internal user interface (dashboard, accounts, numbers, pricing, wallet, histories, API tools, contact us, etc.).

Where these files are imported

- The dashboard feature imports these pages from `src/features/dashboard/routes.ts` using imports like `import Dashboard from '@/pages/Dashboard'`.

Guidelines

- Keep authenticated/internal pages here.
- Do NOT rename or remove files referenced by `src/features/dashboard/routes.ts` without updating those imports.
- If you add a new dashboard page, export it here (or add a barrel file) and add the route in `src/features/dashboard/routes.ts`.

Notes

- This folder is intentionally separate from `src/routes` which contains public marketplace pages.
- Consider adding a barrel (`index.ts`) if you want to centralize exports for easier refactors later.
