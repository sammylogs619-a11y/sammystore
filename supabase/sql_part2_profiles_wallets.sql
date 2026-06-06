-- =====================================================================
-- PART 2 of 4 — Run AFTER Part 1 completes
-- profiles, wallets, wallet_transactions, payment_intents
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text,
  display_name text,
  avatar_url   text,
  phone        text,
  suspended    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_self_select  ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update  ON public.profiles;
DROP POLICY IF EXISTS profiles_self_insert  ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_select ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_self_select  ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_self_update  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_self_insert  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_admin_select ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_admin_update ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.wallets (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid          NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance    numeric(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency   text          NOT NULL DEFAULT 'NGN',
  created_at timestamptz   NOT NULL DEFAULT now(),
  updated_at timestamptz   NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL    ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_self_select ON public.wallets;
DROP POLICY IF EXISTS wallets_self_insert ON public.wallets;
CREATE POLICY wallets_self_select ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY wallets_self_insert ON public.wallets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     uuid            NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id       uuid            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          tx_type         NOT NULL,
  amount        numeric(14,2)   NOT NULL CHECK (amount > 0),
  balance_after numeric(14,2)   NOT NULL,
  status        tx_status       NOT NULL DEFAULT 'success',
  provider      payment_provider,
  reference     text            UNIQUE,
  description   text,
  metadata      jsonb           DEFAULT '{}'::jsonb,
  created_at    timestamptz     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id, created_at DESC);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL    ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tx_self_select ON public.wallet_transactions;
CREATE POLICY tx_self_select ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id         uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider   payment_provider NOT NULL,
  reference  text             NOT NULL UNIQUE,
  amount     numeric(14,2)    NOT NULL CHECK (amount > 0),
  currency   text             NOT NULL DEFAULT 'NGN',
  status     tx_status        NOT NULL DEFAULT 'pending',
  raw        jsonb            DEFAULT '{}'::jsonb,
  created_at timestamptz      NOT NULL DEFAULT now(),
  updated_at timestamptz      NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.payment_intents TO authenticated;
GRANT ALL             ON public.payment_intents TO service_role;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intents_self         ON public.payment_intents;
DROP POLICY IF EXISTS intents_self_insert  ON public.payment_intents;
DROP POLICY IF EXISTS intents_admin_update ON public.payment_intents;
CREATE POLICY intents_self         ON public.payment_intents FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY intents_self_insert  ON public.payment_intents FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY intents_admin_update ON public.payment_intents FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
