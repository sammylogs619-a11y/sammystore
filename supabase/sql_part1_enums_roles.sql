-- =====================================================================
-- PART 1 of 4 — Paste this first, run it, then paste Part 2
-- Extensions, Enums, user_roles table, has_role function
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('user','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tx_type AS ENUM ('credit','debit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tx_status AS ENUM ('pending','success','failed','reversed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_provider AS ENUM ('paystack','nowpayments','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('pending','completed','failed','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role    NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS roles_self_select       ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_delete ON public.user_roles;
CREATE POLICY roles_self_select       ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_update ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY user_roles_admin_delete ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
