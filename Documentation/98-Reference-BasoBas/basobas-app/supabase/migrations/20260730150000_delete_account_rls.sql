-- ════════════════════════════════════════════════════════════════════
-- Migration: Add DELETE RLS policies for account deletion
--
-- The `profiles` table had no DELETE policy, so all client-side
-- `DELETE FROM profiles` calls were silently blocked by Supabase
-- RLS default-deny. Same for transactions / user_passes (no FK to
-- profiles) and the kyc-documents storage bucket.
-- ════════════════════════════════════════════════════════════════════

-- 1. Allow users to delete their own profile
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own"
  ON public.profiles FOR DELETE TO authenticated
  USING (clerk_id = requesting_user_id());

-- 2. Allow users to delete their own transaction records
--    (transactions has no FK to profiles, so cascade won't help)
DROP POLICY IF EXISTS "transactions_delete_own" ON public.transactions;
CREATE POLICY "transactions_delete_own"
  ON public.transactions FOR DELETE TO authenticated
  USING (clerk_id = requesting_user_id());

-- 3. Allow users to delete their own user_passes records
--    (same — no FK to profiles)
DROP POLICY IF EXISTS "user_passes_delete_own" ON public.user_passes;
CREATE POLICY "user_passes_delete_own"
  ON public.user_passes FOR DELETE TO authenticated
  USING (clerk_id = requesting_user_id());

-- 4. Allow users to delete their own KYC documents from storage
DROP POLICY IF EXISTS "kyc_docs_owner_delete" ON storage.objects;
CREATE POLICY "kyc_docs_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = requesting_user_id()
  );
