import "@/global.css";
import { getApp } from "@react-native-firebase/app";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import * as SplashScreen from "expo-splash-screen";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAuthStore, type UserRole } from "@/store/authStore";

SplashScreen.preventAutoHideAsync().catch(() => {
  // The native splash module is not always available in dev. Safe to ignore.
});

// Map from a raw Firestore `role` string to the route we want to land on
// after a successful sign-in. We do the role→route mapping in one place so
// the layout guard, dashboards, and tests all agree.
function dashboardPathForRole(role: UserRole): "/profile-tutor" | "/profile-student" {
  if (role === "tutor") return "/profile-tutor";
  return "/profile-student";
}

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  // True once the root navigator has mounted. We must NOT call
  // `router.replace(...)` before this is true — expo-router will throw
  // "Attempted to navigate before mounting the Root Layout component".
  // See https://docs.expo.dev/router/advanced/root-layout/#navigation-lifecycle
  const navState = useRootNavigationState();
  const isNavigatorReady = navState?.key != null;
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setRole = useAuthStore((state) => state.setRole);
  const setLoading = useAuthStore((state) => state.setLoading);

  // Track the currently-signed-in uid so we only fetch the user doc when it
  // actually changes (not on every state callback).
  const lastUidRef = useRef<string | null>(null);

  useEffect(() => {
    // Give gesture-handler one frame to register its TurboModule before
    // the native splash hides and the JS-side keep-awake can resolve.
    const timeout = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        // ignore — the splash may have already auto-hidden
      });
    }, 50);
    return () => clearTimeout(timeout);
  }, []);

  /**
   * Source-of-Truth routing.
   *
   * Every render where `user` / `role` / `segments` change, this hook
   * decides which route the user belongs on. The decision tree:
   *
   *   0. Wait for the root navigator to mount (otherwise expo-router
   *      throws "Attempted to navigate before mounting the Root Layout
   *      component").
   *   1. While we're still loading the auth state, do nothing.
   *   2. If signed out, force onto an auth screen.
   *   3. If signed in via email/password but `emailVerified === false`,
   *      force onto /email-signup (the "check your inbox" pending
   *      state — the EmailSignUp screen already has the
   *      `reload()`-then-recheck handler).
   *   4. If signed in + verified + role is set → force onto the
   *      matching dashboard.
   *   5. If signed in + verified + no role → /role-selection (first
   *      time setup).
   *
   * Step 4 is the "Amnesia Login Loop" fix: an existing user who logs
   * back in sees their `role` already populated in the local Zustand
   * store (we read `users/{uid}` immediately after
   * `onAuthStateChanged` fires below) and is sent straight to the
   * dashboard. They never see /role-selection unless their doc really
   * has no role yet — which would only happen for a brand-new signup.
   */
  useEffect(() => {
    if (!isNavigatorReady) return;
    if (isLoading) return;

    // Defer the router.replace call by one frame. `useRootNavigationState`
    // becomes truthy *before* `router.replace` is callable on
    // expo-router 6 — the navigator's internal navigation methods are
    // wired up on the frame after `navState.key` flips. Without this
    // rAF, the redirect effect fires on the very first render where
    // `isNavigatorReady === true` and crashes with
    // "Attempted to navigate before mounting the Root Layout component".
    // Cancelling the frame on the next effect pass means we never queue
    // a stale redirect behind a fresher one.
    const frame = requestAnimationFrame(() => {
      const currentRoute = segments.join("/");

      if (!user) {
        // Signed out — only onboarding + the auth entry screen are
        // allowed. `/email-signup` is where users create an account or
        // log in. Phone OTP was removed in the June 21, 2026 pivot.
        const allowedForSignedOut = new Set([
          "",
          "index",
          "onboarding",
          "email-signup",
        ]);
        if (!allowedForSignedOut.has(currentRoute)) {
          router.replace("/email-signup");
        }
        return;
      }

      // Signed in via email/password but unverified — bounce to the
      // "check your inbox" pending state on /email-signup until they
      // click the link. They can also sit on /email-signup freely
      // (the screen itself owns the reload + recheck flow).
      const isEmailPasswordUser = !!user.providerData.some(
        (p) => p.providerId === "password",
      );
      const emailVerified = user.emailVerified ?? true;
      if (isEmailPasswordUser && !emailVerified) {
        if (currentRoute !== "email-signup") {
          router.replace("/email-signup");
        }
        return;
      }

      // Signed in + verified. The store already knows whether the user
      // has a `role` (we fetched it on the onAuthStateChanged callback
      // below). The presence of a role means there's a `users/{uid}` doc
      // — Source of Truth.
      if (!role) {
        if (currentRoute !== "role-selection") {
          router.replace("/role-selection");
        }
        return;
      }

      // Signed in + verified + has role → route to the matching
      // dashboard. We allow the auth-flow screens and the student
      // dashboard sub-screens through so a signed-in student can move
      // freely between Home / Map / AI / Enrollments / Profile without
      // being bounced back to the dashboard.
      //
      // We deliberately do **not** allow `email-signup`: a verified
      // user with a role who is sitting on /email-signup is the
      // "post-login flash" trap — the redirect tree sent them there
      // for one render while `role` was still `null`, and the guard
      // sees them there, finds them in the allowlist, and refuses to
      // advance them. Drop them from the list so the next render
      // pushes them to the dashboard.
      const target = dashboardPathForRole(role);
      const allowedForSignedIn = new Set<string>([
        "role-selection",
        "profile-student",
        "profile-tutor",
        "student-home",
        "tutor-home",
        // Student sub-screens (Phase 4 dashboard shell). These are
        // reachable via the BottomNav; the guard must allow them or
        // it will replace them back to the dashboard on the next
        // render.
        "map-search",
        "AI-chat",
        "enrollment",
        "stu-profile",
        // Tutor sub-screens (feature/tutor merge). Reachable from the
        // TutorBottomBar.
        "batches",
        "tutor-inbox",
        "tutor_edit_profile",
        // Shared screens reachable from student surfaces (e.g.
        // StudentProfile's "Notifications" row routes to
        // /notification).
        "notification",
        "filters-sheet",
      ]);
      if (!allowedForSignedIn.has(currentRoute) && currentRoute !== target) {
        router.replace(target);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    user,
    role,
    isLoading,
    isNavigatorReady,
    segments,
    router,
  ]);

  /**
   * Normalize a `users/{uid}.role` value into the `UserRole` union.
   *
   * The canonical values are lowercase `"student"` and `"tutor"`
   * (see `UserRole` in `store/authStore.ts`). But this project has
   * gone through several auth pivots (Clerk → native Firebase, plus
   * earlier drafts that displayed the human label `"Student / Parent"`
   * or `"Tutor"` on the role card and may have written that string
   * verbatim to Firestore). Returning `null` for those legacy values
   * would loop the user back to /role-selection forever, which is
   * exactly the bug reported on June 21, 2026.
   *
   * So we:
   *   1. Trim + lowercase the value.
   *   2. Match against the canonical list.
   *   3. Match against the legacy display labels and map them to the
   *      canonical enum value.
   *
   * If we *can* resolve a role, the caller is responsible for writing
   * the canonical value back to Firestore so future reads are clean.
   */
  function normalizeRole(raw: unknown): UserRole {
    if (typeof raw !== "string") return null;
    const v = raw.trim().toLowerCase();
    if (v === "student" || v === "tutor") return v;
    // Legacy display labels from earlier role-pick screens.
    if (v === "student / parent") return "student";
    if (v === "tutor / teacher") return "tutor";
    // Anything else (e.g. null, "admin" granted out-of-band, garbage)
    // is treated as "no role yet".
    return null;
  }

  /**
   * Subscribe to Firebase auth state. Each callback:
   *   (a) updates the user in the Zustand store,
   *   (b) fetches `users/{uid}` to read the role + profile flags, and
   *   (c) flips the loading flag off once we know enough to route.
   *
   * We use the **modular** `@react-native-firebase/*` API (`getApp`,
   * `getAuth`, `onAuthStateChanged`) — the namespaced `auth().…` calls
   * are deprecated in v22+ and log a deprecation warning on every
   * call.
   *
   * The `lastUidRef` guard prevents re-fetching the user doc on
   * rapid re-emits (e.g. when `reload()` is called by
   * EmailSignUp.handleCheckVerified — Firebase re-emits the auth
   * state, but the uid didn't change and we already have a populated
   * role in the store). It is **not** safe to skip the fetch when
   * the cached role is `null`: the user may have just signed back
   * in after `reset()` cleared the store, and skipping the fetch
   * would leave `role: null` and re-bounce them to /role-selection
   * ("Amnesia Login Loop" — see CLAUDE.md Bug #1, June 21 audit).
   *
   * After the read, `normalizeRole` maps legacy role values (e.g.
   * the human-readable `"Tutor"` label from an earlier role-pick
   * screen) back to the canonical enum. If the doc is missing the
   * `uid` field — a common artifact of pre-pivot code that wrote
   * the root doc without it — or if the role value is non-canonical,
   * we re-write the doc with the canonical shape so subsequent
   * writes from the profile screens don't fail the
   * `request.resource.data.uid == userId` rules guard.
   */
  useEffect(() => {
    const app = getApp();
    const firebaseAuth = getAuth(app);
    const firebaseDb = getFirestore(app);
    const subscriber = onAuthStateChanged(
      firebaseAuth,
      async (nextUser: FirebaseAuthTypes.User | null) => {
        setLoading(true);
        setUser(nextUser);
        if (!nextUser) {
          lastUidRef.current = null;
          setRole(null);
          setLoading(false);
          return;
        }
        // Skip the doc-fetch only when both conditions hold:
        //   1. uid is unchanged from the last callback
        //      (avoids re-fetching on rapid re-emits from
        //      auth.currentUser.reload()), AND
        //   2. the store already has a populated role
        //      (i.e. we just confirmed this uid's role on a
        //      previous callback this session).
        // If `role` is null (e.g. the user just signed back in
        // after `reset()`), always re-fetch — the doc may now
        // contain a role that wasn't there before.
        const cachedRole = useAuthStore.getState().role;
        if (lastUidRef.current === nextUser.uid && cachedRole !== null) {
          setLoading(false);
          return;
        }
        lastUidRef.current = nextUser.uid;
        try {
          const userDocRef = doc(firebaseDb, "users", nextUser.uid);
          const snap = await getDoc(userDocRef);
          const data = snap.data() as
            | { role?: string | null; uid?: string | null; email?: string | null }
            | undefined;
          const roleValue = normalizeRole(data?.role);
          setRole(roleValue);

          // ---- One-time heal of the `users/{uid}` root doc ----
          //
          // Two historical shapes can leave the user stuck on
          // /role-selection even though they completed signup:
          //
          //   (a) The doc was created by an older version of the
          //       code that wrote a *display label* (e.g. "Tutor")
          //       instead of the canonical enum value ("tutor"). The
          //       previous `data?.role === "tutor"` strict check
          //       rejected it and sent the user back to role
          //       selection forever.
          //
          //   (b) The doc was created by an earlier version that
          //       didn't include the `uid` field. Subsequent updates
          //       fail the `request.resource.data.uid == userId`
          //       guard in firestore.rules, which silently blocks
          //       every future write from the profile screens.
          //
          // If either condition holds, normalize the doc in place
          // so subsequent reads / writes are clean. The write goes
          // through the same owner-only rule, so this is safe.
          if (snap.exists()) {
            const needsUidHeal = data?.uid !== nextUser.uid;
            const needsRoleHeal =
              roleValue !== null && data?.role !== roleValue;
            if (needsUidHeal || needsRoleHeal) {
              try {
                await setDoc(
                  userDocRef,
                  {
                    uid: nextUser.uid,
                    role: roleValue ?? data?.role ?? null,
                    email: data?.email ?? nextUser.email ?? null,
                    updatedAt: serverTimestamp(),
                  },
                  { merge: true },
                );
                console.log(
                  "RootLayout: healed users/{uid} — uid/missing:",
                  needsUidHeal,
                  "role/normalized:",
                  needsRoleHeal,
                );
              } catch (healErr) {
                // Healing failed — likely a rules mismatch. Don't
                // block the user; the redirect already happened and
                // they can still proceed. The next login will retry.
                console.warn(
                  "RootLayout: failed to heal users/{uid}",
                  healErr,
                );
              }
            }
          }
        } catch (err) {
          // Treat any read failure as "no role yet" — the user will be
          // sent to /role-selection and can re-try.
          console.warn("RootLayout: failed to read users/{uid}", err);
          setRole(null);
        } finally {
          setLoading(false);
        }
      },
    );
    return subscriber;
  }, [setUser, setRole, setLoading]);

  // CRITICAL: always render the Stack, even while loading. Conditionally
  // returning a different tree from the same component (the loading View
  // vs. the Stack) makes expo-router lose track of child screens and
  // can trigger "Cannot read property 'displayName' of undefined" when
  // the Stack tries to remount its children on the next render. The
  // loading spinner overlays the Stack instead.
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Auth flow */}
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="email-signup" />
          <Stack.Screen name="role-selection" />
          {/* Profile collection (post-role-pick) */}
          <Stack.Screen name="profile-student" />
          <Stack.Screen name="profile-tutor" />
          {/* Dashboards */}
          <Stack.Screen name="student-home" />
          <Stack.Screen name="tutor-home" />
          {/* Student sub-screens (BottomNav targets) */}
          <Stack.Screen name="map-search" />
          <Stack.Screen name="AI-chat" />
          <Stack.Screen name="enrollment" />
          <Stack.Screen name="stu-profile" />
          {/* Tutor sub-screens (TutorBottomBar targets) */}
          <Stack.Screen name="batches" />
          <Stack.Screen name="tutor-inbox" />
          <Stack.Screen name="tutor_edit_profile" />
          {/* Shared */}
          <Stack.Screen name="notification" />
          <Stack.Screen name="filters-sheet" />
        </Stack>
        {isLoading ? (
          <View
            pointerEvents="none"
            className="absolute inset-0 items-center justify-center bg-background"
          >
            <ActivityIndicator size="large" color="#0F172A" />
          </View>
        ) : null}
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}