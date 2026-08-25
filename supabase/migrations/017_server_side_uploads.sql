-- 017_server_side_uploads.sql (Aug 25)
--
-- ── SECURITY HARDENING (follow-up to 016) ─────────────────────────
-- Verification-doc (and demo-video) uploads now route through the
-- `upload-verification-doc` Edge Function, which:
--   * verifies the caller's FIREBASE JWT,
--   * derives `{uid}/{kind}.{ext}` from the token — never from the
--     request body,
--   * writes with the SERVICE role.
--
-- Because no client writes to storage directly anymore, the
-- bucket-scoped anon WRITE policies created by 016 are removed.
-- This closes the last audit hole: a holder of the anon key can no
-- longer overwrite another user's `{victimUid}/id.jpg`.
--
-- Reads are unchanged:
--   * private-verification-docs — still NO anon SELECT; PII reachable
--     only via signed URLs from `verification-doc-url`.
--   * tutor-demo-videos         — public SELECT retained.
--   * public-avatars            — public, untouched.
--
-- Run ONCE in the Supabase SQL Editor. Idempotent.
-- ---------------------------------------------------------------------------

-- Private PII bucket: writes are service-role-only from here on.
drop policy if exists "verification-docs-insert" on storage.objects;
drop policy if exists "verification-docs-update" on storage.objects;
drop policy if exists "verification-docs-delete" on storage.objects;

-- Legacy names, in case any pre-016 setup guide policies linger.
drop policy if exists "anon-upload" on storage.objects;
drop policy if exists "owner-upload-verification-docs" on storage.objects;
drop policy if exists "owner-update-verification-docs" on storage.objects;
drop policy if exists "owner-delete-verification-docs" on storage.objects;

-- Demo bucket: keep world-readable reads; drop anon writes.
drop policy if exists "demo-videos-select" on storage.objects;
create policy "demo-videos-select"
on storage.objects for select to anon, service_role
using (bucket_id = 'tutor-demo-videos');

drop policy if exists "demo-videos-insert" on storage.objects;
drop policy if exists "demo-videos-update" on storage.objects;
drop policy if exists "demo-videos-delete" on storage.objects;
