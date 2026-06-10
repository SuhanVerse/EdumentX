import { Text, TextInput, View } from "react-native";

import { colors } from "@/constants/colors";

type NameEmailFieldsProps = {
  fullName: string;
  email: string;
  errors?: {
    fullName?: string;
    email?: string;
  };
  onChangeFullName: (value: string) => void;
  onChangeEmail: (value: string) => void;
};

const inputBase =
  "min-h-btn px-4 border-emphasis rounded-card bg-surface text-body-lg text-text-primary";

export function NameEmailFields({
  fullName,
  email,
  errors,
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
          className={`${inputBase} ${
            errors?.fullName ? "border-danger" : "border-border"
          }`}
        />
        {errors?.fullName ? (
          <Text className="text-caption text-danger">{errors.fullName}</Text>
        ) : null}
      </View>

      <View className="gap-1">
        <Text className="text-overline text-text-muted uppercase">Email</Text>
        <TextInput
          value={email}
          onChangeText={onChangeEmail}
          placeholder="e.g., aarav@gmail.com"
          placeholderTextColor={colors.text.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          className={`${inputBase} ${
            errors?.email ? "border-danger" : "border-border"
          }`}
        />
        {errors?.email ? (
          <Text className="text-caption text-danger">{errors.email}</Text>
        ) : null}
      </View>
    </View>
  );
}
