import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedPressable, usePressScale, FieldShell } from "@/components/motion";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";
import {
  loginWithEmail,
  sendVerificationAgain,
  getSignInMethodsForEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/services/firebase/authService";
import { authErrorSuggestsModeFlip, formatFirebaseError } from "@/services/firebase/errors";
import { useAuthStore } from "@/store/authStore";

/**
 * EdumentX — Auth Entry Screen
 *
 * The single auth surface for the Email + Password + Google flow. Has
 * three states:
 *
 *   1. "form" (signup or login) — collect email + password. The mode
 *      toggle at the top flips between "Create account" and "Log in".
 *      Google Sign-In sits below the email/password form as a
 *      secondary option.
 *
 *   2. "pending" — account exists but `emailVerified` is still false.
 *      We show a "check your inbox" panel and a primary button that
 *      calls `auth.currentUser.reload()` to re-pull the server-side
 *      claim, then routes to `/role-selection` once verified.
 *
 *   3. (handled by `_layout.tsx`) — once verified and a user doc
 *      exists in Firestore, the layout guard routes to the dashboard.
 *
 * **Why no phone OTP?** Firebase's SMS provider requires a paid Blaze
 * plan. We're on the free Spark plan; Email + Password + Google is
 * the free path. The old `PhoneEntryScreen` / `OtpVerify` were
 * removed in the June 21, 2026 pivot.
 */
type Mode = "signup" | "login";

/**
 * Score a password on a 0-5 scale. We deliberately do NOT use
 * entropy / zxcvbn math — those algorithms require dictionaries
 * and are overkill for a free-tier college demo. The five signals
 * below map to the well-known "long, mixed case, digits, symbols"
 * guidance that every major auth UI surfaces.
 *
 *   +1 if length >= 8
 *   +1 if length >= 12
 *   +1 if has both lowercase AND uppercase letters
 *   +1 if has a digit
 *   +1 if has a non-alphanumeric symbol
 *
 * Score 0 is reserved for the empty string; the caller is expected
 * to gate the bar on `password.length > 0` so we never render
 * "Too weak" before the user has typed anything.
 */
function scorePassword(password: string): number {
  if (password.length === 0) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (hasLower && hasUpper) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

/**
 * The four human-readable levels we surface. Each carries the
 * Tailwind background class for its segments and the matching text
 * class for the caption. Keeping them in one place means the bar
 * and the label can never disagree.
 */
type PasswordLevel = {
  label: string;
  /** Background class for the *filled* segments of the bar. */
  barClass: string;
  /** Text class for the caption ("Too weak" / "Weak" / etc). */
  textClass: string;
};

const PASSWORD_LEVELS: PasswordLevel[] = [
  { label: "Too weak", barClass: "bg-danger", textClass: "text-danger" },
  { label: "Weak", barClass: "bg-danger", textClass: "text-danger" },
  { label: "Fair", barClass: "bg-warning", textClass: "text-warning" },
  { label: "Strong", barClass: "bg-success", textClass: "text-success" },
  { label: "Very strong", barClass: "bg-success", textClass: "text-success" },
];

const PASSWORD_SEGMENTS = 5;

function PasswordStrengthBar({ score }: { score: number }) {
  // score is 0-5; we clamp defensively in case the helper grows
  // beyond 5 segments later. Empty (score=0) gets a neutral caption
  // even though the caller is expected to hide the bar — this keeps
  // the bar safe to render unconditionally as a building block.
  const safeScore = Math.max(0, Math.min(score, PASSWORD_SEGMENTS));
  const level = PASSWORD_LEVELS[Math.max(0, safeScore - 1)] ?? PASSWORD_LEVELS[0];
  return (
    <View
      accessibilityLabel={`Password strength: ${level.label}`}
      className="gap-1"
    >
      <View className="flex-row gap-1">
        {Array.from({ length: PASSWORD_SEGMENTS }, (_, index) => {
          const filled = index < safeScore;
          return (
            <View
              key={index}
              className={`h-1 flex-1 rounded-sm ${
                filled ? level.barClass : "bg-border"
              }`}
            />
          );
        })}
      </View>
      <Text className={`text-caption ${level.textClass}`}>
        {level.label}
      </Text>
    </View>
  );
}

export function EmailSignUp() {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCheckingVerified, setIsCheckingVerified] = useState(false);
  // Which side of the Sign-up / Log-in pill the user is currently
  // pressing. Held in state (not driven by `active:opacity-80` on
  // the Pressable's className) because CssInterop tracks
  // `:active`/`:hover`/`:focus` pseudo-states per component instance
  // and re-runs `stringify` on the props when a Pressable is
  // *upgraded* after its initial render — that walk can throw and
  // emit the `[CssInterop] Failed to enumerate component props.`
  // warning, which leaves the JS thread mid-render and freezes the
  // screen. Using `transform: [{ scale }]` on the `style` prop keeps
  // the press feedback inside React Native's native path and never
  // touches the CssInterop upgrade branch.
  const [pressedMode, setPressedMode] = useState<Mode | null>(null);

  // `pendingEmail` flips the screen from "form" to "check your inbox".
  // We keep the email visible so the user can confirm which inbox to
  // look at.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const canSubmit = isEmailValid && isPasswordValid && !isSubmitting;

  // Password strength is only meaningful when the user is creating a new
  // account. On login the password is something they already picked — a
  // strength meter on a login form is awkward and leaks nothing useful
  // to a shoulder-surfer. We compute the score unconditionally so the
  // bar can mount instantly on signup-mode flips, but the bar is hidden
  // when the password field is empty (no point rendering 5 grey
  // segments and "Too weak" before the user has typed anything).
  const passwordScore = scorePassword(password);
  const showPasswordStrength = mode === "signup" && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        const credential = await signUpWithEmail(email.trim(), password);
        // Do NOT call setUser() here. The Firebase auth listener in
        // app/_layout.tsx is the single source of truth for "who is
        // signed in" and is already racing to set it. If we set the
        // user optimistically from this screen, there is a single
        // render between our setUser() and the listener's
        // setLoading(true) where the routing guard sees
        //   user: <User>, role: null, isLoading: false
        // and bounces the user to /role-selection — exactly the bug
        // they reported on June 27. Letting the listener handle it
        // alone keeps the routing guard blocked on isLoading the
        // entire time the Firestore role-fetch is in flight.
        setPendingEmail(credential.user.email ?? email.trim());
      } else {
        const credential = await loginWithEmail(email.trim(), password);
        // Same rationale as the signup branch above: do not call
        // setUser() here. The listener in _layout.tsx owns it.
        if (!credential.user.emailVerified) {
          // The account exists but the email link was never clicked.
          // Send them to the same "check your inbox" panel.
          setPendingEmail(credential.user.email ?? email.trim());
        }
        // If verified, the _layout.tsx guard routes on based on the
        // existence of `users/{uid}` in Firestore.
      }
    } catch (error: any) {
      const message = formatFirebaseError(
        error,
        mode === "signup"
          ? "Please check your email and password and try again."
          : "Please check your email and password and try again.",
      );

      // Provider-aware error handling: when Firebase says the
      // email is already in use, check which sign-in methods are
      // actually linked to this email. This prevents the infinite
      // loop where the app flips to login mode (expecting a password
      // credential) when the account was created via Google and has
      // no password.
      const e = error as { code?: string };
      if (mode === "signup" && e.code === "auth/email-already-in-use") {
        const methods = await getSignInMethodsForEmail(email.trim());

        // Only Google — no password credential exists. Guide the
        // user to use Google Sign-In instead of flipping to login.
        if (methods.length === 1 && methods[0] === "google.com") {
          Alert.alert(
            "Account already exists",
            'This email is linked to a Google account. Please use the "Continue with Google" button below to sign in.',
            [{ text: "OK" }],
          );
          return;
        }

        // No providers returned. This shouldn't happen when
        // `auth/email-already-in-use` was thrown (the email IS
        // registered), but `fetchSignInMethodsForEmail` can return
        // empty on network failure or backend inconsistency. Fall
        // through to the existing mode-flip logic below — it
        // correctly handles `auth/email-already-in-use` by flipping
        // to login mode.

        // Password (or password + Google) is present — flip to
        // login mode so the user can enter their password. The
        // existing mode-flip logic below handles this.
      }

      // Branch: if the error tells us the user is on the wrong
      // mode (e.g. they're in Sign up but the email is already
      // registered), flip the mode for them and let the form
      // re-render. This is the fix for the "I can't log in" bug
      // where users would hit a generic alert and give up.
      const flip = authErrorSuggestsModeFlip(error);
      if (flip && flip !== mode) {
        Alert.alert(
          mode === "signup"
            ? "Account already exists"
            : "We couldn't find that account",
          `${message}\n\nWe've switched you to ${
            flip === "login" ? "Log in" : "Sign up"
          } — try again with the same email.`,
          [{ text: "OK" }],
        );
        setMode(flip);
        return;
      }
      Alert.alert(
        mode === "signup" ? "Could not create account" : "Could not log in",
        message,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogle() {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      // Same rationale as handleSubmit: do NOT call setUser() here.
      // The auth listener in app/_layout.tsx is the single source of
      // truth and will set the user, fetch the role, and only then
      // release the routing guard.
      // Google users are auto-verified — _layout.tsx routes them on
      // based on whether their users/{uid} doc already exists.
    } catch (error: any) {
      Alert.alert(
        "Google sign-in failed",
        formatFirebaseError(error, "Please try again."),
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleResend() {
    if (isResending) return;
    setIsResending(true);
    try {
      await sendVerificationAgain();
      Alert.alert(
        "Verification email sent",
        "Please check your inbox and spam folder.",
      );
    } catch (error: any) {
      Alert.alert(
        "Could not resend",
        formatFirebaseError(error, "Please try again in a minute."),
      );
    } finally {
      setIsResending(false);
    }
  }

  /**
   * Re-read the current user from Firebase and re-check
   * `emailVerified`. `auth.currentUser.reload()` pulls a fresh token
   * claim from the server, so if the user just clicked the link in
   * their email we will see the verified flag flip to true on this
   * call. Without `reload()`, the local cached user object stays
   * stale and the layout guard refuses to advance.
   */
  async function handleCheckVerified() {
    if (isCheckingVerified) return;
    setIsCheckingVerified(true);
    try {
      const { getApp } = await import("@react-native-firebase/app");
      const { getAuth } = await import("@react-native-firebase/auth");
      const currentUser = getAuth(getApp()).currentUser;
      if (!currentUser) {
        Alert.alert("Session expired", "Please sign in again.");
        setPendingEmail(null);
        return;
      }
      await currentUser.reload();
      if (currentUser.emailVerified) {
        // Sync the local store with the (now-verified) user, then let
        // the _layout.tsx guard take over the routing.
        useAuthStore.getState().setUser(currentUser);
      } else {
        Alert.alert(
          "Not verified yet",
          "We haven't seen the verification click yet. Please tap the link in your email and try again.",
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Could not check verification",
        formatFirebaseError(error, "Please try again."),
      );
    } finally {
      setIsCheckingVerified(false);
    }
  }

  // ---- "pending" state — email sent, waiting for the user to click the link
  if (pendingEmail !== null) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerClassName="flex-grow px-5 pt-5 pb-5"
            keyboardShouldPersistTaps="handled"
          >
            <BackButton onPress={() => setPendingEmail(null)} />

            <View className="items-center gap-2 pt-4 mb-7">
              <View className="w-16 h-16 items-center justify-center rounded-pill bg-surface-muted mb-2">
                <Ionicons
                  color={colors.brand.accent}
                  name="mail-open-outline"
                  size={28}
                />
              </View>
              <View className="self-start border-b-2 border-accent pb-0.5 mb-1">
                <Text className="text-hero text-text-primary text-center">
                  Check your inbox
                </Text>
              </View>
              <Text
                className="text-body text-text-secondary text-center"
                style={{ maxWidth: 320 }}
              >
                We sent a verification link to{" "}
                <Text className="text-button text-text-primary">
                  {pendingEmail}
                </Text>
                . Tap the link, then come back and tap the button below.
              </Text>
            </View>

            <View className="gap-3 pt-4">
              <PrimaryButton
                label={isCheckingVerified ? "Checking..." : "I've verified — continue"}
                onPress={handleCheckVerified}
                loading={isCheckingVerified}
                disabled={isCheckingVerified}
              />

              <ResendButton
                isResending={isResending}
                onPress={handleResend}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ---- "form" state — collect email + password (and offer Google as
  // an alternative for users who'd rather not type a password)
  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow px-5 pt-5 pb-5"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2 mb-6">
            <View className="self-start border-b-2 border-accent pb-0.5 mb-1">
              <Text className="text-hero text-text-primary">
                {mode === "signup" ? "Create your account" : "Welcome back"}
              </Text>
            </View>
            <Text
              className="text-body text-text-secondary"
              style={{ maxWidth: 320 }}
            >
              {mode === "signup"
                ? "Sign up with email or Google."
                : "Enter the email and password you signed up with."}
            </Text>
          </View>

          {/* Mode toggle — Sign up / Log in pill at the top.
              Each child has a stable, unique `key` so React re-uses
              the existing Pressable instance across mode flips
              (instead of remounting it). The className also avoids
              `shadow-*` utilities (which emit CSS custom properties
              like `--tw-shadow-color`) and `:active`/`:hover`/
              `:focus` pseudo-classes. CssInterop tracks both:
              pseudo-classes flip `state.pressable` to
              `SHOULD_UPGRADE`, and CSS variables flip
              `state.variables` to `SHOULD_UPGRADE` — either path
              triggers `printUpgradeWarning`, which calls `stringify`
              on the component's props. The stringify walk can
              throw inside `Object.entries` and emit the
              `[CssInterop] Failed to enumerate component props.`
              warning. Press feedback is delivered via a
              `useState`-driven `transform` on the `style` prop
              instead, which RN's native renderer handles without
              CssInterop. The active side is differentiated by a
              literal `border` (no CSS variables) instead of a
              shadow. */}
          <View className="gap-1 p-1 rounded-md bg-surface-muted mb-6 flex-row">
            {(["signup", "login"] as Mode[]).map((item) => {
              const active = item === mode;
              const pressed = pressedMode === item;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  onPress={() => setMode(item)}
                  onPressIn={() => setPressedMode(item)}
                  onPressOut={() => setPressedMode(null)}
                  className={`flex-1 h-chip-sm rounded-sm items-center justify-center ${
                    active ? "bg-surface border border-border" : "bg-transparent"
                  }`}
                  style={({ pressed: rnPressed }) => [
                    // The `pressed` from RN's callback API is the
                    // native touch-down flag; combine it with our
                    // own state so the press feedback still fires
                    // after a tap completes (e.g. on tap-and-hold).
                    {
                      transform: [
                        { scale: pressed || rnPressed ? 0.97 : 1 },
                      ],
                    },
                  ]}
                >
                  <Text
                    className={`text-button ${
                      active ? "text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {item === "signup" ? "Sign up" : "Log in"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Email + password form */}
          <View className="gap-4">
            <View className="gap-1">
              <Text className="text-label text-ink-muted">
                Email
              </Text>
              <FieldShell
                value={email}
                error={email.length > 0 && !isEmailValid}
                valid={isEmailValid}
                className="h-input bg-surface rounded-card"
              >
                {({ onFocus, onBlur }) => (
                  <View className="h-input flex-row items-center px-3">
                    <Ionicons color={colors.text.muted} name="mail-outline" size={18} />
                    <TextInput
                      className="flex-1 ml-2 text-text-primary text-body-lg"
                      autoCapitalize="none"
                      autoComplete="email"
                      inputMode="email"
                      keyboardType="email-address"
                      onChangeText={setEmail}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.text.muted}
                      value={email}
                    />
                  </View>
                )}
              </FieldShell>
              {!isEmailValid && email.length > 0 ? (
                <Text className="text-caption text-danger">
                  Enter a valid email address.
                </Text>
              ) : null}
            </View>

            <View className="gap-1">
              <Text className="text-label text-ink-muted">
                Password
              </Text>
              <FieldShell
                value={password}
                error={password.length > 0 && !isPasswordValid}
                valid={false}
                className="h-input bg-surface rounded-card"
              >
                {({ onFocus, onBlur }) => (
                  <View className="h-input flex-row items-center px-3">
                    <TextInput
                      className="flex-1 text-text-primary text-body-lg"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onChangeText={setPassword}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="At least 6 characters"
                      placeholderTextColor={colors.text.muted}
                      secureTextEntry={!showPassword}
                      value={password}
                    />
                    <PasswordEyeToggle
                      showPassword={showPassword}
                      onToggle={() => setShowPassword((current) => !current)}
                    />
                  </View>
                )}
              </FieldShell>
              {!isPasswordValid && password.length > 0 ? (
                <Text className="text-caption text-danger">
                  Use at least 6 characters.
                </Text>
              ) : null}
              {showPasswordStrength ? (
                <PasswordStrengthBar score={passwordScore} />
              ) : null}
            </View>
          </View>

          {/* Primary CTA — email + password */}
          <View className="pt-6">
            <PrimaryButton
              label={isSubmitting
                ? "Sending..."
                : mode === "signup"
                  ? "Create account"
                  : "Log in"}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!canSubmit}
            />
          </View>

          {/* Divider with "or" — same visual language as the old
              auth entry screen, kept for visual continuity now that
              Google Sign-In lives on the same surface as email/password. */}
          <View className="flex-row items-center gap-3 my-5">
            <View className="flex-1 h-px bg-border" />
            <Text className="text-caption text-text-muted">or</Text>
            <View className="flex-1 h-px bg-border" />
          </View>

          {/* Google Sign-In secondary CTA. */}
          <GoogleSignInButton
            isGoogleLoading={isGoogleLoading}
            onPress={handleGoogle}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Press-scale sub-components ──────────────────────────────────────────────

function BackButton({ onPress }: { onPress: () => void }) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      hitSlop={12}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="min-h-touch self-start flex-row items-center gap-1 mb-4"
    >
      <Ionicons color={colors.brand.primary} name="chevron-back" size={18} />
      <Text className="text-body text-text-primary">Back</Text>
    </AnimatedPressable>
  );
}

function ResendButton({
  isResending,
  onPress,
}: {
  isResending: boolean;
  onPress: () => void;
}) {
  // Use the chip-pressed scale (slightly stronger than 0.96) because
  // this is a text-only link; the small scale keeps it tactile.
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.chipPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={isResending}
      accessibilityState={{ busy: isResending }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="min-h-pill-sm items-center justify-center flex-row gap-2"
    >
      {isResending ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : null}
      <Text className="text-button text-night">
        {isResending ? "Sending..." : "Resend verification email"}
      </Text>
    </AnimatedPressable>
  );
}

function PasswordEyeToggle({
  showPassword,
  onToggle,
}: {
  showPassword: boolean;
  onToggle: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
      accessibilityRole="button"
      onPress={onToggle}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={8}
      style={animatedStyle}
      className="w-11 h-11 items-center justify-center"
    >
      <Ionicons
        color={colors.text.muted}
        name={showPassword ? "eye-off-outline" : "eye-outline"}
        size={20}
      />
    </AnimatedPressable>
  );
}

function GoogleSignInButton({
  isGoogleLoading,
  onPress,
}: {
  isGoogleLoading: boolean;
  onPress: () => void;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ busy: isGoogleLoading }}
      disabled={isGoogleLoading}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="min-h-btn flex-row items-center justify-center gap-2 rounded-card bg-surface border-2 border-border"
    >
      {isGoogleLoading ? (
        <ActivityIndicator size="small" color={colors.brand.primary} />
      ) : (
        <Ionicons color={colors.brand.primary} name="logo-google" size={18} />
      )}
      <Text className="text-button text-text-primary">
        {isGoogleLoading ? "Opening Google..." : "Continue with Google"}
      </Text>
    </AnimatedPressable>
  );
}