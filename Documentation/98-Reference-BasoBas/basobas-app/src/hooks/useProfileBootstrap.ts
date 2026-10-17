import { useEffect } from 'react';
import { useUser } from '@clerk/expo';
import { useClerkSupabase } from '@/src/hooks/useClerkSupabase';
import { getProfile } from '@/src/services/profile.service';
import { useUserStore } from '@/src/store/userStore';

/**
 * Bootstraps the current user's profile + Pro status from the DB as soon as the
 * authenticated area mounts — rather than waiting for the Profile tab to be
 * focused. This prevents the "blank then fills in" flash on the Profile screen.
 *
 * The Profile tab still re-syncs on focus (to pick up edits); this just makes
 * sure the data is already warm before the user gets there.
 */
export function useProfileBootstrap() {
  const supabase = useClerkSupabase();
  const { user: clerkUser, isLoaded } = useUser();
  const syncProfileFromDb = useUserStore((s) => s.syncProfileFromDb);
  const activatePro = useUserStore((s) => s.activatePro);

  useEffect(() => {
    if (!isLoaded || !clerkUser?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const profileResult = await getProfile(clerkUser.id, supabase);
        if (!cancelled && profileResult.success) {
          syncProfileFromDb(profileResult.data as any);
        }

        const { data: passData } = await supabase
          .from('user_passes' as any)
          .select('*')
          .eq('status', 'ACTIVE')
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (passData) {
          const pd = passData as any;
          const totalDays = pd.product_id === '15day' ? 15 : 30;
          activatePro(totalDays);
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to bootstrap profile:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, clerkUser?.id, supabase, syncProfileFromDb, activatePro]);
}
