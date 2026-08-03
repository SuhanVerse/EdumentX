import type { SupabaseClient } from '@supabase/supabase-js';
import { ok, err, getErrorMessage, type Result } from '@/src/lib/result';
import type { Database } from '@/src/types/database.types';

const SUPABASE_FUNCTIONS_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') + '/functions/v1';

async function deleteStorageFolder(
  supabase: SupabaseClient<Database>,
  bucket: string,
  prefix: string,
): Promise<void> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(prefix);

    if (listError || !files || files.length === 0) return;

    const filePaths = files
      .filter((f) => f.id) // actual files have an id
      .map((f) => `${prefix}/${f.name}`);

    if (filePaths.length > 0) {
      await supabase.storage.from(bucket).remove(filePaths);
    }

    // Recurse into subdirectories (entries without an id)
    const subdirs = files.filter((f) => !f.id);
    for (const dir of subdirs) {
      await deleteStorageFolder(supabase, bucket, `${prefix}/${dir.name}`);
    }
  } catch {
    // Best-effort — storage cleanup is non-critical
  }
}

export async function deleteUserData(
  clerkId: string,
  supabase: SupabaseClient<Database>,
): Promise<Result<true>> {
  try {
    const cleanupTasks: Promise<void>[] = [
      deleteStorageFolder(supabase, 'avatars', clerkId),
      deleteStorageFolder(supabase, 'kyc-documents', clerkId),
      deleteStorageFolder(supabase, 'property-photos', clerkId),
    ];

    await Promise.all(cleanupTasks);

    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('clerk_id', clerkId);

    if (txError) {
      console.warn('[deleteAccount] transactions cleanup:', txError.message);
    }

    const { error: passesError } = await supabase
      .from('user_passes')
      .delete()
      .eq('clerk_id', clerkId);

    if (passesError) {
      console.warn('[deleteAccount] user_passes cleanup:', passesError.message);
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('clerk_id', clerkId);

    if (profileError) {
      return err(`Profile deletion failed: ${profileError.message}`);
    }

    return ok(true);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}

export async function deleteClerkUser(clerkId: string): Promise<Result<true>> {
  try {
    const response = await fetch(
      `${SUPABASE_FUNCTIONS_URL}/delete-account`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      return err(`Clerk deletion failed: ${body}`);
    }

    return ok(true);
  } catch (e) {
    return err(getErrorMessage(e));
  }
}
