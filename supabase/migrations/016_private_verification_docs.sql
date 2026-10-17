-- 016_private_verification_docs.sql  (v2 — Aug 25)
--
-- ── SECURITY FIX (Aug 24 audit, CRITICAL #2) ──────────────────────
-- Makes `private-verification-docs` actually PRIVATE while preserving
-- the app's existing upload behavior.
--
-- v2 NOTES (after the first run failed):
--   * Removed the `DELETE FROM storage.objects WHERE false` "guard" —
--     Supabase's protect_delete() trigger blocks ALL direct deletes on
--     storage tables (42501), even no-ops, which aborted the txn.
--   * Replaced auth.uid()-scoped policies with BUCKET-scoped anon
--     write/delete policies. Your app authenticates via FIREBASE, so
--     Supabase's auth.uid() is always NULL here — the owner-scoped
--     version would have denied every upload. Bucket-scoped matches
--     the pre-migration exposure exactly (writes yes, reads NO).
--   * Reads: NO anon SELECT policy exists for this bucket after this
--     script — PII docs are reachable ONLY via short-lived signed
--     URLs minted by the `verification-doc-url` Edge Function
--     (service role bypasses RLS to sign; admin/owner checks happen
--     in the function).
--
-- Run ONCE in the Supabase SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- 1) Public demo-video bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('tutor-demo-videos', 'tutor-demo-videos', true)
on conflict (id) do nothing;

-- 2) Flip the verification bucket to PRIVATE (the audit fix).
update storage.buckets
set public = false
where id = 'private-verification-docs';

-- 3) Drop legacy public-read policies IF they exist (name-specific —
--    these were the documented names from earlier setup guides).
drop policy if exists "public-read-verification-docs" on storage.objects;
drop policy if exists "anon-read-verification-docs" on storage.objects;
drop policy if exists "verification-docs-public-read" on storage.objects;

-- 4) Verification bucket: anon WRITE/UPDATE/DELETE only (parity with
--    pre-migration uploads). Deliberately NO anon SELECT.
drop policy if exists "verification-docs-insert" on storage.objects;
create policy "verification-docs-insert"
on storage.objects for insert to anon
with check (bucket_id = 'private-verification-docs');

drop policy if exists "verification-docs-update" on storage.objects;
create policy "verification-docs-update"
on storage.objects for update to anon
using (bucket_id = 'private-verification-docs');

drop policy if exists "verification-docs-delete" on storage.objects;
create policy "verification-docs-delete"
on storage.objects for delete to anon
using (bucket_id = 'private-verification-docs');

-- 5) Demo bucket: world-readable, anon-writable (same model).
drop policy if exists "demo-videos-select" on storage.objects;
create policy "demo-videos-select"
on storage.objects for select to anon, service_role
using (bucket_id = 'tutor-demo-videos');

drop policy if exists "demo-videos-insert" on storage.objects;
create policy "demo-videos-insert"
on storage.objects for insert to anon
with check (bucket_id = 'tutor-demo-videos');

drop policy if exists "demo-videos-update" on storage.objects;
create policy "demo-videos-update"
on storage.objects for update to anon
using (bucket_id = 'tutor-demo-videos');
