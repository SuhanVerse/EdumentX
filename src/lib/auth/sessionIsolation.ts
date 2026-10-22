/** A listener generation plus the native UID, checked after every asynchronous auth read. */
export interface AuthSessionScope {
  readonly uid: string | null;
  isCurrent: () => boolean;
  waitFor: <T>(pending: Promise<T>) => Promise<T>;
}

export function createAuthSessionGuard({ currentUid, onOwnerChange }: {
  currentUid: () => string | null;
  onOwnerChange: (uid: string | null) => void;
}) {
  let generation = 0;
  let owner: string | null | undefined;
  let blockedUid: string | null = null;
  let disposed = false;
  return {
    begin(uid: string | null): AuthSessionScope | null {
      if (disposed || currentUid() !== uid || (blockedUid !== null && blockedUid === uid)) return null;
      if (blockedUid !== uid) blockedUid = null;
      const ticket = ++generation;
      if (owner !== uid) {
        owner = uid;
        // Synchronous: no previous user's cached flags survive the first await.
        onOwnerChange(uid);
      }
      const isCurrent = () => !disposed && generation === ticket && owner === uid && currentUid() === uid;
      return {
        uid, isCurrent,
        async waitFor<T>(pending: Promise<T>): Promise<T> {
          const result = await pending;
          if (!isCurrent()) throw new Error('The authentication session changed.');
          return result;
        },
      };
    },
    block(scope: AuthSessionScope): boolean {
      if (!scope.uid || !scope.isCurrent()) return false;
      blockedUid = scope.uid;
      generation += 1;
      owner = null;
      onOwnerChange(null);
      return true;
    },
    dispose() { disposed = true; generation += 1; },
  };
}
