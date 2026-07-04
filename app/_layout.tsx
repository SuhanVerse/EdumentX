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
//
// IMPORTANT: this must return the dashboard routes (`/student-home`,
// `/tutor-home`, `/admin-home`), NOT the profile-setup routes
// (`/profile-student`, `/profile-tutor`). The profile-setup routes are
// reachable via `RoleSelection.tsx` after a brand-new user picks a role
// — that's the only legitimate path. Returning the profile-setup routes
// from this helper would bounce every returning user back to the
// profile-setup screen on re-login ("re-login profile-setup flash").
// The dashboards are the correct destination for `user && verified && role`.
function dashboardPathForRole(role: UserRole): "/student-home" | "/tutor-home" | "/admin-home" {
  if (role === "tutor") return "/tutor-home";
  if (role === "admin") return "/admin-home";
  return "/student-home";
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
  const hasAdminProfile = useAuthStore((state) => state.hasAdminProfile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setRole = useAuthStore((state) => state.setRole);
  const setHasAdminProfile = useAuthStore((state) => state.setHasAdminProfile);
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
   * Every render where `user` / `role` / `hasAdminProfile` / `segments`
   * change, this hook decides which route the user belongs on. The
   * decision tree:
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
   *   4. If signed in + verified + role is "admin" and the user has no
   *      `adminProfile` doc yet → /admin-profile (first-time admin
   *      setup). Otherwise, route admins to /admin-home.
   *   5. If signed in + verified + role is set (student/tutor/admin
   *      with profile) → force onto the matching dashboard.
   *   6. If signed in + verified + no role → /role-selection (first
   *      time setup for a non-admin user).
   *
   * Step 4 is the "first-time admin" branch. It is intentionally
   * separated from step 5: a brand-new admin (one whose `admins/{uid}`
   * doc was just created by the seed script, but who has never filled
   * in their adminProfile) needs to be funneled into the same
   * setup-and-save screen we built for admins. The setup screen
   * saves the profile, then `router.replace("/admin-home")` advances
   * them. The flag is updated by both the auth listener (when the doc
   * already exists) and the setup screen on save.
   *
   * Step 5 is the "Amnesia Login Loop" fix: an existing user who logs
   * back in sees their `role` already populated in the local Zustand
   * store (we read `users/{uid}` immediately after
   * `onAuthStateChanged` fires below) and is sent straight to the
   * dashboard. They never see /role-selection unless their doc really
   * has no role yet — which would only happen for a brand-new signup.
   */
  useEffect(() => {
    if (!isNavigatorReady) return;
    if (isLoading) return;

    // No rAF wrap here — the reference working commit fires
    // `router.replace` synchronously inside the effect body once
    // `useRootNavigationState().key` is truthy. The previous Round 3
    // rAF wrap deferred past the navigator's internal mount handoff,
    // but the user reports that restore-to-reference is the
    // authoritative fix for the auth-flow regressions. If the
    // "navigate before mounting" error recurs in a future emulator
    // run we can reintroduce the rAF with the cancelAnimationFrame
    // cleanup; for now parity with the working reference wins.
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

    // First-time admin: a user whose role resolves to "admin" but who
    // has not yet saved an `adminProfile` doc. Funnel them through
    // /admin-profile so they fill in their display name, role title,
    // and phone before reaching the admin dashboard. The setup
    // screen's save handler sets `hasAdminProfile = true` and
    // `router.replace("/admin-home")`, which clears this branch on
    // the next render.
    if (role === "admin" && !hasAdminProfile) {
      if (currentRoute !== "admin-profile") {
        router.replace("/admin-profile");
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
    //
    // We DO allow `admin-profile`: a returning admin with a populated
    // profile is allowed to view and edit their profile from the
    // "My profile" pill on /admin-home. The first-time branch above
    // is what sends new admins here on their initial sign-in; once
    // they save, we never bounce them off the page on subsequent
    // visits.
    const target = dashboardPathForRole(role);
    const allowedForSignedIn = new Set<string>([
      "role-selection",
      "profile-student",
      "profile-tutor",
      "student-home",
      "tutor-home",
      "admin-home",
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
      // Admin sub-screens (AdminNav targets)
      "platform-statistics",
      "verification-queue",
      "user-management",
      // Admin profile — first-time setup and view/edit. The first-time
      // branch above forces brand-new admins here; returning admins
      // reach it via the "My profile" pill on /admin-home.
      "admin-profile",
    ]);
    if (!allowedForSignedIn.has(currentRoute) && currentRoute !== target) {
      router.replace(target);
    }
  }, [
    user,
    role,
    hasAdminProfile,
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
    if (v === "student" || v === "tutor" || v === "admin") return v;
    // Legacy display labels from earlier role-pick screens.
    if (v === "student / parent") return "student";
    if (v === "tutor / teacher") return "tutor";
    // Anything else (e.g. null, garbage) is treated as "no role yet".
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
          setHasAdminProfile(false);
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

          // Admin status check — UNCONDITIONAL. The `admins/{uid}`
          // doc is the source of truth for admin rights, not
          // `users/{uid}.role`. An admin may have previously signed
          // in as a student/tutor (a stale user doc with `role:
          // "student"`), or the seed script may have created their
          // admin doc before they ever opened the app. Either way,
          // if `admins/{uid}` exists, role MUST be `"admin"`.
          //
          // We used to skip this check when `roleValue` was non-null
          // (treating the user doc as authoritative), but that meant
          // an existing user with a stale `role: "student"` field
          // would always be routed to /student-home — even after the
          // admin seed ran. This is the regression reported on
          // July 4, 2026. The fix is to read the admin doc on every
          // auth-state-change and let it override the user doc.
          //
          // Performance note: the admin doc read is cheap (single
          // `getDoc`) and only happens on auth state change, not on
          // every render. Non-admins take the `adminSnap.exists()
          // === false` path in a few ms.
          //
          // `finalRole` is the role we are *committing* to for this
          // session. It is also the value the heal block must use to
          // rewrite the user doc — using the pre-admin `roleValue`
          // here would silently leave the user doc out of sync with
          // `admins/{uid}` (e.g. `data?.role === "student"` on the
          // doc, `"admin"` everywhere else). That stale value
          // matters: any future read against the user doc by a
          // student/tutor-facing query would see "student" and treat
          // this account as a normal user.
          const isAdmin = await checkAdminStatus(nextUser.uid);
          const finalRole: UserRole = isAdmin ? "admin" : roleValue;
          if (isAdmin) {
            setRole("admin");
          }

          // If this user is now an admin, look up their
          // `users/{uid}/adminProfile/default` doc to determine
          // whether they have completed first-time setup. The flag
          // is what the routing guard reads to decide between
          // /admin-profile (setup) and /admin-home (dashboard).
          //
          // For non-admins we leave the flag at its default
          // (`false`); the guard only consults it on the
          // `role === "admin"` branch, so the value is irrelevant
          // for them.
          if (isAdmin) {
            await checkAdminProfileFlag(nextUser.uid);
          } else {
            // Defensive: a non-admin signing in shouldn't have a
            // stale `true` lying around from a prior session.
            setHasAdminProfile(false);
          }

          // ---- One-time heal of the `users/{uid}` root doc ----
          //
          // Three historical shapes can leave the user stuck or
          // inconsistent:
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
          //   (c) An admin's `users/{uid}.role` field is still a
          //       stale `"student"` (or `"tutor"`) from a previous
          //       sign-in, because the admin seed script writes
          //       `admins/{uid}` and never touches the user doc. We
          //       now know the user is an admin (from
          //       `checkAdminStatus`) — heal the user doc to match
          //       so downstream queries that read the user doc
          //       agree.
          //
          // If any of (a)/(b)/(c) holds, normalize the doc in place
          // so subsequent reads / writes are clean. The write goes
          // through the same owner-only rule, so this is safe.
          if (snap.exists()) {
            const needsUidHeal = data?.uid !== nextUser.uid;
            const needsRoleHeal =
              finalRole !== null && data?.role !== finalRole;
            if (needsUidHeal || needsRoleHeal) {
              try {
                await setDoc(
                  userDocRef,
                  {
                    uid: nextUser.uid,
                    role: finalRole ?? data?.role ?? null,
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
  }, [setUser, setRole, setHasAdminProfile, setLoading]);

  /**
   * Check if the current user is an admin by looking up `admins/{uid}`.
   * This runs after the user doc is read in onAuthStateChanged.
   * The admin status overrides any role from users/{uid}.
   */
  async function checkAdminStatus(uid: string): Promise<boolean> {
    try {
      const app = getApp();
      const firebaseDb = getFirestore(app);
      const adminDocRef = doc(firebaseDb, "admins", uid);
      const adminSnap = await getDoc(adminDocRef);
      return adminSnap.exists();
    } catch (err) {
      console.warn("RootLayout: failed to read admins/{uid}", err);
      return false;
    }
  }

  /**
   * For an admin user, read `users/{uid}/adminProfile/default` and
   * write `hasAdminProfile` to the store. The routing guard uses
   * this flag to decide between /admin-profile (first-time setup)
   * and /admin-home (dashboard).
   *
   * "Has a profile" = the doc exists AND has a non-empty `fullName`.
   * The full-name check is defensive: a half-written doc (e.g.
   * created by a third party or a botched client migration) should
   * still trigger the setup flow rather than landing the admin on an
   * empty dashboard.
   *
   * Read failures are non-fatal — we leave the flag at its previous
   * value so the admin isn't bounced to a profile screen when the
   * real problem is a transient network blip. The next auth-state
   * change will retry.
   */
  async function checkAdminProfileFlag(uid: string): Promise<void> {
    try {
      const app = getApp();
      const firebaseDb = getFirestore(app);
      const profileRef = doc(firebaseDb, "users", uid, "adminProfile", "default");
      const profileSnap = await getDoc(profileRef);
      const data = profileSnap.data() as
        | { fullName?: string | null }
        | undefined;
      const fullName =
        typeof data?.fullName === "string" ? data.fullName.trim() : "";
      setHasAdminProfile(profileSnap.exists() && fullName.length > 0);
    } catch (err) {
      console.warn("RootLayout: failed to read adminProfile/{default}", err);
    }
  }

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
          <Stack.Screen name="admin-home" />
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
          {/*Admin sub-screens*/}
          <Stack.Screen name="platform-statistics" />
          <Stack.Screen name="verification-queue" />
          <Stack.Screen name="user-management" />
          {/* Admin profile — first-time setup + view/edit. The auth
              guard routes brand-new admins here automatically; returning
              admins reach it via the "My profile" pill on /admin-home. */}
          <Stack.Screen name="admin-profile" />
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