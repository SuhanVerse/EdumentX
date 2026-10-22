/** Server-owned configuration; no request/header may opt a client into grants. */
export function isSandboxServerEnabled(input: {
  enabled?: string;
  environment?: string;
  projectId?: string;
}): boolean {
  return input.enabled === "true" && input.environment === "development" &&
    input.projectId === "edumentx-dev";
}

/** Exact documented test endpoints only. Never send a signing secret to a live
 * or caller-selected host. Both official status-test hosts are supported. */
export function isSandboxEsewaConfig(input: {
  formUrl: string;
  statusUrl: string;
  productCode: string;
}): boolean {
  if (input.productCode !== "EPAYTEST") return false;
  try {
    const form = new URL(input.formUrl);
    const status = new URL(input.statusUrl);
    const clean = (url: URL) => !url.username && !url.password && !url.search && !url.hash;
    return clean(form) && clean(status) &&
      form.origin === "https://rc-epay.esewa.com.np" &&
      form.pathname === "/api/epay/main/v2/form" &&
      ["https://rc.esewa.com.np", "https://uat.esewa.com.np"].includes(status.origin) &&
      status.pathname === "/api/epay/transaction/status/";
  } catch {
    return false;
  }
}
