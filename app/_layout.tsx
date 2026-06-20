import "@/global.css";
import {
  ClerkProvider,
  useAuth,
  useUser,
} from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo";
import {
  Stack,
  useRouter,
  useSegments,
  useRootNavigationState,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
} from "@react-native-firebase/firestore";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ClerkFirebaseBridge } from "@/components/ClerkFirebaseBridge";
import { useAuthStore, type ClerkUser, type UserRole } from "@/store/authStore";

SplashScreen.preventAutoHideAsync().catch(() => {
  // The native splash module is not always available in dev. Safe to ignore.
});

// Map from a raw Firestore `role` string to the route we want to land on
// after a successful sign-in. We do the role→route mapping in one place so
// the layout guard, dashboards, and tests all agree.
//
// Note: the dashboards live at `/student-home` and `/tutor-home`. The
// `/profile-student` and `/profile-tutor` routes still exist as the
// first-time profile-completion flows and are NOT the dashboard entry.
function dashboardPathForRole(role: UserRole): "/student-home" | "/tutor-home" {
  if (role === "tutor") return "/tutor-home";
  return "/student-home";
}

/**
 * Inner layout — runs inside <ClerkProvider> so the Clerk hooks are
 * available. Owns the auth subscription, the role-fetch effect, and
 * the redirect guard.
 *
 * Why split this out: <ClerkProvider> can only provide hooks to
 * children, but we want to wrap the entire <Stack> with
 * <ClerkProvider> (so the auth screen tree has Clerk context too). A
 * small inner component lets us do both.
 */
function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  // True once the root navigator has mounted. We must NOT call
  // `router.replace(...)` before this is true — expo-router will throw
  // "Attempted to navigate before mounting the Root Layout component".
  // See https://docs.expo.dev/router/advanced/root-layout/#navigation-lifecycle
  const navState = useRootNavigationState();
  const isNavigatorReady = navState?.key != null;

  const { isLoaded: clerkLoaded, isSignedIn, userId } = useAuth();
  const { user: clerkUser } = useUser();

  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setRole = useAuthStore((state) => state.setRole);
  const setLoading = useAuthStore((state) => state.setLoading);

  // Track the currently-signed-in uid so we only fetch the user doc when
  // it actually changes (not on every Clerk callback). Clerk's `userId`
  // is stable for the lifetime of the session, so this is purely a
  // re-render optimization — but it also keeps the Firestore read
  // count down.
  const lastUidRef = useRef<string | null>(null);

  // Mirror the Clerk session into our local auth store. We:
  //   1. When Clerk says "not signed in", clear the store and stop.
  //   2. When Clerk says "signed in" and the uid is new, derive a
  //      lightweight ClerkUser from the Clerk User object and fetch
  //      the `users/{uid}` Firestore doc to learn the role.
  //   3. When Clerk says "signed in" with the same uid, just flip
  //      `isLoading` off (no work needed).
  useEffect(() => {
    // While Clerk is still loading the session from SecureStore, keep
    // `isLoading: true` so the splash overlay stays up. Don't mirror
    // anything to the store yet.
    if (!clerkLoaded) return;

    if (!isSignedIn || !userId) {
      // Signed out.
      lastUidRef.current = null;
      setUser(null);
      setRole(null);
      setLoading(false);
      return;
    }

    if (lastUidRef.current === userId) {
      // Same user as last time we mirrored.
      setLoading(false);
      return;
    }

    // New signed-in user. Build a lightweight ClerkUser and fetch role.
    lastUidRef.current = userId;
    const lightweight: ClerkUser = {
      uid: userId,
      email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
      displayName: clerkUser?.fullName ?? clerkUser?.firstName ?? null,
      avatarUrl: clerkUser?.imageUrl ?? null,
      username: clerkUser?.username ?? null,
    };
    setUser(lightweight);

    (async () => {
      try {
        const db = getFirestore(getApp());
        const userDocRef = doc(db, "users", userId);
        const snap = await getDoc(userDocRef);
        const data = snap.data() as { role?: string } | undefined;
        const roleValue: UserRole =
          data?.role === "tutor" || data?.role === "student"
            ? (data.role as UserRole)
            : null;
        setRole(roleValue);
      } catch (err) {
        // Treat any read failure as "no role yet" — the user will be
        // sent to /role-selection and can re-try. The same error is
        // expected if the bridge hasn't completed yet (the Firestore
        // call will fail with `auth/...` because the custom-token
        // sign-in is still in flight); the next render after the
        // bridge succeeds will retry on the same callback.
        console.warn("RootLayout: failed to read users/{uid}", err);
        setRole(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    clerkLoaded,
    isSignedIn,
    userId,
    clerkUser,
    setUser,
    setRole,
    setLoading,
  ]);

  // Redirect logic — runs on every render where `user` / `role` /
  // segments change. The order matters:
  //   0. Wait for Clerk to finish loading + the root navigator to
  //      mount. Without this guard expo-router throws
  //      "Attempted to navigate before mounting the Root Layout
  //      component".
  //   1. While we're still loading, do nothing (the loading overlay
  //      is visible).
  //   2. If signed out, force onto an auth screen.
  //   3. If signed in but no role doc, force onto /role-selection.
  //   4. If signed in + has role, force onto the right dashboard
  //      route (but allow the profile-completion flows to be reached
  //      so a returning user who never finished setup can finish it).
  useEffect(() => {
    if (!isNavigatorReady) return;
    if (!clerkLoaded || isLoading) return;
    const currentRoute = segments.join("/");
    if (!isSignedIn || !user) {
      // Signed out — only the onboarding / phone-entry / otpverify
      // screens are allowed. We treat /index and /onboarding as
      // "always allowed".
      const allowedForSignedOut = new Set([
        "",
        "index",
        "onboarding",
        "phone-entry",
        "otpverify",
      ]);
      if (!allowedForSignedOut.has(currentRoute)) {
        router.replace("/phone-entry");
      }
      return;
    }
    // Signed in.
    if (!role) {
      if (currentRoute !== "role-selection") {
        router.replace("/role-selection");
      }
      return;
    }
    // Signed in + has role.
    const target = dashboardPathForRole(role);
    const allowedForSignedIn = new Set<string>([
      "role-selection",
      "profile-student",
      "profile-tutor",
      "student-home",
      "tutor-home",
      "phone-entry",
      "otpverify",
    ]);
    // Force them off the auth screens once they have a role.
    if (!allowedForSignedIn.has(currentRoute) && currentRoute !== target) {
      router.replace(target);
    }
  }, [
    user,
    role,
    isLoading,
    isNavigatorReady,
    segments,
    router,
    clerkLoaded,
    isSignedIn,
  ]);

  // CRITICAL: always render the Stack, even while loading.
  // Conditionally returning a different tree from the same component
  // (the loading View vs. the Stack) makes expo-router lose track of
  // child screens and can trigger "Cannot read property 'displayName'
  // of undefined" when the Stack tries to remount its children on the
  // next render. The loading spinner overlays the Stack instead.
  //
  // <StatusBar /> is rendered OUTSIDE the <Stack> — Expo Router only
  // accepts <Stack.Screen> children inside a <Stack>; anything else
  // (StatusBar, Toasts, custom providers) must live as a sibling of
  // the Stack, not a descendant. Putting StatusBar inside used to
  // spam "Layout children must be of type Screen" warnings.
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="phone-entry" />
        <Stack.Screen name="otpverify" />
        <Stack.Screen name="role-selection" />
        <Stack.Screen name="profile-student" />
        <Stack.Screen name="profile-tutor" />
        <Stack.Screen name="student-home" />
        <Stack.Screen name="tutor-home" />
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
    </>
  );
}

// Inlined `tokenCache` backed by `expo-secure-store`. Persists the
// active Clerk session JWT in the iOS Keychain / Android Keystore so
// the user stays signed in across app launches. Without this, Clerk
// falls back to its `MemoryTokenCache` and the user is signed out on
// every cold start.
//
// `AFTER_FIRST_UNLOCK` matches the JWT's intended lifetime — the
// token is only valid until the user signs out, so we don't need
// `WHEN_UNLOCKED_THIS_DEVICE_ONLY` or stricter. See Clerk's docs:
// https://clerk.com/docs/quickstarts/expo#configure-the-token-cache-with-expo
//
// Both `getToken` and `saveToken` swallow + log on failure rather
// than re-throwing. On some Android emulators (notably the Pixel
// AVDs on certain host setups) the Keystore refuses to provision
// a hardware-backed key, surfacing as "Keychain couldn't be set".
// Re-throwing here would crash Clerk's session bootstrap; instead
// we fall through, Clerk uses its in-memory cache for the rest of
// the session, and the user just has to sign in again on next
// cold start. The dev console line gives us a clear breadcrumb.
const tokenCache: TokenCache = {
  async getToken(key) {
    try {
      return await SecureStore.getItemAsync(key, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch {
      try {
        await SecureStore.deleteItemAsync(key, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
        });
      } catch {
        // ignore — we just wanted to clear a corrupt entry
      }
      return null;
    }
  },
  async saveToken(key, token) {
    try {
      await SecureStore.setItemAsync(key, token, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
    } catch (err) {
      // Don't crash the auth flow if the Keystore refuses the write.
      // The session is still valid in memory for this app launch.
      console.warn(
        "tokenCache.saveToken: SecureStore.setItemAsync failed — " +
          "falling back to in-memory token cache for this session.",
        err,
      );
    }
  },
};

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    // We don't `throw` here because that would crash the entire app
    // before the splash hides; instead we log a clear error and
    // render a fallback so the dev experience is debuggable.
    console.error(
      "RootLayout: EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set. " +
        "Add it to .env — see .env.example.",
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey ?? "pk_test_missing"} tokenCache={tokenCache}>
      <ClerkFirebaseBridge />
      <GestureHandlerRootView className="flex-1">
        <SafeAreaProvider>
          <RootLayoutNav />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
