-- =====================================================================
-- PART 3 of 4 — Run AFTER Part 2 completes
-- categories, products, orders, order_items, credentials, settings, logs
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.product_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  slug        text        NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL    ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cats_public_read ON public.product_categories;
DROP POLICY IF EXISTS cats_admin_all   ON public.product_categories;
CREATE POLICY cats_public_read ON public.product_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cats_admin_all   ON public.product_categories FOR ALL   TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.products (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid          REFERENCES public.product_categories(id) ON DELETE SET NULL,
  title       text          NOT NULL,
  slug        text          NOT NULL UNIQUE,
  description text,
  price       numeric(14,2) NOT NULL CHECK (price >= 0),
  currency    text          NOT NULL DEFAULT 'NGN',
  stock       int           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   text,
  published   boolean       NOT NULL DEFAULT false,
  metadata    jsonb         DEFAULT '{}'::jsonb,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(published, created_at DESC);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL    ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_public_read ON public.products;
DROP POLICY IF EXISTS products_admin_all   ON public.products;
CREATE POLICY products_public_read ON public.products FOR SELECT TO anon, authenticated USING (published = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY products_admin_all   ON public.products FOR ALL   TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.orders (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total        numeric(14,2) NOT NULL CHECK (total >= 0),
  currency     text         NOT NULL DEFAULT 'NGN',
  status       order_status NOT NULL DEFAULT 'pending',
  wallet_tx_id uuid         REFERENCES public.wallet_transactions(id),
  created_at   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id, created_at DESC);
GRANT SELECT ON public.orders TO authenticated;
GRANT ALL    ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_self         ON public.orders;
DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_self         ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.order_items (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid          NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id        uuid          REFERENCES public.products(id) ON DELETE SET NULL,
  title             text          NOT NULL,
  unit_price        numeric(14,2) NOT NULL,
  quantity          int           NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivered_payload text,
  created_at        timestamptz   NOT NULL DEFAULT now()
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL    ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_items_self ON public.order_items;
CREATE POLICY order_items_self ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')))
);

CREATE TABLE IF NOT EXISTS public.product_credentials (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid        NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  content      text        NOT NULL,
  label        text,
  order_id     uuid        REFERENCES public.orders(id) ON DELETE SET NULL,
  assigned_to  uuid,
  delivered_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pc_product_avail ON public.product_credentials(product_id) WHERE order_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_pc_assigned      ON public.product_credentials(assigned_to);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_credentials TO authenticated;
GRANT ALL ON public.product_credentials TO service_role;
ALTER TABLE public.product_credentials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pc_admin_all ON public.product_credentials;
DROP POLICY IF EXISTS pc_self_read ON public.product_credentials;
CREATE POLICY pc_admin_all ON public.product_credentials FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY pc_self_read ON public.product_credentials FOR SELECT TO authenticated USING (assigned_to = auth.uid());

CREATE TABLE IF NOT EXISTS public.site_settings (
  key        text  PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL    ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS settings_admin_read  ON public.site_settings;
DROP POLICY IF EXISTS settings_admin_write ON public.site_settings;
CREATE POLICY settings_admin_read  ON public.site_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY settings_admin_write ON public.site_settings FOR ALL    TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     text        NOT NULL,
  target     text,
  metadata   jsonb       DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_logs TO authenticated;
GRANT ALL    ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS logs_admin_read   ON public.activity_logs;
DROP POLICY IF EXISTS logs_admin_insert ON public.activity_logs;
CREATE POLICY logs_admin_read   ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY logs_admin_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
