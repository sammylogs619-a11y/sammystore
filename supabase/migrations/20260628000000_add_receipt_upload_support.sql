-- Add receipt photo support to bank transfer top-up requests.
-- bank_transfer_requests itself predates tracked migrations (created ad-hoc
-- in the Supabase dashboard), so this migration only ADDs to it defensively.

ALTER TABLE public.bank_transfer_requests
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- Private bucket for payment receipts (unlike product-images, these contain
-- personal bank details and should not be publicly listable/readable by URL
-- guessing — access is via signed URLs only).
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Users may upload their own receipt into a folder named after their user id.
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
CREATE POLICY "Users can upload own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may view their own previously uploaded receipts.
DROP POLICY IF EXISTS "Users can view own receipts" ON storage.objects;
CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins may view every receipt, to review pending bank transfer requests.
-- Uses the real role mechanism (public.user_roles + has_role()), not a
-- profiles.role column — profiles has no role column in this schema.
DROP POLICY IF EXISTS "Admins can view all receipts" ON storage.objects;
CREATE POLICY "Admins can view all receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.has_role(auth.uid(), 'admin')
  );
