import "@/global.css";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { getApp } from "@react-native-firebase/app";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
} from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
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

  // Subscribe to Firebase auth state. Each callback may (a) update the user
  // in the store, (b) fetch the corresponding `users/{uid}` doc to learn
  // the role, and (c) flip the loading flag off once we know enough to
  // route. We never block on a network call we don't need.
  //
  // We use the **modular** `@react-native-firebase/*` API (`getApp`,
  // `getAuth`, `onAuthStateChanged`) — the namespaced `auth().…` calls
  // are deprecated in v22+ and log a deprecation warning on every call.
  useEffect(() => {
    const app = getApp();
    const firebaseAuth = getAuth(app);
    const firebaseDb = getFirestore(app);
    const subscriber = onAuthStateChanged(
      firebaseAuth,
      async (nextUser: FirebaseAuthTypes.User | null) => {
        setUser(nextUser);
        if (!nextUser) {
          lastUidRef.current = null;
          setRole(null);
          setLoading(false);
          return;
        }
        if (lastUidRef.current === nextUser.uid) {
          // Same user as last callback — don't re-fetch the doc.
          setLoading(false);
          return;
        }
        lastUidRef.current = nextUser.uid;
        try {
          const userDocRef = doc(firebaseDb, "users", nextUser.uid);
          const snap = await getDoc(userDocRef);
          const data = snap.data() as { role?: string } | undefined;
          const roleValue: UserRole =
            data?.role === "tutor" || data?.role === "student"
              ? (data.role as UserRole)
              : null;
          setRole(roleValue);
        } catch (err) {
          // Treat any read failure as "no role yet" — the user will be sent
          // to /role-selection and can re-try.
          console.warn("RootLayout: failed to read users/{uid}", err);
          setRole(null);
        } finally {
          setLoading(false);
        }
      },
    );
    return subscriber;
  }, [setUser, setRole, setLoading]);

  // Redirect logic — runs on every render where `user` / `role` / segments
  // change. The order matters:
  //   1. While we're still loading the auth state, do nothing.
  //   2. If signed out, force onto an auth screen.
  //   3. If signed in but no role doc, force onto /role-selection.
  //   4. If signed in + has role, force onto the right profile route.
  useEffect(() => {
    if (isLoading) return;
    const currentRoute = segments.join("/");
    if (!user) {
      // Signed out — only the onboarding / phone-entry / otpverify /
      // create_password screens are allowed. We treat /index and /onboarding
      // as "always allowed".
      const allowedForSignedOut = new Set([
        "",
        "index",
        "onboarding",
        "phone-entry",
        "otpverify",
        "create_password",
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
      "phone-entry",
      "otpverify",
      "create_password",
    ]);
    // Force them off the auth screens once they have a role.
    if (!allowedForSignedIn.has(currentRoute) && currentRoute !== target) {
      router.replace(target);
    }
  }, [user, role, isLoading, segments, router]);

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
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="phone-entry" />
          <Stack.Screen name="otpverify" />
          <Stack.Screen name="create_password" />
          <Stack.Screen name="role-selection" />
          <Stack.Screen name="profile-student" />
          <Stack.Screen name="profile-tutor" />
          <Stack.Screen name="student-home" />
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
