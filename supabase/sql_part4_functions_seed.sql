-- =====================================================================
-- PART 4 of 4 — Run AFTER Part 3 completes
-- Functions, triggers, backfill existing users, seed categories
-- =====================================================================

-- Auto-provision profile + wallet + role on every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role := 'user';
BEGIN
  IF lower(coalesce(NEW.email,'')) = '1sammystore1@gmail.com' THEN
    v_role := 'admin';
  END IF;
  INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)))
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Client-callable: always returns the caller's wallet (creates if missing)
CREATE OR REPLACE FUNCTION public.ensure_user_wallet()
RETURNS TABLE (id uuid, balance numeric, currency text, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY SELECT w.id, w.balance, w.currency, w.updated_at
               FROM public.wallets w WHERE w.user_id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet() TO authenticated;

-- Atomic credit — service_role only (called from webhooks and admin panel)
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _user_id uuid, _amount numeric, _provider payment_provider,
  _reference text, _description text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet_id   uuid;
  v_new_balance numeric(14,2);
  v_tx_id       uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.wallet_transactions WHERE reference = _reference) THEN
    RETURN NULL;
  END IF;
  UPDATE public.wallets SET balance = balance + _amount, updated_at = now()
    WHERE user_id = _user_id RETURNING id, balance INTO v_wallet_id, v_new_balance;
  IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'wallet not found for user %', _user_id; END IF;
  INSERT INTO public.wallet_transactions(wallet_id,user_id,type,amount,balance_after,status,provider,reference,description)
    VALUES (v_wallet_id,_user_id,'credit',_amount,v_new_balance,'success',_provider,_reference,_description)
    RETURNING id INTO v_tx_id;
  RETURN v_tx_id;
END;
$$;
REVOKE ALL ON FUNCTION public.credit_wallet(uuid,numeric,payment_provider,text,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_wallet(uuid,numeric,payment_provider,text,text) TO service_role;

-- Atomic purchase: debit wallet + decrement stock + create order
CREATE OR REPLACE FUNCTION public.purchase_with_wallet(_user_id uuid, _product_id uuid, _quantity int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_product     public.products;
  v_total       numeric(14,2);
  v_wallet_id   uuid;
  v_new_balance numeric(14,2);
  v_tx_id       uuid;
  v_order_id    uuid;
BEGIN
  IF _quantity <= 0 THEN RAISE EXCEPTION 'quantity must be positive'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id = _product_id AND published = true FOR UPDATE;
  IF v_product.id IS NULL THEN RAISE EXCEPTION 'product not available'; END IF;
  IF v_product.stock < _quantity THEN RAISE EXCEPTION 'insufficient stock'; END IF;
  v_total := v_product.price * _quantity;
  SELECT id, balance INTO v_wallet_id, v_new_balance FROM public.wallets WHERE user_id = _user_id FOR UPDATE;
  IF v_wallet_id IS NULL THEN RAISE EXCEPTION 'wallet not found'; END IF;
  IF v_new_balance < v_total THEN RAISE EXCEPTION 'insufficient wallet balance'; END IF;
  UPDATE public.wallets SET balance = balance - v_total, updated_at = now() WHERE id = v_wallet_id RETURNING balance INTO v_new_balance;
  UPDATE public.products SET stock = stock - _quantity, updated_at = now() WHERE id = _product_id;
  INSERT INTO public.wallet_transactions(wallet_id,user_id,type,amount,balance_after,status,provider,reference,description)
    VALUES (v_wallet_id,_user_id,'debit',v_total,v_new_balance,'success','manual','purchase-'||gen_random_uuid()::text,'Purchase: '||v_product.title)
    RETURNING id INTO v_tx_id;
  INSERT INTO public.orders(user_id,total,currency,status,wallet_tx_id)
    VALUES (_user_id,v_total,v_product.currency,'completed',v_tx_id) RETURNING id INTO v_order_id;
  INSERT INTO public.order_items(order_id,product_id,title,unit_price,quantity)
    VALUES (v_order_id,v_product.id,v_product.title,v_product.price,_quantity);
  RETURN v_order_id;
END;
$$;

-- Atomic credential delivery — service_role only
CREATE OR REPLACE FUNCTION public.assign_credential_to_order(_order_id uuid, _product_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cred_id uuid; v_user_id uuid;
BEGIN
  SELECT user_id INTO v_user_id FROM public.orders WHERE id = _order_id;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'order not found'; END IF;
  SELECT id INTO v_cred_id FROM public.product_credentials
    WHERE product_id = _product_id AND order_id IS NULL
    ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_cred_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.product_credentials SET order_id=_order_id, assigned_to=v_user_id, delivered_at=now() WHERE id=v_cred_id;
  UPDATE public.order_items SET delivered_payload=v_cred_id::text WHERE order_id=_order_id AND product_id=_product_id;
  RETURN v_cred_id;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_credential_to_order(uuid,uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_credential_to_order(uuid,uuid) TO service_role;

-- Backfill: create wallet/profile/role for anyone who signed up before this ran
INSERT INTO public.profiles (id, email, display_name)
  SELECT u.id, u.email, split_part(u.email,'@',1)
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL;

INSERT INTO public.wallets (user_id)
  SELECT u.id FROM auth.users u LEFT JOIN public.wallets w ON w.user_id = u.id WHERE w.id IS NULL;

INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'user'::app_role FROM auth.users u LEFT JOIN public.user_roles r ON r.user_id = u.id WHERE r.id IS NULL;

DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = '1sammystore1@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed product categories
INSERT INTO public.product_categories (name, slug, description) VALUES
  ('Aged Twitter',                          'aged-twitter',      'Verified aged Twitter/X accounts'),
  ('Aged Instagram',                        'aged-instagram',    'Verified aged Instagram accounts'),
  ('Random Facebook',                       'random-facebook',   'Random Facebook accounts'),
  ('USA Facebook',                          'usa-facebook',      'USA-based verified Facebook accounts'),
  ('Tools',                                 'tools',             'Social media tools and utilities'),
  ('Working Profiles with Picture & Video', 'working-profiles',  'Active profiles with pictures and videos'),
  ('Below 50 Friend Countries Facebook',    'below-50-friend',   'Facebook accounts with below 50 friend countries'),
  ('TikTok',                                'tiktok',            'TikTok accounts'),
  ('Facebook',                              'facebook',          'Facebook accounts'),
  ('Instagram',                             'instagram',         'Instagram accounts'),
  ('Telegram',                              'telegram',          'Telegram accounts'),
  ('YouTube',                               'youtube',           'YouTube accounts'),
  ('Twitter/X',                             'twitter-x',         'Twitter/X accounts'),
  ('LinkedIn',                              'linkedin',          'LinkedIn accounts')
ON CONFLICT (slug) DO NOTHING;
