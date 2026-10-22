/** Sandbox purchases are an explicit development tool, never a consumer path. */
export function isSandboxUpgradeAllowed(input: {
  appEnv?: string;
  enabled?: string;
}): boolean {
  return input.appEnv === "development" && input.enabled === "true";
}

// Keep direct property access so Expo can inline these public build values.
export const sandboxUpgradesEnabled = isSandboxUpgradeAllowed({
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
  enabled: process.env.EXPO_PUBLIC_ENABLE_SANDBOX_PAYMENTS,
});

export function assertSandboxUpgradesAllowed(): void {
  if (!sandboxUpgradesEnabled) throw new Error("Sandbox payments are disabled.");
}
