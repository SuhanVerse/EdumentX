import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { AnimatedPressable, usePressScale } from "@/components/motion";
import { ImageViewer } from "@/components/ui/ImageViewer";
import { VideoViewerModal } from "@/components/ui/VideoViewer";
import { colors } from "@/constants/colors";
import { motion } from "@/lib/motion";
import {
  TUTOR_DOC_HELPER,
  TUTOR_DOC_LABEL,
  formatBytes,
  pickAndUploadTutorDoc,
  type TutorDocKind,
  type TutorDocument,
} from "@/lib/verification/documents";
import { getVerificationDocPublicUrl } from "@/services/supabase/storage";

/**
 * EdumentX — Single-slot document uploader.
 *
 * One row in the tutor profile form: an icon + label + helper
 * text on the left, an action button (Upload / Replace) on the
 * right. Renders an inline progress + result state during upload
 * so the user can see what's happening.
 *
 * Used by:
 *   - `screens/auth/TutorProfileScreen.tsx` (initial onboarding)
 *   - `screens/tutor/EditTeachingDetails.tsx` (later edits)
 *
 * The component is *uncontrolled* about success — the parent owns
 * the `documents` array. The uploader calls `onUploaded` /
 * `onReplaced` with the new `TutorDocument` so the parent can
 * decide whether to also stamp the verification doc.
 */
export function DocumentUploader({
  kind,
  existing,
  onUploaded,
}: {
  kind: TutorDocKind;
  /** The current doc (if any) for this kind. `null` when the user
   *  hasn't uploaded yet. */
  existing: TutorDocument | null;
  /** Called with the new `TutorDocument` after a successful upload.
   *  Parents should treat this as a *replacement* for any prior
   *  doc of the same kind — re-uploading a kind overwrites the
   *  Supabase path (the storage helper uses `upsert: true`). */
  onUploaded: (doc: TutorDocument) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handlePick() {
    setUploading(true);
    try {
      // Lazy-require the auth uid so the call site can mount the
      // component before sign-in completes (it just disables the
      // button instead).
      const { getApp } = await import("@react-native-firebase/app");
      const { getAuth } = await import("@react-native-firebase/auth");
      const uid = getAuth(getApp()).currentUser?.uid;
      if (!uid) {
        Alert.alert("Not signed in", "Please sign in to upload documents.");
        return;
      }
      const result = await pickAndUploadTutorDoc(uid, kind);
      if (result.ok) {
        onUploaded(result.document);
      } else if (result.reason !== "cancelled") {
        Alert.alert(
          "Upload failed",
          result.message ?? "Please try again with a smaller file.",
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Please try again.";
      Alert.alert("Upload failed", message);
    } finally {
      setUploading(false);
    }
  }

  const hasExisting = !!existing;
  const accent = kindAccent(kind);
  return (
    <View
      className={`rounded-card border bg-surface p-4 ${
        hasExisting ? "border-verification/40" : "border-dashed border-border"
      }`}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`w-11 h-11 rounded-lg items-center justify-center ${accent.bg}`}
        >
          <Ionicons
            name={kindIconName(kind)}
            size={20}
            color={accent.fg}
          />
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between">
            <Text className="text-button-sm font-medium text-text-primary">
              {TUTOR_DOC_LABEL[kind]}
            </Text>
            {hasExisting ? (
              <View className="flex-row items-center gap-1 bg-verification-light px-2 py-0.5 rounded-pill">
                <Ionicons name="checkmark-circle" size={11} color={colors.brand.verification} />
                <Text className="text-micro font-medium text-verification">
                  Uploaded
                </Text>
              </View>
            ) : kind === "demo" ? (
              <View className="bg-sand px-2 py-0.5 rounded-pill">
                <Text className="text-micro font-medium text-text-muted">
                  Optional
                </Text>
              </View>
            ) : (
              <View className="bg-warning-bg px-2 py-0.5 rounded-pill">
                <Text className="text-micro font-medium text-warning-text">
                  Required
                </Text>
              </View>
            )}
          </View>
          <Text className="text-caption text-text-muted mt-1">
            {TUTOR_DOC_HELPER[kind]}
          </Text>
          {hasExisting ? (
            <>
              {/* Image thumbnail preview for image-type documents
                  (citizenship, certificate). Uses the same ImageViewer
                  component as the admin VerificationQueue and the tutor
                  profile document list. */}
              {existing && (existing.kind === "citizenship" || existing.kind === "certificate") ? (
                <View className="mt-2">
                  <ImageViewer
                    uri={(() => {
                      try {
                        const url = getVerificationDocPublicUrl(existing.path);
                        // Cache-bust: append uploadedAt timestamp so a
                        // re-upload to the same Supabase path doesn't
                        // show the old cached image.
                        if (existing.uploadedAt) {
                          return `${url}?t=${encodeURIComponent(existing.uploadedAt)}`;
                        }
                        return url;
                      } catch {
                        return "";
                      }
                    })()}
                    label={TUTOR_DOC_LABEL[existing.kind]}
                    thumbnailWidth={72}
                    thumbnailHeight={54}
                  />
                </View>
              ) : null}
              <Text
                className="text-caption text-text-secondary mt-2"
                numberOfLines={1}
              >
                {formatBytes(existing!.bytes)}
              </Text>
            </>
          ) : null}
          <DocumentUploaderButton
            handlePick={handlePick}
            uploading={uploading}
            hasExisting={hasExisting}
            label={TUTOR_DOC_LABEL[kind]}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * The Upload / Replace pill — extracted as a sub-component so the
 * `usePressScale` hook can run per-instance and the inline
 * `ActivityIndicator` (the project's reference "button hosts spinner"
 * pattern) is kept inside the pill itself.
 */
function DocumentUploaderButton({
  handlePick,
  uploading,
  hasExisting,
  label,
}: {
  handlePick: () => void;
  uploading: boolean;
  hasExisting: boolean;
  label: string;
}) {
  const { onPressIn, onPressOut, animatedStyle } = usePressScale();

  return (
    <AnimatedPressable
      onPress={handlePick}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={uploading}
      accessibilityRole="button"
      accessibilityLabel={
        hasExisting ? `Replace ${label}` : `Upload ${label}`
      }
      style={animatedStyle}
      className={`mt-3 self-start flex-row items-center gap-1.5 px-3 py-1.5 rounded-pill ${
        hasExisting
          ? "bg-surface border border-border"
          : "bg-amber border-2 border-border"
      } disabled:opacity-60`}
    >
      {uploading ? (
        <ActivityIndicator size="small" color={colors.text.primary} />
      ) : (
        <Ionicons
          name={hasExisting ? "refresh" : "cloud-upload-outline"}
          size={14}
          color={colors.text.primary}
        />
      )}
      <Text
        className={`text-button-sm font-medium ${
          hasExisting ? "text-text-primary" : "text-black"
        }`}
      >
        {uploading
          ? "Uploading…"
          : hasExisting
            ? "Replace"
            : "Upload"}
      </Text>
    </AnimatedPressable>
  );
}

/**
 * Read-only list of the tutor's three documents. Used on the
 * edit profile screen so the tutor can see what they've
 * submitted without scrolling through the onboarding form.
 *
 * Renders an empty-state hint if any of the required docs are
 * missing — clicking the hint opens the documents section in
 * the (new) high-risk edit screen, so the tutor doesn't have
 * to dig through the navigation.
 */
export function TutorDocumentList({
  documents,
}: {
  documents: TutorDocument[];
}) {
  const byKind = new Map<TutorDocKind, TutorDocument>();
  documents.forEach((d) => byKind.set(d.kind, d));

  const requiredKinds: TutorDocKind[] = ["citizenship", "certificate"];
  const missing = requiredKinds.filter((k) => !byKind.has(k));

  return (
    <View>
      <View className="gap-2">
        {(["citizenship", "certificate", "demo"] as TutorDocKind[]).map(
          (kind) => {
            const doc = byKind.get(kind) ?? null;
            return (
              <DocumentRow key={kind} kind={kind} doc={doc} />
            );
          },
        )}
      </View>
      {missing.length > 0 ? (
        <Text className="text-caption text-warning-text mt-3">
          {missing.length} required document
          {missing.length > 1 ? "s" : ""} still missing — open
          &quot;Subjects, rate &amp; location&quot; to upload.
        </Text>
      ) : null}
    </View>
  );
}

function DocumentRow({
  kind,
  doc,
}: {
  kind: TutorDocKind;
  doc: TutorDocument | null;
}) {
  const [previewVideo, setPreviewVideo] = useState<{
    uri: string;
    label: string;
  } | null>(null);

  const accent = kindAccent(kind);
  const isImage = kind === "citizenship" || kind === "certificate";
  const isVideo = kind === "demo";

  // Resolve the public URL for the document if it exists.
  // Append a cache-busting query param from uploadedAt so a
  // re-upload to the same Supabase path doesn't show the old
  // cached image.
  let publicUrl: string | null = null;
  if (doc && typeof doc.path === "string" && doc.path.length > 0) {
    try {
      let url = getVerificationDocPublicUrl(doc.path);
      if (doc.uploadedAt) {
        url = `${url}?t=${encodeURIComponent(doc.uploadedAt)}`;
      }
      publicUrl = url;
    } catch {
      // Non-fatal — fall through to the icon-only display.
    }
  }

  return (
    <>
      <View className="flex-row items-center gap-3 p-3 rounded-card bg-sand">
        {/* Image preview for citizenship/certificate — no icon,
            no file-name text, just the actual document thumbnail.
            Matches the admin VerificationQueue document display. */}
        {isImage && publicUrl ? (
          <ImageViewer
            uri={publicUrl}
            label={TUTOR_DOC_LABEL[kind]}
            thumbnailWidth={64}
            thumbnailHeight={48}
          />
        ) : isVideo && publicUrl ? (
          <DocumentPlayButton
            publicUrl={publicUrl}
            label={TUTOR_DOC_LABEL[kind]}
            onPress={() =>
              setPreviewVideo({ uri: publicUrl, label: TUTOR_DOC_LABEL[kind] })
            }
          />
        ) : (
          <View
            className={`w-16 h-12 rounded-lg items-center justify-center ${accent.bg}`}
          >
            <Ionicons
              name={kindIconName(kind)}
              size={20}
              color={accent.fg}
            />
          </View>
        )}
        <View className="flex-1 min-w-0">
          <Text className="text-button-sm font-medium text-text-primary">
            {TUTOR_DOC_LABEL[kind]}
          </Text>
          {!doc ? (
            <Text className="text-caption text-text-muted mt-0.5">
              {kind === "demo" ? "Not uploaded" : "Not uploaded yet"}
            </Text>
          ) : null}
        </View>
        {doc ? (
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={colors.brand.verification}
          />
        ) : (
          <Ionicons
            name="ellipse-outline"
            size={18}
            color={colors.text.muted}
          />
        )}
      </View>

      {/* Video player modal for demo videos */}
      <VideoViewerModal
        visible={!!previewVideo}
        uri={previewVideo?.uri ?? ""}
        label={previewVideo?.label ?? ""}
        onClose={() => setPreviewVideo(null)}
      />
    </>
  );
}

function DocumentPlayButton({
  publicUrl,
  label,
  onPress,
}: {
  publicUrl: string;
  label: string;
  onPress: () => void;
}) {
  // `publicUrl` is only used to satisfy the closure — the parent's
  // `onPress` already knows the URL. Keeping the prop ensures the
  // parent doesn't need to be aware of the motion sub-component.
  void publicUrl;
  const { onPressIn, onPressOut, animatedStyle } = usePressScale({
    targetScale: motion.scale.iconPressed,
  });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Play ${label}`}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={animatedStyle}
      className="w-16 h-12 rounded-lg items-center justify-center bg-amber-light"
    >
      <Ionicons name="play-circle" size={24} color={colors.brand.accent} />
    </AnimatedPressable>
  );
}

function kindIconName(kind: TutorDocKind): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "citizenship":
      return "card-outline";
    case "certificate":
      return "ribbon-outline";
    case "demo":
      return "videocam-outline";
  }
}

function kindAccent(kind: TutorDocKind): { bg: string; fg: string } {
  switch (kind) {
    case "citizenship":
      return { bg: "bg-ai-light", fg: "#4A7FA5" };
    case "certificate":
      return { bg: "bg-verification-light", fg: "#3F8A5A" };
    case "demo":
      return { bg: "bg-amber-light", fg: "#E5A03B" };
  }
}
