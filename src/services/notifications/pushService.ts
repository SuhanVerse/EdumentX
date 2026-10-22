import { getApp } from "@react-native-firebase/app";
import { getAuth } from "@react-native-firebase/auth";
import {
  doc,
  arrayRemove,
  arrayUnion,
  collection,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { AppState, Platform } from "react-native";

import { markNotificationRead } from "@/lib/verification/notifications";

/**
 * EdumentX — Push notification layer (zero-budget).
 *
 * Uses `expo-notifications` (free) instead of OneSignal or a paid
 * push API. On Android the SDK talks to FCM under the hood via the
 * `expo-notifications` config plugin + the existing
 * `google-services.json`; on iOS it uses APNs. Tokens are registered
 * with the **Expo Push Service** (free, no card) so a future
 * server-less send path can POST to `exp.host/--/api/v2/push/send`
 * directly from a client.
 *
 * Three responsibilities:
 *   1. `requestPushPermission()` — the system permission prompt.
 *   2. `registerPushToken(uid)` — store the device's Expo push token
 *      on `users/{uid}.pushTokens` (owner write, rules-safe) so the
 *      device is addressable later.
 *   3. `subscribeInboxNotifications(uid)` — mirror NEW unread docs
 *      in the `notifications/{uid}/items` subcollection (history
 *      model — one doc per notification) as immediate local
 *      notifications. This is the demo's "push" while the app is
 *      backgrounded: the moment an admin / tutor / student writes to
 *      their inbox the OS tray shows a heads-up banner — no server.
 *      While the app is open the in-app notification bar
 *      (`useInAppNotifications`) handles the alert instead, so the
 *      mirror skips the foreground case (no double alerting).
 *
 * All failures are non-fatal and console-warned — notification setup
 * must never block auth or navigation.
 */

/** Android channel for inbox-mirror notifications (Android 8+
 *  requires a channel to be created before any notification shows). */
const INBOX_CHANNEL_ID = "inbox";

/**
 * Category that attaches the spec's tray action buttons — "Mark as
 * Read" and "Dismiss" — to every inbox notification. Registered via
 * `setNotificationCategoryAsync` and attached to each local
 * notification through `content.categoryIdentifier`.
 */
const INBOX_CATEGORY_ID = "inbox-actions";
const ACTION_MARK_READ = "mark_read";
const ACTION_DISMISS = "dismiss";

/** Module-level flag — the category only needs registering once per
 *  app session; re-registering the same id on every auth-state change
 *  is idempotent but wasteful. */
let categoriesRegistered = false;

// A generation invalidates work that is still waiting on native APIs.
// Token ownership here is intentionally device-local and in-memory; it
// cannot repair unknown legacy ownership after reinstall/forced signout.
let generation = 0;
let activeUid: string | null = null;
let closingUid: string | null = null;
let registrationQueue: Promise<void> = Promise.resolve();
const registrations = new Map<string, Set<Promise<void>>>();
const deviceTokens = new Map<string, Set<string>>();

function currentSession(uid: string, version: number): boolean {
  return generation === version && activeUid === uid && closingUid !== uid
    && getAuth(getApp()).currentUser?.uid === uid;
}

function isCurrentRecipient(recipientUid: unknown): boolean {
  return typeof recipientUid === "string" && activeUid === recipientUid
    && closingUid !== recipientUid
    && getAuth(getApp()).currentUser?.uid === recipientUid;
}

/**
 * Register the action-button category. Runs once per init; failures
 * are non-fatal (notifications still show, just without buttons).
 * Categories can be registered from the JS thread at any time.
 */
async function ensureNotificationCategories(): Promise<void> {
  if (Platform.OS === "web" || categoriesRegistered) return;
  try {
    await Notifications.setNotificationCategoryAsync(INBOX_CATEGORY_ID, [
      {
        identifier: ACTION_MARK_READ,
        buttonTitle: "Mark as Read",
        // Opens the app so the Firestore write reliably lands even in
        // Expo Go (background action delivery is limited there). The
        // tray item is auto-dismissed by the OS on tap either way.
        options: { opensAppToForeground: true },
      },
      {
        identifier: ACTION_DISMISS,
        buttonTitle: "Dismiss",
        // Tray-only: the OS auto-dismisses the item on tap. Stays
        // unread in-app (spec: Dismiss ≠ read) — no write needed, so
        // the app never has to wake.
        options: { opensAppToForeground: false },
      },
    ]);
    // Only mark done on success so a transient failure retries on the
    // next init instead of silently losing the buttons forever.
    categoriesRegistered = true;
  } catch (err) {
    console.warn("[pushService] notification category setup failed", err);
  }
}

/**
 * Handle taps on the OS tray notification.
 *
 *   - "mark_read" action → flip `read` on the Firestore doc (same
 *     write the center does); the tray item auto-dismissed by the OS.
 *   - "dismiss" action   → tray-only; the OS auto-dismissed the item,
 *     the doc stays unread and visible in-app (badge untouched).
 *   - body tap            → open the notification center.
 *
 * The action identifiers come from the `INBOX_CATEGORY_ID` category;
 * a plain body tap reports `DEFAULT_ACTION_IDENTIFIER`.
 */
function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): void {
  const data = response.notification.request.content.data as
    | { notificationId?: string; recipientUid?: string }
    | undefined;
  const { notificationId, recipientUid } = data ?? {};
  if (!isCurrentRecipient(recipientUid)) return;

  if (response.actionIdentifier === ACTION_MARK_READ) {
    if (!notificationId || !recipientUid) return;
    void markNotificationRead(recipientUid, notificationId).catch((err) =>
      console.warn("[pushService] mark-read action failed", err),
    );
    return;
  }

  if (response.actionIdentifier === ACTION_DISMISS) {
    // Nothing to persist — Dismiss is tray-only by design.
    return;
  }

  // Default action = the user tapped the notification body. On a cold
  // start the navigator may not be mounted yet when the response
  // arrives — swallow the failure rather than crash the launch (the
  // rest of the app gates navigation on `useRootNavigationState()`,
  // which isn't available from this non-component module).
  if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
    try {
      router.push("/notification");
    } catch (err) {
      console.warn("[pushService] notification deep-link failed", err);
    }
  }
}

/**
 * Foreground presentation handler. iOS does not present notifications
 * while the app is in the foreground unless this is configured — this
 * makes both scheduled local notifications and (future) remote pushes
 * show a banner + lock-screen row while the user is inside the app.
 * Guarded off the web build (the web SDK treats the handler as a
 * no-op, but we avoid the module being touched at import there).
 */
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = isCurrentRecipient(notification.request.content.data?.recipientUid);
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    },
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(INBOX_CHANNEL_ID, {
    name: "Inbox notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Ask for notification permission (the system prompt). Android 13+
 * shows the POST_NOTIFICATIONS runtime prompt; iOS shows the APNs
 * prompt. Web (dev only) is skipped — no push on the browser build.
 * Returns whether the user granted permission.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await ensureAndroidChannel().catch(() => {
    /* channel setup failing shouldn't block the prompt */
  });
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === "granted") return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === "granted";
  } catch (err) {
    console.warn("[pushService] permission request failed", err);
    return false;
  }
}

/**
 * Register the device's Expo push token on `users/{uid}.pushTokens`.
 * Skips simulators / emulators (they have no FCM/APNs identity) and
 * the web build. The write goes through the owner-only user-doc rule
 * — we include `uid` explicitly and use `setDoc` + merge so
 * `request.resource.data.uid == userId` always passes.
 */
export function registerPushToken(
  uid: string,
  devicePushToken?: Notifications.DevicePushToken,
): Promise<void> {
  const version = generation;
  if (Platform.OS === "web" || !Device.isDevice || !currentSession(uid, version)) {
    return Promise.resolve();
  }
  const task = registrationQueue.then(async () => {
    if (!currentSession(uid, version)) return;
    const granted = await requestPushPermission();
    if (!granted || !currentSession(uid, version)) return;

    const easExtra = Constants.expoConfig?.extra as
      | { eas?: { projectId?: string } }
      | undefined;
    const projectId = easExtra?.eas?.projectId;
    // The listener supplies a native token. Passing it through avoids
    // getDevicePushTokenAsync emitting the same event recursively.
    const token = await Notifications.getExpoPushTokenAsync({ projectId, devicePushToken });
    const tokenValue = token?.data;
    if (!tokenValue) return;

    // Record even a late acquisition so explicit logout can detach a
    // token that was registered during an earlier app session.
    const owned = deviceTokens.get(uid) ?? new Set<string>();
    owned.add(tokenValue);
    deviceTokens.set(uid, owned);
    if (!currentSession(uid, version)) return;

    const db = getFirestore(getApp());
    await setDoc(
      doc(db, "users", uid),
      { uid, pushTokens: arrayUnion(tokenValue) },
      { merge: true },
    );
  }).catch(() => {
    console.warn("[pushService] push token registration failed");
  });
  registrationQueue = task;
  const pending = registrations.get(uid) ?? new Set<Promise<void>>();
  pending.add(task);
  registrations.set(uid, pending);
  void task.then(() => {
    pending.delete(task);
    if (pending.size === 0) registrations.delete(uid);
  });
  return task;
}

/** Await server detachment while the owner is still authenticated.
 * Rejecting this operation must prevent an explicit Firebase logout.
 * Unmount cleanup alone must never perform privileged user-doc writes. */
export function detachPushForUser(uid: string): Promise<void> {
  if (getAuth(getApp()).currentUser?.uid !== uid) {
    return Promise.reject(new Error("Your account changed. Please try signing out again."));
  }
  closingUid = uid;
  stopInboxSync(); // Invalidate synchronously, before the first await.
  const version = generation;
  let expired = false;
  let timer: ReturnType<typeof setTimeout>;
  // Native Firestore promises may stay pending while offline. The
  // session stays signed in and retryable instead of hanging forever.
  const deadline = new Promise<void>((_resolve, reject) => {
    timer = setTimeout(() => {
      expired = true;
      reject(new Error("Notification cleanup timed out. Please try again."));
    }, 10_000);
  });
  const assertClosing = () => {
    if (expired || generation !== version || getAuth(getApp()).currentUser?.uid !== uid) {
      throw new Error("Notification cleanup was interrupted. Please try again.");
    }
  };
  const cleanup = (async () => {
    await Promise.all([...(registrations.get(uid) ?? [])]);
    assertClosing();
    // A rejected registration may still have acquired a candidate
    // token. Its removal, rather than a historical registration error,
    // determines whether explicit logout can safely proceed.
    const tokens = [...(deviceTokens.get(uid) ?? [])];
    if (tokens.length > 0) {
      // updateDoc avoids recreating a deleted user document. Never remove
      // another phone's tokens by replacing the entire array.
      await updateDoc(doc(getFirestore(getApp()), "users", uid), {
        pushTokens: arrayRemove(...tokens),
      });
      assertClosing();
      deviceTokens.delete(uid);
    }
    if (Platform.OS !== "web") {
      await Promise.all([
        Notifications.cancelAllScheduledNotificationsAsync(),
        Notifications.dismissAllNotificationsAsync(),
        Notifications.clearLastNotificationResponseAsync(),
      ]);
      assertClosing();
    }
  })();
  return Promise.race([cleanup, deadline]).finally(() => clearTimeout(timer));
}

/** Show an immediate local notification (heads-up banner). */
async function postLocalNotification(opts: {
  /** The notification doc id (for mark-read via the response). */
  notificationId: string;
  /** The inbox owner uid (same doc path segment). */
  recipientUid: string;
  type?: string;
}, version: number): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await ensureAndroidChannel();
    if (!currentSession(opts.recipientUid, version)) return;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "EdumentX",
        body: "You have an update. Open EdumentX to view it.",
        sound: "default",
        // Attaches the action buttons to the tray item.
        categoryIdentifier: INBOX_CATEGORY_ID,
        data: {
          notificationId: opts.notificationId,
          recipientUid: opts.recipientUid,
          type: opts.type ?? "",
        },
      },
      trigger: null, // fire immediately
    });
    if (!currentSession(opts.recipientUid, version)) {
      await Notifications.dismissNotificationAsync(id);
    }
  } catch (err) {
    console.warn("[pushService] local notification failed", err);
  }
}

/**
 * Subscribe to the user's `notifications/{uid}/items` unread
 * subcollection (history model — one doc per notification) and post
 * a local notification for every NEW unread doc that appears.
 *
 * The rules permit `create` from an admin/peer and `update` of just
 * `["read", "readAt"]`, so a doc leaves this query once it's marked
 * read.
 *
 * To avoid re-alerting on every snapshot we dedupe by DOC ID — a
 * fresh write creates a new doc id, but a server-side heartbeat /
 * cache replay returns the same ids. The first snapshot is treated
 * as the seen baseline (no banner on app-open, even if the inbox
 * has unread items from a previous session). Foreground is the
 * in-app notification bar's job, so the mirror only posts when the
 * app is backgrounded / inactive. Returns an unsubscribe function.
 */
export function subscribeInboxNotifications(uid: string): () => void {
  const version = generation;
  const db = getFirestore(getApp());
  const q = query(
    collection(db, "notifications", uid, "items"),
    where("read", "==", false),
  );
  const seenIds = new Set<string>();
  let firstSnapshot = true;

  return onSnapshot(
    q,
    (snap) => {
      if (!currentSession(uid, version)) return;
      // Baseline: remember the current unread doc ids so opening the
      // app doesn't re-alert for already-known unread content.
      if (firstSnapshot) {
        firstSnapshot = false;
        snap.docs.forEach((d) => seenIds.add(d.id));
        return;
      }

      for (const docSnap of snap.docs) {
        if (seenIds.has(docSnap.id)) continue;
        seenIds.add(docSnap.id);

        // Foreground is the in-app notification bar's job
        // (`useInAppNotifications`) — posting a local notification
        // here as well would double-alert the user. Only reach the
        // OS tray when the app is backgrounded / inactive.
        if (AppState.currentState === "active") continue;

        const data = docSnap.data() as
          | { type?: string }
          | undefined;
        void postLocalNotification({
          notificationId: docSnap.id,
          recipientUid: uid,
          type: data?.type,
        }, version);
      }
    },
    (err) => {
      console.warn("[pushService] inbox sync failed", err);
    },
  );
}

/** Module-level handle so re-init (re-login, uid change) never stacks
 *  duplicate inbox listeners. */
let inboxUnsub: (() => void) | null = null;
let responseUnsub: (() => void) | null = null;
let rotationUnsub: (() => void) | null = null;

/** Tear down the inbox listener + response listener (call on
 *  sign-out / unmount so they never stack across uid changes). */
export function stopInboxSync(): void {
  generation += 1;
  activeUid = null;
  inboxUnsub?.();
  inboxUnsub = null;
  responseUnsub?.();
  responseUnsub = null;
  rotationUnsub?.();
  rotationUnsub = null;
}

/**
 * Wire the push layer for the current user. Non-blocking: token
 * registration runs in the background and failures are swallowed.
 * Pass `null` (signed out) to tear everything down.
 */
export function initPushForUser(uid: string | null, resumeAfterFailedLogout = false): void {
  if (uid && closingUid === uid && !resumeAfterFailedLogout) return;
  stopInboxSync();
  if (!uid) {
    closingUid = null;
    return;
  }
  if (getAuth(getApp()).currentUser?.uid !== uid) return;
  // A failed explicit logout may resume the same authenticated user.
  closingUid = null;
  activeUid = uid;
  void registerPushToken(uid);
  inboxUnsub = subscribeInboxNotifications(uid);
  // Attach the tray action buttons + handle their taps. The category
  // registration is fire-and-forget; the response listener must be
  // live before a backgrounded notification can be acted on.
  if (Platform.OS !== "web") {
    void ensureNotificationCategories();
    // `addNotificationResponseReceivedListener` returns an
    // `EventSubscription` — wrap it so `responseUnsub` keeps the
    // `() => void` shape the rest of the module uses.
    const sub = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );
    responseUnsub = () => sub.remove();
    const version = generation;
    const rotation = Notifications.addPushTokenListener((token) => {
      if (currentSession(uid, version)) void registerPushToken(uid, token);
    });
    rotationUnsub = () => rotation.remove();
  }
}
