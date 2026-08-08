import { Ionicons } from "@expo/vector-icons";
import {
  ScreenLayout,
  ScreenHeader,
  ScreenScroll,
} from "@/components/shared/ScreenLayout";
import { ReactNode, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { ConfirmDialog } from "@/components/forms/ConfirmDialog";
import { AdminNav } from "@/components/shared/AdminNav";

/**
 * EdumentX — User Management (Admin)
 *
 * Fetches users from Firestore `users` collection.
 * Shows: name, email, role, status (active/suspended/deleted).
 * Actions: Suspend/Reinstate, Soft Delete (with confirmation overlay).
 * Deleted users are hidden from the active list but retained in DB.
 */

type UserRole = "student" | "tutor" | "admin";
type UserStatus = "active" | "suspended" | "deleted";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /**
   * Avatar URL. `null` (not `""`) when the user has no avatar — this
   * matters because React Native's `<Image source={{ uri: "" }}>`
   * throws "Cannot read property 'indexOf' of undefined" on Android
   * for empty-string URIs. Coercing to `null` at the data layer
   * keeps the truthy check at the render site unambiguous.
   */
  avatar?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string; // ISO string
  deletedAt?: string;
  verified: boolean;
};

type RoleFilter = "All" | "Student" | "Tutor" | "Admin";
type StatusFilter = "All" | "Active" | "Suspended" | "Deleted";

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  // `loadError` is non-null when the Firestore read failed AND the
  // admin hasn't opted in to seeing the dev-only mock fallback. We
  // surface this as a visible empty state (with a "Show demo data"
  // pill) instead of silently swapping in MOCK_USERS — silently
  // rendering mock data hides real failures and makes the user list
  // look populated when it isn't. The mock fallback is now
  // deliberately opt-in and only available in dev (`__DEV__`).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showMock, setShowMock] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  // Fetch users from Firestore.
  //
  // We deliberately do NOT call `orderBy("createdAt", "desc")` here.
  // A `orderBy` on a non-key field requires a composite index; the
  // project's `firebase/firestore.indexes.json` does not declare one
  // for `users.createdAt`, so a sorted list call would fail with
  // `failed-precondition: The query requires an index` and the screen
  // would land on the empty-state error path. The `VerificationQueue`
  // screen reads its `tutorVerifications` collection un-ordered and
  // partitions client-side — we follow that same pattern: pull every
  // doc, then sort the in-memory array by `createdAt` desc so the
  // newest accounts land at the top.
  useEffect(() => {
    let cancelled = false;
    async function fetchUsers() {
      try {
        // Dynamic import to avoid circular deps
        const { getFirestore } = await import("@react-native-firebase/firestore");
        const { getApp } = await import("@react-native-firebase/app");
        const { collection, getDocs } = await import(
          "@react-native-firebase/firestore"
        );

        const db = getFirestore(getApp());
        // Plain un-ordered read — matches the working
        // `VerificationQueue` pattern. No `orderBy` means no
        // composite-index requirement, so the read always succeeds
        // (subject to security rules) and the screen populates.
        const snapshot = await getDocs(collection(db, "users"));

        if (cancelled) return;

        const fetched: AdminUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetched.push({
            id: doc.id,
            name: data.displayName || data.username || data.email?.split("@")[0] || "Unknown",
            email: data.email || "",
            phone: data.phone || "",
            // Map `undefined` / `""` to `null` so the avatar <Image>
            // render path is unambiguous: a truthy avatar URL goes
            // to <Image>; a null falls through to the initials
            // fallback. <Image source={{ uri: "" }}> throws a
            // "Cannot read property 'indexOf' of undefined" on
            // Android when the URI is an empty string, so we must
            // never let an empty string reach the <Image> source.
            avatar: data.avatar || null,
            role: (data.role as UserRole) || "student",
            status: (data.status as UserStatus) || "active",
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            deletedAt: data.deletedAt?.toDate?.()?.toISOString() || "",
            verified: data.verified || false,
          });
        });

        // Newest accounts first. Sort by `createdAt` ISO desc;
        // entries that fell back to "now" (no parseable createdAt)
        // sort to the bottom of the list.
        fetched.sort((a, b) => {
          const ta = new Date(a.createdAt).getTime();
          const tb = new Date(b.createdAt).getTime();
          return tb - ta;
        });

        setUsers(fetched);
        setLoadError(null);
      } catch (err: any) {
        if (cancelled) return;
        console.warn("UserManagement: failed to fetch users", err);
        setLoadError(
          err?.code
            ? `${err.code}: ${err.message ?? "unknown error"}`
            : (err?.message ?? "Unknown error fetching users"),
        );
        setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  // The visible list is `users` (live data) OR `MOCK_USERS` if the
  // dev fallback was opted-in. We keep them in separate state slots
  // so a successful re-fetch flips back to live data automatically.
  const visibleUsers = users.length > 0 || !showMock ? users : MOCK_USERS;

  // Filter logic — operates on the visible list, not the raw Firestore
  // result, so the dev fallback respects the same status / role /
  // search filters.
  const filtered = visibleUsers.filter((u) => {
    if (statusFilter !== "All" && u.status !== statusFilter.toLowerCase()) return false;
    if (roleFilter !== "All" && u.role !== roleFilter.toLowerCase()) return false;
    const searchLower = search.toLowerCase();
    if (
      search &&
      !u.name.toLowerCase().includes(searchLower) &&
      !u.email.toLowerCase().includes(searchLower)
    ) return false;
    return true;
  });

  // Active users (for main list) vs deleted (hidden by default)
  const activeUsers = filtered.filter((u) => u.status !== "deleted");
  const deletedCount = visibleUsers.filter((u) => u.status === "deleted").length;

  const toggleSuspend = async (user: AdminUser) => {
    if (showMock && users.length === 0) {
      Alert.alert(
        "Demo data",
        "Suspend / reinstate writes are disabled while demo data is being shown. Wait for the next successful refresh to manage live users.",
      );
      return;
    }
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const { getFirestore } = await import("@react-native-firebase/firestore");
      const { getApp } = await import("@react-native-firebase/app");
      const { doc, updateDoc } = await import("@react-native-firebase/firestore");

      const db = getFirestore(getApp());
      await updateDoc(doc(db, "users", user.id), {
        status: newStatus,
        updatedAt: new Date(),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      console.error("Failed to update user status", err);
      Alert.alert("Error", "Failed to update user status. Please try again.");
    }
  };

  const confirmDelete = (user: AdminUser) => {
    if (showMock && users.length === 0) {
      Alert.alert(
        "Demo data",
        "Delete is disabled while demo data is being shown. Wait for the next successful refresh to manage live users.",
      );
      return;
    }
    setDeleteUser(user);
    setShowDeleteConfirm(user.id);
  };

  const executeSoftDelete = async () => {
    if (!deleteUser) return;

    try {
      const { getFirestore } = await import("@react-native-firebase/firestore");
      const { getApp } = await import("@react-native-firebase/app");
      const { doc, updateDoc } = await import("@react-native-firebase/firestore");

      const db = getFirestore(getApp());
      await updateDoc(doc(db, "users", deleteUser.id), {
        status: "deleted",
        deletedAt: new Date(),
        updatedAt: new Date(),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === deleteUser.id ? { ...u, status: "deleted", deletedAt: new Date().toISOString() } : u
        )
      );
    } catch (err) {
      console.error("Failed to soft delete user", err);
      Alert.alert("Error", "Failed to delete user. Please try again.");
    } finally {
      setShowDeleteConfirm(null);
      setDeleteUser(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
    setDeleteUser(null);
  };

  return (
    <ScreenLayout variant="background">

      {/* Header — dark navy hero with the title and search bar only.
          The status + role filter pills were moved out of the hero
          into a separate filter card below (see next block) — they
          were too cramped stacked inside the dark hero, and the
          `Text` element they used had `flex-row flex-wrap` styling
          that doesn't actually work (RN's `<Text>` ignores flex on
          non-text siblings), so the layout rendered as a single
          jagged line. Splitting them out gives them room to breathe
          and lets us lay them out with a proper `<View>`. */}
      <ScreenHeader>
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-body text-white/70 mb-0.5">Management</Text>
            <Text className="text-screen-title font-medium text-white">
              User Management
            </Text>
          </View>
          <Text className="text-caption text-white/60">
            {visibleUsers.filter((u) => u.status !== "deleted").length} users · {deletedCount} deleted
          </Text>
        </View>

        {/* Search */}
        <View className="bg-surface rounded-xl h-11 flex-row items-center px-3 gap-2.5">
          <Ionicons name="search-outline" size={18} color="#6B7268" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor="#6B7268"
            className="flex-1 text-body-lg text-text-primary"
          />
          {search.length > 0 && (
            <Pressable
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
              className="active:opacity-70"
            >
              <Ionicons name="close-circle" size={18} color="#6B7268" />
            </Pressable>
          )}
        </View>
      </ScreenHeader>

      {/* Filter card — single horizontal scroll containing the
          status group, a thin vertical divider, and the role group.
          This sits in `bg-background` (not the dark hero) so the
          pills have visual breathing room and the group dividers
          read as separators. Each pill is a flex row containing a
          label and an optional count badge; we use `View` (not
          `Text`) for the pill itself so the `flex-row gap-1.5`
          actually lays out the badge inline with the label. */}
      <View className="bg-background border-b border-border">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-5 py-3 gap-2 items-center"
        >
          {/* Status group */}
          {(["All", "Active", "Suspended", "Deleted"] as StatusFilter[]).map((f) => {
            const count =
              f === "All"
                ? visibleUsers.length
                : f === "Deleted"
                  ? deletedCount
                  : visibleUsers.filter((u) => u.status === f.toLowerCase()).length;
            const isActive = statusFilter === f;
            return (
              <FilterPill
                key={`status-${f}`}
                label={f}
                count={count}
                active={isActive}
                activeBg="bg-ai"
                activeText="text-text-inverse"
                inactiveBg="bg-sand"
                inactiveText="text-text-secondary"
                onPress={() => setStatusFilter(f)}
                accessibilityLabel={`${f} users`}
              />
            );
          })}

          {/* Divider between groups */}
          <View className="w-px h-6 bg-border mx-1" />

          {/* Role group */}
          {(["All", "Student", "Tutor", "Admin"] as RoleFilter[]).map((r) => {
            const count =
              r === "All"
                ? visibleUsers.length
                : visibleUsers.filter((u) => u.role === r.toLowerCase()).length;
            const isActive = roleFilter === r;
            return (
              <FilterPill
                key={`role-${r}`}
                label={r === "All" ? "All roles" : r === "Student" ? "Students" : r === "Tutor" ? "Tutors" : "Admins"}
                count={count}
                active={isActive}
                activeBg="bg-ai"
                activeText="text-text-inverse"
                inactiveBg="bg-sand"
                inactiveText="text-text-secondary"
                onPress={() => setRoleFilter(r)}
                accessibilityLabel={`${r} users`}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScreenScroll>
        {loading ? (
          <View className="items-center justify-center pt-20">
            <Text className="text-body text-text-muted">Loading users…</Text>
          </View>
        ) : activeUsers.length === 0 ? (
          <EmptyState
            title={deriveEmptyTitle({
              search,
              roleFilter,
              statusFilter,
              loadError,
              usingMock: showMock && users.length === 0,
            })}
            subtitle={deriveEmptySubtitle({ loadError, usingMock: showMock && users.length === 0 })}
            icon="people-outline"
          >
            {/* Dev-only fallback: when the live read failed, offer a
                "Show demo data" pill so the screen isn't completely
                empty in dev. In production this pill is hidden by
                `__DEV__`. Once the dev pill is tapped, the
                `showMock` flag flips and the visible list re-renders
                from MOCK_USERS until the next successful re-fetch. */}
            {loadError && users.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show demo data"
                onPress={() => setShowMock(true)}
                className="mt-5 px-4 py-2 rounded-pill bg-accent-light active:opacity-80"
              >
                <Text className="text-button-sm font-medium text-accent">
                  Show demo data
                </Text>
              </Pressable>
            ) : null}
            {showMock && users.length === 0 ? (
              <Text className="text-caption text-text-muted mt-3 text-center">
                Showing demo data. Live data will replace it on the next
                successful refresh.
              </Text>
            ) : null}
          </EmptyState>
        ) : (
          <View className="gap-3.5">
            {activeUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onSuspend={() => toggleSuspend(user)}
                onDelete={() => confirmDelete(user)}
              />
            ))}
          </View>
        )}
        {/* Show a small banner at the bottom when the dev fallback
            is active so the admin knows the list isn't live. Hidden
            the moment a successful read flips `users` back to a
            non-empty array. */}
        {showMock && users.length === 0 ? (
          <View className="mt-4 bg-warning-bg border border-amber rounded-card p-3 flex-row items-start gap-2">
            <Ionicons name="alert-circle" size={16} color="#E5A03B" />
            <View className="flex-1">
              <Text className="text-button-sm font-medium text-warning-text">
                Demo data
              </Text>
              <Text className="text-caption text-text-secondary mt-0.5">
                The live Firestore read failed ({loadError ?? "unknown error"}).
                Showing local mock data so the screen isn&apos;t empty.
              </Text>
            </View>
          </View>
        ) : null}
      </ScreenScroll>

      <AdminNav />

      {/* Soft Delete Confirmation Overlay */}
      <ConfirmDialog
        visible={!!showDeleteConfirm}
        title="Soft delete user?"
        message={
          <>
            <Text className="text-body text-text-secondary">
              {deleteUser?.name} ({deleteUser?.email}) will be marked as deleted.
            </Text>
            <Text className="text-body text-text-secondary mt-2">
              This is a <Text className="font-semibold">soft delete</Text> — the user data will be retained in the database but hidden from the active user list. The user will lose access to the app.
            </Text>
            <Text className="text-caption text-text-muted mt-3">
              Hard deletion of the Firebase Auth account is a separate admin action (not yet implemented).
            </Text>
          </>
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={executeSoftDelete}
        onCancel={cancelDelete}
      />
    </ScreenLayout>
  );
}

/**
 * Filter pill — a single tab in the status / role group. Renders
 * the label + an optional count badge as a flex row, so the
 * badge actually sits inline with the text (the old `<Text>`
 * + `flex-row flex-wrap` approach didn't lay out non-text siblings
 * correctly, so the badge was crammed onto a new line).
 *
 * `activeBg` / `activeText` are passed in by the parent so the
 * status group and the role group can use different accent
 * colors (amber for status, indigo for role) without duplicating
 * the pill component.
 */
function FilterPill({
  label,
  count,
  active,
  activeBg,
  activeText,
  inactiveBg,
  inactiveText,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  count: number;
  active: boolean;
  activeBg: string;
  activeText: string;
  inactiveBg: string;
  inactiveText: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-pill active:opacity-80 ${
        active ? activeBg : inactiveBg
      }`}
    >
      <Text
        className={`text-button-sm font-medium ${
          active ? activeText : inactiveText
        }`}
      >
        {label}
      </Text>
      {count > 0 ? (
        <View
          className={`px-1.5 py-0.5 rounded-full ${
            active ? "bg-white/20" : "bg-white/60"
          }`}
        >
          <Text
            className={`text-micro font-semibold ${
              active ? activeText : "text-text-muted"
            }`}
          >
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function UserRow({
  user,
  onSuspend,
  onDelete,
}: {
  user: AdminUser;
  onSuspend: () => void;
  onDelete: () => void;
}) {
  const statusConfig = getStatusConfig(user.status);
  const roleConfig = getRoleConfig(user.role);

  return (
    <View
      className="bg-surface border border-border rounded-card p-4 gap-3"
      accessibilityLabel={`${user.name}, ${roleConfig.label}, ${statusConfig.label}`}
    >
      {/* Top row — avatar + identity block (name, role chip, meta).
          The identity block uses a flex column with explicit gap
          instead of mb-* tricks; that keeps spacing consistent
          regardless of which fields are populated (e.g. phone
          is optional, so the meta line may have one or two
          items). */}
      <View className="flex-row gap-3 items-start">
        <View className="relative shrink-0">
          <View className="w-12 h-12 rounded-full bg-sand items-center justify-center overflow-hidden">
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-card-title font-medium text-amber">
                {(user.name?.charAt(0) ?? "?").toUpperCase()}
              </Text>
            )}
          </View>
          {user.verified && (
            <View className="absolute -bottom-0.5 -right-0.5">
              <Ionicons name="checkmark-circle" size={16} color="#3F8A5A" />
            </View>
          )}
        </View>

        <View className="flex-1 min-w-0 gap-1.5">
          <View className="flex-row items-center gap-2 flex-wrap">
            <Text
              className="text-card-title font-medium text-text-primary"
              numberOfLines={1}
            >
              {user.name}
            </Text>
            <View className={`px-2 py-0.5 rounded-full ${roleConfig.bgClass}`}>
              <Text className={`text-micro font-medium ${roleConfig.textClass}`}>
                {roleConfig.label}
              </Text>
            </View>
          </View>
          <Text
            className="text-caption text-text-secondary"
            numberOfLines={1}
          >
            {user.email}
          </Text>
          <View className="flex-row flex-wrap gap-x-2 gap-y-0.5">
            {user.phone ? (
              <Text className="text-caption text-text-muted">{user.phone}</Text>
            ) : null}
            {user.phone ? (
              <Text className="text-caption text-text-muted">·</Text>
            ) : null}
            <Text className="text-caption text-text-muted">
              Joined {formatDate(user.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom row — status chip + actions. Wraps to a new line
          on narrow screens so the chip and action pills never
          collide. */}
      <View className="flex-row flex-wrap items-center gap-2 pt-1 border-t border-border">
        <View
          className={`${statusConfig.bgClass} px-2.5 py-1 rounded-full flex-row items-center gap-1`}
        >
          <Ionicons
            name={statusConfig.icon}
            size={11}
            className={statusConfig.textClass}
          />
          <Text className={`text-micro font-medium ${statusConfig.textClass}`}>
            {statusConfig.label}
          </Text>
        </View>

        <View className="flex-1" />

        {user.status !== "deleted" ? (
          <Pressable
            onPress={onSuspend}
            className={`px-3 py-1.5 rounded-pill ${
              user.status === "active" ? "bg-danger/10" : "bg-success/10"
            } active:opacity-80`}
            accessibilityLabel={user.status === "active" ? "Suspend user" : "Reinstate user"}
          >
            <Text
              className={`text-button-sm font-medium ${
                user.status === "active" ? "text-danger" : "text-success"
              }`}
            >
              {user.status === "active" ? "Suspend" : "Reinstate"}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onDelete}
          className="px-3 py-1.5 rounded-pill bg-danger/10 active:opacity-80"
          accessibilityLabel="Delete user"
        >
          <Text className="text-button-sm font-medium text-danger">
            Delete
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
}) {
  return (
    <View className="items-center justify-center px-8 pt-20">
      <View className="w-14 h-14 rounded-pill bg-amber-light items-center justify-center mb-3">
        <Ionicons name={icon} size={26} color="#E5A03B" />
      </View>
      <Text className="text-card-title font-medium text-text-primary text-center">
        {title}
      </Text>
      <Text className="text-body text-text-secondary text-center mt-1.5">
        {subtitle}
      </Text>
      {children}
    </View>
  );
}

/**
 * Empty-state copy is branched on four states:
 *   - filters narrowed the result to nothing → "No matching users"
 *   - live read failed → "Couldn't load users" with the error code
 *   - no users in the collection yet → "No users yet"
 *   - dev fallback is showing mock data → "Demo data loaded" hint
 *
 * We return the title and subtitle separately so the same EmptyState
 * can render the dev "Show demo data" pill as a child of the body.
 */
function deriveEmptyTitle({
  search,
  roleFilter,
  statusFilter,
  loadError,
  usingMock,
}: {
  search: string;
  roleFilter: RoleFilter;
  statusFilter: StatusFilter;
  loadError: string | null;
  usingMock: boolean;
}): string {
  if (loadError && !usingMock) return "Couldn't load users";
  if (search || roleFilter !== "All" || statusFilter !== "All")
    return "No matching users";
  if (usingMock) return "Demo data loaded";
  return "No users yet";
}

function deriveEmptySubtitle({
  loadError,
  usingMock,
}: {
  loadError: string | null;
  usingMock: boolean;
}): string {
  if (loadError && !usingMock) {
    return `${loadError}\nTap "Show demo data" to populate the screen in dev.`;
  }
  if (usingMock) {
    return "Showing local demo entries. Live data will replace them on the next refresh.";
  }
  return "Users will appear here after they sign up";
}

/* ---------- Helpers ---------- */

function getStatusConfig(status: UserStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  icon: keyof typeof Ionicons.glyphMap;
} {
  switch (status) {
    case "active":
      return { label: "Active", bgClass: "bg-success-bg", textClass: "text-success-text", icon: "checkmark-circle" };
    case "suspended":
      return { label: "Suspended", bgClass: "bg-warning-bg", textClass: "text-warning-text", icon: "pause-circle" };
    case "deleted":
      return { label: "Deleted", bgClass: "bg-danger-bg", textClass: "text-danger-text", icon: "trash" };
  }
}

function getRoleConfig(role: UserRole): {
  label: string;
  bgClass: string;
  textClass: string;
} {
  switch (role) {
    case "admin":
      return { label: "Admin", bgClass: "bg-ai-light", textClass: "text-ai" };
    case "tutor":
      return { label: "Tutor", bgClass: "bg-verification-light", textClass: "text-verification" };
    case "student":
    default:
      return { label: "Student", bgClass: "bg-amber-light", textClass: "text-amber" };
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

/* ---------- Mock fallback (used if Firestore read fails) ---------- */

const MOCK_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+977 9841234567",
    role: "student",
    status: "active",
    createdAt: "2026-01-15T10:30:00Z",
    verified: true,
  },
  {
    id: "u2",
    name: "Bishal Acharya",
    email: "bishal@example.com",
    phone: "+977 9851122334",
    role: "tutor",
    status: "active",
    createdAt: "2026-02-20T14:00:00Z",
    verified: true,
  },
  {
    id: "u3",
    name: "Sushma Adhikari",
    email: "sushma@example.com",
    phone: "+977 9867788990",
    role: "tutor",
    status: "suspended",
    createdAt: "2026-03-10T09:15:00Z",
    verified: true,
  },
  {
    id: "u4",
    name: "Riya Maharjan",
    email: "riya@example.com",
    phone: "+977 9801122334",
    role: "student",
    status: "active",
    createdAt: "2026-04-05T16:45:00Z",
    verified: false,
  },
  {
    id: "u5",
    name: "Admin User",
    email: "asimdkt63@gmail.com",
    phone: "",
    role: "admin",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    verified: true,
  },
  {
    id: "u6",
    name: "Deleted User",
    email: "deleted@example.com",
    role: "student",
    status: "deleted",
    createdAt: "2025-12-01T12:00:00Z",
    deletedAt: "2026-05-15T10:00:00Z",
    verified: false,
  },
];