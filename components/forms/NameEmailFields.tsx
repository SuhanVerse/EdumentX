import { Text, TextInput, View } from "react-native";

import { colors } from "@/constants/colors";
import {
  INPUT_BASE,
  INPUT_BORDER_ERROR,
  INPUT_BORDER_OK,
} from "@/components/forms/inputs";

type NameEmailFieldsProps = {
  fullName: string;
  email: string;
  errors?: {
    fullName?: string;
    email?: string;
  };
  /**
   * When true, the email field is rendered as a non-editable row.
   * The email is the verified login identity, so we lock it here to
   * prevent the user from accidentally desyncing the profile email
   * from the auth provider. Phase 4 will add a Settings → Account
   * flow that calls `firebase/auth#updateEmail`.
   */
  emailDisabled?: boolean;
  onChangeFullName: (value: string) => void;
  onChangeEmail: (value: string) => void;
};

export function NameEmailFields({
  fullName,
  email,
  errors,
  emailDisabled = false,
  onChangeFullName,
  onChangeEmail,
}: NameEmailFieldsProps) {
  return (
    <View className="gap-4 p-5 border border-border-subtle rounded-2xl bg-surface shadow-sm">
      <View className="gap-1">
        <Text className="text-overline text-text-muted uppercase">Full name</Text>
        <TextInput
          value={fullName}
          onChangeText={onChangeFullName}
          placeholder="e.g., Aarav Tamang"
          placeholderTextColor={colors.text.muted}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          className={`${INPUT_BASE} ${
            errors?.fullName ? INPUT_BORDER_ERROR : INPUT_BORDER_OK
          }`}
        />
        {errors?.fullName ? (
          <Text className="text-caption text-danger">{errors.fullName}</Text>
        ) : null}
      </View>

      <View className="gap-1">
        <Text className="text-overline text-text-muted uppercase">Email</Text>
        {emailDisabled ? (
          <View className="flex-row items-center justify-between min-h-btn px-4 border-emphasis border-border rounded-md bg-background">
            <Text
              className="flex-1 text-body-lg text-text-primary"
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {email}
            </Text>
            <Text className="text-caption text-text-muted">Verified</Text>
          </View>
        ) : (
          <TextInput
            value={email}
            onChangeText={onChangeEmail}
            placeholder="e.g., aarav@gmail.com"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            className={`${INPUT_BASE} ${
              errors?.email ? INPUT_BORDER_ERROR : INPUT_BORDER_OK
            }`}
          />
        )}
        {errors?.email ? (
          <Text className="text-caption text-danger">{errors.email}</Text>
        ) : null}
      </View>
    </View>
  );
}
